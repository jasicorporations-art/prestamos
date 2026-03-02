import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verificarCupo, incrementarConsumo } from '@/lib/services/whatsapp-consumo'
import { normalizarE164 } from '@/lib/utils/telefonoE164'
import { enviarWhatsAppViaEdgeFunction } from '@/lib/twilio-whatsapp'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const ACCION_RECORDATORIO = 'Envio recordatorio de pago por WhatsApp'

/** Días antes del vencimiento para enviar recordatorio (configurable por env, default 2) */
function getDiasAntes(): number[] {
  const n = parseInt(process.env.RECORDATORIO_DIAS_ANTES ?? '2', 10)
  const dias = Math.min(Math.max(1, n), 7)
  return Array.from({ length: dias }, (_, i) => i + 1)
}

function formatearFechaVencimiento(iso: string): string {
  try {
    const d = new Date(iso)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return iso
  }
}

/**
 * Cron: Recordatorios de pago por WhatsApp usando Twilio Content Template.
 * Solo envía si: cliente whatsapp_activo = true, teléfono E.164 válido, cuota no pagada, préstamo activo.
 * No repite envío el mismo día para la misma cuota (consulta actividad_logs).
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const secret = authHeader?.replace('Bearer ', '') || authHeader
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const hoyStr = hoy.toISOString().split('T')[0]

    const diasAntes = getDiasAntes()
    const fechasBusqueda: string[] = []
    for (const d of diasAntes) {
      const f = new Date(hoy)
      f.setDate(f.getDate() + d)
      fechasBusqueda.push(f.toISOString().split('T')[0])
    }

    const { data: cuotasRows, error: cuotasError } = await admin
      .from('cuotas_detalladas')
      .select('id, venta_id, numero_cuota, cuota_fija, fecha_pago')
      .in('fecha_pago', fechasBusqueda)

    if (cuotasError) {
      console.error('[recordatorios-whatsapp] Error cuotas_detalladas:', cuotasError)
      throw cuotasError
    }
    const cuotas = cuotasRows || []
    if (cuotas.length === 0) {
      return NextResponse.json({ message: 'Sin cuotas por vencer en el rango configurado', enviados: 0, total: 0 })
    }

    const ventaIds = [...new Set(cuotas.map((c: any) => c.venta_id).filter(Boolean))]
    const { data: ventas } = ventaIds.length
      ? await admin
          .from('ventas')
          .select('id, cliente_id, empresa_id, compania_id, status')
          .in('id', ventaIds)
          .eq('status', 'active')
          .gt('saldo_pendiente', 0)
      : { data: [] }

    const ventasMap = new Map((ventas || []).map((v: any) => [v.id, v]))

    const { data: pagos } = await admin
      .from('pagos')
      .select('venta_id, numero_cuota')
      .in('venta_id', ventaIds)
    const pagosSet = new Set(
      (pagos || []).map((p: any) => `${p.venta_id}-${p.numero_cuota ?? 'Inicial'}`)
    )

    const clienteIds = [...new Set((ventas || []).map((v: any) => v.cliente_id).filter(Boolean))]
    const { data: clientes } = clienteIds.length
      ? await admin
          .from('clientes')
          .select('id, nombre_completo, celular, whatsapp_activo')
          .in('id', clienteIds)
      : { data: [] }
    const clientesMap = new Map((clientes || []).map((c: any) => [c.id, c]))

    const hoyInicio = new Date(hoyStr + 'T00:00:00.000Z').toISOString()
    const hoyFin = new Date(hoyStr + 'T23:59:59.999Z').toISOString()
    const { data: logsHoy } = await admin
      .from('actividad_logs')
      .select('entidad_id')
      .eq('accion', ACCION_RECORDATORIO)
      .eq('entidad_tipo', 'cuota')
      .gte('fecha_hora', hoyInicio)
      .lte('fecha_hora', hoyFin)
    const cuotasYaEnviadasHoy = new Set((logsHoy || []).map((r: any) => r.entidad_id).filter(Boolean))

    const resultados: { cuota_id: string; venta_id: string; status: string; error?: string }[] = []

    for (const cuota of cuotas) {
      const venta = ventasMap.get(cuota.venta_id)
      if (!venta) continue
      if (pagosSet.has(`${cuota.venta_id}-${cuota.numero_cuota}`)) continue
      if (cuotasYaEnviadasHoy.has(cuota.id)) {
        resultados.push({ cuota_id: cuota.id, venta_id: cuota.venta_id, status: 'skipped', error: 'Ya enviado hoy' })
        continue
      }

      const empresaId = (venta.empresa_id || venta.compania_id) as string | null
      if (empresaId) {
        try {
          const estadoCupo = await verificarCupo(empresaId)
          if (!estadoCupo.ok) {
            resultados.push({ cuota_id: cuota.id, venta_id: cuota.venta_id, status: 'skipped', error: estadoCupo.aviso ?? 'Cupo agotado' })
            continue
          }
        } catch (e) {
          console.warn('[recordatorios-whatsapp] Error verificarCupo:', e)
          resultados.push({ cuota_id: cuota.id, venta_id: cuota.venta_id, status: 'error', error: 'Error cupo' })
          continue
        }
      }

      const cliente = clientesMap.get(venta.cliente_id)
      if (!cliente) {
        resultados.push({ cuota_id: cuota.id, venta_id: cuota.venta_id, status: 'skipped', error: 'Cliente no encontrado' })
        continue
      }

      const whatsappActivo = cliente.whatsapp_activo ?? true
      if (whatsappActivo !== true) {
        console.log('[recordatorios-whatsapp] No enviado: cliente whatsapp_activo no activo.', { cuota_id: cuota.id, cliente_id: cliente.id })
        resultados.push({ cuota_id: cuota.id, venta_id: cuota.venta_id, status: 'skipped', error: 'WhatsApp no activo' })
        continue
      }

      const telefonoE164 = normalizarE164(cliente.celular)
      if (!telefonoE164) {
        console.log('[recordatorios-whatsapp] No enviado: cliente sin teléfono válido E.164.', { cuota_id: cuota.id, celular: cliente.celular ?? '(vacío)' })
        resultados.push({ cuota_id: cuota.id, venta_id: cuota.venta_id, status: 'skipped', error: 'Teléfono inválido' })
        continue
      }

      let nombreEmpresa = 'JASICORPORATIONS'
      if (empresaId && /^[0-9a-f-]{36}$/i.test(empresaId)) {
        const { data: emp } = await admin.from('empresas').select('nombre').eq('id', empresaId).maybeSingle()
        if (emp?.nombre) nombreEmpresa = emp.nombre
      }

      const nombreCliente = cliente.nombre_completo || 'Cliente'
      const valorCuota = Number(cuota.cuota_fija) || 0
      const fechaVencimientoStr = typeof cuota.fecha_pago === 'string' ? cuota.fecha_pago : (cuota.fecha_pago ? new Date(cuota.fecha_pago).toISOString().split('T')[0] : hoyStr)
      const fechaVencimientoFormateada = formatearFechaVencimiento(fechaVencimientoStr)
      const telefonoParaEdge = telefonoE164.replace(/^whatsapp:\+?/, '')

      try {
        await enviarWhatsAppViaEdgeFunction({
          tipo: 'recordatorio',
          telefono_cliente: telefonoParaEdge,
          nombre_cliente: nombreCliente,
          monto_cuota: valorCuota,
          fecha_vencimiento: fechaVencimientoStr,
          nombre_empresa: nombreEmpresa,
        })

        if (empresaId) {
          try {
            await incrementarConsumo(empresaId)
          } catch (e) {
            console.warn('[recordatorios-whatsapp] Error incrementando consumo:', e)
          }
        }

        await admin.from('actividad_logs').insert({
          usuario_id: null,
          usuario_nombre: 'Sistema',
          accion: ACCION_RECORDATORIO,
          detalle: `Recordatorio enviado a ${telefonoE164} - Vence ${fechaVencimientoFormateada}`,
          entidad_tipo: 'cuota',
          entidad_id: cuota.id,
          fecha_hora: new Date().toISOString(),
          ...(empresaId && { empresa_id: empresaId, compania_id: empresaId }),
        }).then((r) => {
          if (r.error) console.warn('[recordatorios-whatsapp] Error insert actividad_logs:', r.error)
        })

        resultados.push({ cuota_id: cuota.id, venta_id: cuota.venta_id, status: 'sent' })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error Twilio'
        console.error('[recordatorios-whatsapp] Error enviando recordatorio cuota', cuota.id, err)
        resultados.push({ cuota_id: cuota.id, venta_id: cuota.venta_id, status: 'error', error: msg })
      }
    }

    const enviados = resultados.filter((r) => r.status === 'sent').length
    return NextResponse.json({
      success: true,
      enviados,
      total: resultados.length,
      resultados,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[recordatorios-whatsapp] Error:', err)
    return NextResponse.json(
      { error: 'Error de ejecución', details: String(msg) },
      { status: 500 }
    )
  }
}
