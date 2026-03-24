import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { calcularFinanciamientoFrances, type MetodoInteres, type TipoPlazo } from '@/lib/services/interes'
import { calcularAmortizacionFrancesa } from '@/lib/services/amortizacion'
import { getPerfilPagosVerificar, isLikelyMissingColumnError, tenantIdsUnicos } from '@/lib/server/pagos-pendientes-verificacion-tenant'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Perfil = Awaited<ReturnType<typeof getPerfilPagosVerificar>>

function normalizeRole(rol: string | null | undefined): string {
  return String(rol || '').toLowerCase().replace(/\s+/g, '_')
}

function isAdminRole(rol: string | null | undefined): boolean {
  const r = normalizeRole(rol)
  return r === 'admin' || r === 'super_admin' || r === 'superadmin'
}

function asTipoPlazo(raw: unknown): TipoPlazo {
  const t = String(raw || '').toLowerCase()
  if (t === 'diario' || t === 'semanal' || t === 'quincenal' || t === 'mensual') return t
  return 'mensual'
}

function asMetodoInteres(raw: unknown): MetodoInteres {
  const t = String(raw || '').toLowerCase()
  if (t === 'fijo' || t === 'sobre_saldo') return t
  return 'fijo'
}

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

async function ventaPorTenant(
  admin: ReturnType<typeof getSupabaseAdmin>,
  ventaId: string,
  tenantIds: string[]
) {
  for (const tid of tenantIds) {
    const q = await admin
      .from('ventas')
      .select('*')
      .eq('id', ventaId)
      .or(`empresa_id.eq.${tid},compania_id.eq.${tid}`)
      .maybeSingle()
    if (!q.error && q.data) return q.data as Record<string, any>
    if (q.error && !isLikelyMissingColumnError(q.error.message)) return null
    const qLegacy = await admin
      .from('ventas')
      .select('*')
      .eq('id', ventaId)
      .eq('empresa_id', tid)
      .maybeSingle()
    if (!qLegacy.error && qLegacy.data) return qLegacy.data as Record<string, any>
  }
  return null
}

async function solicitudPorTenant(
  admin: ReturnType<typeof getSupabaseAdmin>,
  solicitudId: string,
  tenantIds: string[]
) {
  for (const tid of tenantIds) {
    const q = await admin
      .from('solicitudes_cambio')
      .select('*')
      .eq('id', solicitudId)
      .eq('empresa_id', tid)
      .maybeSingle()
    if (!q.error && q.data) return q.data as Record<string, any>
  }
  return null
}

async function ventasHasRenovacionColumn(admin: ReturnType<typeof getSupabaseAdmin>) {
  const q = await admin
    .from('information_schema.columns' as any)
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'ventas')
    .eq('column_name', 'renovacion_de_id')
    .limit(1)
  return (q.data?.length || 0) > 0
}

async function ventasHasFechaFinalizacionColumn(admin: ReturnType<typeof getSupabaseAdmin>) {
  const q = await admin
    .from('information_schema.columns' as any)
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'ventas')
    .eq('column_name', 'fecha_finalizacion_prestamo')
    .limit(1)
  return (q.data?.length || 0) > 0
}

async function solicitudesHasAprobadoVentaId(admin: ReturnType<typeof getSupabaseAdmin>) {
  const q = await admin
    .from('information_schema.columns' as any)
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'solicitudes_cambio')
    .eq('column_name', 'aprobado_venta_id')
    .limit(1)
  return (q.data?.length || 0) > 0
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const admin = getSupabaseAdmin()
    const perfil: Perfil = await getPerfilPagosVerificar(admin, user.id)
    if (!isAdminRole(perfil?.rol)) {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
    }
    const tenantIds = tenantIdsUnicos(perfil)
    if (tenantIds.length === 0) {
      return NextResponse.json({ error: 'Sin tenant de empresa' }, { status: 403 })
    }

    const solicitudId = params.id
    const solicitud = await solicitudPorTenant(admin, solicitudId, tenantIds)
    if (!solicitud) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    if (String(solicitud.status || '') === 'aprobada' && solicitud.aprobado_venta_id) {
      return NextResponse.json({ ok: true, venta_id: solicitud.aprobado_venta_id })
    }
    if (String(solicitud.tipo || '') !== 'renovacion') {
      return NextResponse.json({ error: 'La solicitud no es de renovación' }, { status: 400 })
    }

    const ventaAnterior = await ventaPorTenant(admin, String(solicitud.venta_id || ''), tenantIds)
    if (!ventaAnterior) {
      return NextResponse.json({ error: 'Préstamo anterior no encontrado' }, { status: 404 })
    }

    const extra = (solicitud.datos_extra || {}) as Record<string, unknown>
    const montoSolicitado = toNum(solicitud.monto_solicitado, 0)
    const cuotas = Math.max(1, Math.floor(toNum(solicitud.plazo_solicitado, 0)))
    const tipoPlazo = asTipoPlazo(extra.tipo_plazo ?? ventaAnterior.tipo_plazo ?? 'mensual')
    const metodoInteres = asMetodoInteres(extra.metodo_interes ?? ventaAnterior.metodo_interes ?? 'fijo')
    const interes = toNum(extra.interes_prestamo ?? ventaAnterior.porcentaje_interes, 0.2)
    const saldoActual = Math.max(0, toNum(ventaAnterior.saldo_pendiente, 0))
    if (montoSolicitado <= 0) {
      return NextResponse.json({ error: 'Monto solicitado inválido' }, { status: 400 })
    }

    const resumen = calcularFinanciamientoFrances({
      montoBase: montoSolicitado,
      tasaAnual: interes,
      numeroCuotas: cuotas,
      tipoPlazo,
      metodoInteres,
    })
    const gastosCierre = Number(resumen.cargoManejo || 0)
    const netoEntregar = Math.max(0, montoSolicitado - saldoActual - gastosCierre)
    const fechaIso = new Date().toISOString()

    const hasRenovacionDeId = await ventasHasRenovacionColumn(admin)
    const hasFechaFinalizacion = await ventasHasFechaFinalizacionColumn(admin)
    const hasAprobadoVentaId = await solicitudesHasAprobadoVentaId(admin)
    const numeroPrestamoNuevo = `REN-${Date.now().toString().slice(-8)}`

    let nuevaVentaId: string | null = null
    try {
      const payloadVentaNueva: Record<string, unknown> = {
        empresa_id: ventaAnterior.empresa_id ?? perfil?.empresa_id ?? null,
        sucursal_id: ventaAnterior.sucursal_id ?? perfil?.sucursal_id ?? null,
        motor_id: ventaAnterior.motor_id,
        cliente_id: ventaAnterior.cliente_id,
        numero_prestamo: numeroPrestamoNuevo,
        monto_total: resumen.montoTotal,
        saldo_pendiente: resumen.montoTotal,
        cantidad_cuotas: cuotas,
        plazo_meses: tipoPlazo === 'mensual' ? cuotas : null,
        tipo_plazo: tipoPlazo,
        dia_pago_mensual: tipoPlazo === 'mensual' ? (ventaAnterior.dia_pago_mensual ?? 15) : null,
        dia_pago_semanal: tipoPlazo === 'semanal' ? (ventaAnterior.dia_pago_semanal ?? null) : null,
        fecha_inicio_quincenal: tipoPlazo === 'quincenal' ? (ventaAnterior.fecha_inicio_quincenal ?? null) : null,
        porcentaje_interes: interes,
        metodo_interes: metodoInteres,
        tipo_interes: ventaAnterior.tipo_interes ?? 'interes',
        status: 'active',
        tipo_pago: ventaAnterior.tipo_pago ?? 'financiamiento',
        tipo_garantia: ventaAnterior.tipo_garantia ?? 'Ninguna',
        descripcion_garantia: ventaAnterior.descripcion_garantia ?? null,
        valor_estimado: ventaAnterior.valor_estimado ?? null,
        fecha_venta: fechaIso,
        updated_at: fechaIso,
      }
      if (hasRenovacionDeId) payloadVentaNueva.renovacion_de_id = ventaAnterior.id

      const insVenta = await admin.from('ventas').insert(payloadVentaNueva).select('id').single()
      if (insVenta.error || !insVenta.data?.id) {
        return NextResponse.json({ error: insVenta.error?.message || 'No se pudo crear el préstamo renovado' }, { status: 500 })
      }
      nuevaVentaId = insVenta.data.id

      const tabla = calcularAmortizacionFrancesa({
        monto_total: resumen.capitalAmortizado,
        tasa_interes_anual: interes,
        plazo_meses: cuotas,
        fecha_inicio: fechaIso,
        tipo_plazo: tipoPlazo,
        dia_pago_mensual: tipoPlazo === 'mensual' ? (ventaAnterior.dia_pago_mensual ?? 15) : undefined,
        dia_pago_semanal: tipoPlazo === 'semanal' ? (ventaAnterior.dia_pago_semanal ?? undefined) : undefined,
        fecha_inicio_quincenal: tipoPlazo === 'quincenal' ? (ventaAnterior.fecha_inicio_quincenal ?? undefined) : undefined,
        metodo_interes: metodoInteres,
      })

      if (tabla.length > 0) {
        const rows = tabla.map((c) => ({
          venta_id: nuevaVentaId,
          empresa_id: ventaAnterior.empresa_id ?? perfil?.empresa_id ?? null,
          numero_cuota: c.numero_cuota,
          fecha_pago: c.fecha_pago,
          cuota_fija: c.cuota_fija,
          monto_cuota: c.cuota_fija,
          interes_mes: c.interes_mes,
          abono_capital: c.abono_capital,
          saldo_pendiente: c.saldo_pendiente,
        }))
        const insCuotas = await admin.from('cuotas_detalladas').insert(rows)
        if (insCuotas.error) {
          throw new Error(insCuotas.error.message)
        }
      }

      const payloadVentaAnterior: Record<string, unknown> = {
        saldo_pendiente: 0,
        status: 'completed',
        updated_at: fechaIso,
      }
      if (hasFechaFinalizacion) {
        payloadVentaAnterior.fecha_finalizacion_prestamo = fechaIso
      }

      const updAnterior = await admin
        .from('ventas')
        .update(payloadVentaAnterior)
        .eq('id', ventaAnterior.id)
      if (updAnterior.error) {
        throw new Error(updAnterior.error.message)
      }

      const payloadSolicitud: Record<string, unknown> = {
          status: 'aprobada',
          aprobado_por: user.id,
          fecha_aprobacion: fechaIso,
          datos_extra: {
            ...(extra || {}),
            calculo_aprobado: {
              monto_solicitado: montoSolicitado,
              saldo_anterior_cancelado: saldoActual,
              gastos_cierre: gastosCierre,
              neto_estimado_entregado: netoEntregar,
              monto_total_nuevo_prestamo: resumen.montoTotal,
              cuota_estimada: resumen.cuotaFija,
              intereses_totales: resumen.interesesTotales,
              tipo_plazo: tipoPlazo,
              metodo_interes: metodoInteres,
              interes_prestamo: interes,
              cantidad_cuotas: cuotas,
              renovacion_de_id: ventaAnterior.id,
              nuevo_prestamo_id: nuevaVentaId,
            },
          },
          updated_at: fechaIso,
        }
      if (hasAprobadoVentaId) payloadSolicitud.aprobado_venta_id = nuevaVentaId

      const updSolicitud = await admin
        .from('solicitudes_cambio')
        .update(payloadSolicitud)
        .eq('id', solicitud.id)
      if (updSolicitud.error) {
        throw new Error(updSolicitud.error.message)
      }
    } catch (err) {
      if (nuevaVentaId) {
        await admin.from('cuotas_detalladas').delete().eq('venta_id', nuevaVentaId)
        await admin.from('ventas').delete().eq('id', nuevaVentaId)
      }
      throw err
    }

    return NextResponse.json({
      ok: true,
      venta_id: nuevaVentaId,
      resumen: {
        saldo_anterior_cancelado: saldoActual,
        gastos_cierre: gastosCierre,
        neto_estimado_entregado: netoEntregar,
        monto_total_nuevo_prestamo: resumen.montoTotal,
      },
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error aprobando renovación' },
      { status: 500 }
    )
  }
}

