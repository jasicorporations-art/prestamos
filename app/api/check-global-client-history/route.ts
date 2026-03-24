import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { parseFechaLocalMidnight, toLocalMidnight, calcularDiasAtraso, calcularFechaVencimiento } from '@/lib/services/mora'
import { calcularFechaVencimientoCuota } from '@/lib/services/proximoVencimiento'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface GlobalClientHistoryResponse {
  prestamosActivos: number
  enMora: boolean
  vecesRecargo: number
  tieneHistorial: boolean
}

/**
 * Resumen de riesgo del cliente en la red (todas las compañías).
 * No expone nombres de empresas, solo comportamiento financiero.
 * Identificación por cédula (mismo cliente en distintas compañías).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const clienteId = typeof body.cliente_id === 'string' ? body.cliente_id.trim() : ''
    if (!clienteId) {
      return NextResponse.json(
        { error: 'Falta cliente_id', prestamosActivos: 0, enMora: false, vecesRecargo: 0, tieneHistorial: false },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json(
        { error: 'Servicio no disponible', prestamosActivos: 0, enMora: false, vecesRecargo: 0, tieneHistorial: false },
        { status: 500 }
      )
    }

    const { data: clienteRow, error: errCliente } = await admin
      .from('clientes')
      .select('id, cedula')
      .eq('id', clienteId)
      .maybeSingle() as { data: { id: string; cedula: string } | null; error: unknown }

    if (errCliente || !clienteRow?.cedula) {
      return NextResponse.json({
        prestamosActivos: 0,
        enMora: false,
        vecesRecargo: 0,
        tieneHistorial: false,
      })
    }

    const cedula = clienteRow.cedula.trim()
    if (!cedula) {
      return NextResponse.json({
        prestamosActivos: 0,
        enMora: false,
        vecesRecargo: 0,
        tieneHistorial: false,
      })
    }

    const { data: clientesMismaCedula } = await admin
      .from('clientes')
      .select('id')
      .eq('cedula', cedula) as { data: { id: string }[] | null }

    const clienteIds = (clientesMismaCedula || []).map((c) => c.id)
    if (clienteIds.length === 0) {
      return NextResponse.json({
        prestamosActivos: 0,
        enMora: false,
        vecesRecargo: 0,
        tieneHistorial: false,
      })
    }

    const { data: ventasRed, error: errVentas } = await admin
      .from('ventas')
      .select('id, cliente_id, status, saldo_pendiente, cantidad_cuotas, fecha_venta, tipo_plazo, dia_pago_mensual, dia_pago_semanal, fecha_inicio_quincenal, mora_abonada')
      .in('cliente_id', clienteIds)
      .gte('saldo_pendiente', 0.01) as {
      data: Array<{
        id: string
        cliente_id: string
        status: string | null
        saldo_pendiente: number
        cantidad_cuotas: number | null
        fecha_venta: string
        tipo_plazo: string | null
        dia_pago_mensual: number | null
        dia_pago_semanal: number | null
        fecha_inicio_quincenal: string | null
        mora_abonada: number | null
      }> | null
      error: unknown
    }

    if (errVentas || !ventasRed || ventasRed.length === 0) {
      return NextResponse.json({
        prestamosActivos: 0,
        enMora: false,
        vecesRecargo: 0,
        tieneHistorial: false,
      })
    }

    const activas = ventasRed.filter(
      (v) => (v.status === 'active' || v.status === 'activo' || !v.status) && (Number(v.saldo_pendiente) || 0) >= 0.01
    )
    const prestamosActivos = activas.length
    const vecesRecargo = ventasRed.filter((v) => Number(v.mora_abonada || 0) > 0).length

    const ventaIds = activas.map((v) => v.id)
    let enMora = false

    if (ventaIds.length > 0) {
      const [cuotasRes, pagosRes] = await Promise.all([
        admin
          .from('cuotas_detalladas')
          .select('venta_id, numero_cuota, fecha_pago, fecha_vencimiento')
          .in('venta_id', ventaIds)
          .order('numero_cuota', { ascending: true }),
        admin
          .from('pagos')
          .select('venta_id, numero_cuota')
          .in('venta_id', ventaIds)
          .not('numero_cuota', 'is', null),
      ]) as unknown as [
        { data: Array<{ venta_id: string; numero_cuota: number; fecha_pago?: string; fecha_vencimiento?: string | null }> | null },
        { data: Array<{ venta_id: string; numero_cuota: number | null }> | null },
      ]

      const cdMap = new Map<string, Array<{ numero_cuota: number; fecha_vencimiento: Date | null }>>()
      for (const c of cuotasRes.data || []) {
        if (!cdMap.has(c.venta_id)) cdMap.set(c.venta_id, [])
        const fVenc =
          c.fecha_vencimiento != null && String(c.fecha_vencimiento).trim() !== ''
            ? parseFechaLocalMidnight(String(c.fecha_vencimiento))
            : null
        cdMap.get(c.venta_id)!.push({ numero_cuota: c.numero_cuota, fecha_vencimiento: fVenc })
      }
      const pagosPorVenta = new Map<string, Set<number>>()
      for (const p of pagosRes.data || []) {
        if (!pagosPorVenta.has(p.venta_id)) pagosPorVenta.set(p.venta_id, new Set())
        if (p.numero_cuota != null) pagosPorVenta.get(p.venta_id)!.add(Number(p.numero_cuota))
      }

      const hoy = toLocalMidnight(new Date())

      for (const venta of activas) {
        const pagadas = pagosPorVenta.get(venta.id) ?? new Set()
        const cantidadCuotas = venta.cantidad_cuotas ?? 0
        const ventaPayload = {
          fecha_venta: venta.fecha_venta,
          tipo_plazo: (venta.tipo_plazo || 'mensual') as 'diario' | 'semanal' | 'quincenal' | 'mensual',
          dia_pago_mensual: venta.dia_pago_mensual ?? undefined,
          dia_pago_semanal: venta.dia_pago_semanal ?? undefined,
          fecha_inicio_quincenal: venta.fecha_inicio_quincenal ?? undefined,
        }

        for (let n = 1; n <= cantidadCuotas; n++) {
          if (pagadas.has(n)) continue
          const detalle = cdMap.get(venta.id)?.find((d) => d.numero_cuota === n)
          let fechaVenc: Date
          if (detalle?.fecha_vencimiento) {
            fechaVenc = detalle.fecha_vencimiento
          } else {
            fechaVenc = venta.tipo_plazo
              ? calcularFechaVencimientoCuota(ventaPayload, n)
              : calcularFechaVencimiento(new Date(venta.fecha_venta), n, cantidadCuotas)
          }
          const dias = calcularDiasAtraso(fechaVenc, hoy)
          if (dias > 0) {
            enMora = true
            break
          }
        }
        if (enMora) break
      }
    }

    const tieneHistorial = prestamosActivos > 0 || vecesRecargo > 0

    const payload: GlobalClientHistoryResponse = {
      prestamosActivos,
      enMora,
      vecesRecargo,
      tieneHistorial,
    }

    return NextResponse.json(payload)
  } catch (e: unknown) {
    console.error('[check-global-client-history]', e)
    return NextResponse.json(
      {
        prestamosActivos: 0,
        enMora: false,
        vecesRecargo: 0,
        tieneHistorial: false,
        error: e instanceof Error ? e.message : 'Error inesperado',
      },
      { status: 500 }
    )
  }
}
