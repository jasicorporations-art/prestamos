import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { CLIENTE_PORTAL_COOKIE_NAME, readClientePortalSession } from '@/lib/server/clientePortalSession'
import { calcularFinanciamientoFrances, type MetodoInteres, type TipoPlazo } from '@/lib/services/interes'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(CLIENTE_PORTAL_COOKIE_NAME)?.value
    const session = readClientePortalSession(token)
    if (!session) return NextResponse.json({ error: 'Sesion invalida' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const ventaId = String(body?.venta_id || '').trim()
    const montoRenovar = Number(body?.monto_renovar || 0)
    const cuotas = Number(body?.cantidad_cuotas || 0)
    const tipoPlazoRaw = String(body?.tipo_plazo || 'mensual').toLowerCase().trim()
    const tipoPlazo = (['diario', 'semanal', 'quincenal', 'mensual'].includes(tipoPlazoRaw) ? tipoPlazoRaw : 'mensual') as TipoPlazo
    const metodoInteresRaw = String(body?.metodo_interes || 'fijo').toLowerCase().trim()
    const metodoInteres = (['fijo', 'sobre_saldo'].includes(metodoInteresRaw) ? metodoInteresRaw : 'fijo') as MetodoInteres
    const interesPrestamo = Number(body?.interes_prestamo ?? 0.2)

    if (!ventaId || !Number.isFinite(montoRenovar) || montoRenovar <= 0 || !Number.isFinite(cuotas) || cuotas <= 0) {
      return NextResponse.json({ error: 'Datos incompletos para renovación' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data: venta, error: vErr } = await admin
      .from('ventas')
      .select('id,empresa_id,cliente_id,saldo_pendiente')
      .eq('id', ventaId)
      .eq('empresa_id', session.empresa_id)
      .eq('cliente_id', session.cliente_id)
      .maybeSingle()
    if (vErr || !venta?.id) return NextResponse.json({ error: 'Préstamo no válido' }, { status: 403 })

    const saldo = Number(venta.saldo_pendiente || 0)
    const netoEntregar = Math.max(0, montoRenovar - saldo)
    const simulacion = calcularFinanciamientoFrances({
      montoBase: montoRenovar,
      tasaAnual: Number.isFinite(interesPrestamo) ? interesPrestamo : 0.2,
      numeroCuotas: Math.floor(cuotas),
      tipoPlazo,
      metodoInteres,
    })

    const { data, error } = await admin
      .from('solicitudes_cambio')
      .insert({
        venta_id: ventaId,
        tipo: 'renovacion',
        monto_solicitado: montoRenovar,
        plazo_solicitado: Math.floor(cuotas),
        empresa_id: session.empresa_id,
        status: 'pending',
        datos_extra: {
          origen: 'portal_cliente',
          tipo_plazo: tipoPlazo,
          metodo_interes: metodoInteres,
          interes_prestamo: Number.isFinite(interesPrestamo) ? interesPrestamo : 0.2,
          neto_entregar_estimado: Math.round(netoEntregar * 100) / 100,
          cuota_estimada: Math.round((simulacion.cuotaFija || 0) * 100) / 100,
          monto_total_estimado: Math.round((simulacion.montoTotal || 0) * 100) / 100,
          intereses_totales_estimados: Math.round((simulacion.interesesTotales || 0) * 100) / 100,
          cargo_manejo_estimado: Math.round((simulacion.cargoManejo || 0) * 100) / 100,
          saldo_actual: saldo,
        },
      })
      .select('id,created_at,status')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, solicitud: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error enviando renovación' }, { status: 500 })
  }
}
