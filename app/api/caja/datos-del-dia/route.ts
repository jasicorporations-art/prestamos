import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getCompaniaActual } from '@/lib/utils/compania'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CAJA_TOKEN_COOKIE = 'sb-caja-token'

/** Intenta obtener usuario: request (cookies + Bearer) y luego cookie sb-caja-token por si el header no llega. */
async function getUserForCaja(request: NextRequest): Promise<User | null> {
  let user = await getUserFromRequest(request)
  if (user) return user
  const cookieToken = request.cookies.get(CAJA_TOKEN_COOKIE)?.value
  if (!cookieToken) return null
  try {
    const decoded = decodeURIComponent(cookieToken)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return null
    const anon = createClient(url, key)
    const { data: { user: u }, error } = await anon.auth.getUser(decoded)
    if (error || !u) return null
    return u
  } catch {
    return null
  }
}

/** Rango del día en ISO para consultas (misma lógica que cajasService) */
function getTodayLocalRange(fecha: string): { startISO: string; endISO: string } {
  const d = new Date(fecha + 'T12:00:00')
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

/**
 * GET /api/caja/datos-del-dia?fecha=YYYY-MM-DD&cajaId=xxx&sucursalId=xxx
 *
 * Fuente principal: movimientos_caja (del día). No se duplican ingresos.
 * Pagos solo como fallback para pagos viejos que no tengan movimiento (referencia_pago_id).
 *
 * Requiere columna movimientos_caja.referencia_pago_id y índice único
 * (supabase/movimientos_caja-referencia-pago.sql).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserForCaja(request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0]
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const cajaId = searchParams.get('cajaId')
    const sucursalIdParam = searchParams.get('sucursalId')

    if (!cajaId) {
      return NextResponse.json({ error: 'Falta cajaId' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    // Preferir rango enviado desde el navegador (día civil local del usuario). Sin eso, el servidor UTC desalinea salidas/entradas vs "hoy".
    const { startISO, endISO } =
      desde && hasta ? { startISO: desde, endISO: hasta } : getTodayLocalRange(fecha)
    const sucursalId = sucursalIdParam || null

    // Perfil del usuario para empresa
    let empresaId: string | null = null
    const perfilRes = await admin
      .from('perfiles')
      .select('empresa_id, compania_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    const perfil = perfilRes.data as { empresa_id?: string; compania_id?: string } | null
    if (perfil) {
      empresaId = perfil.empresa_id || perfil.compania_id || null
    }
    if (!empresaId && typeof getCompaniaActual === 'function') {
      try {
        empresaId = getCompaniaActual() || null
      } catch {
        // ignore
      }
    }

    // 1) Fuente principal: movimientos_caja del día para esta caja
    let movimientosCaja: any[] = []
    const movimientosRes = await admin
      .from('movimientos_caja')
      .select('id, caja_id, tipo, monto, concepto, fecha_hora, referencia_pago_id')
      .eq('caja_id', cajaId)
      .gte('fecha_hora', startISO)
      .lte('fecha_hora', endISO)
      .order('fecha_hora', { ascending: true })

    if (!movimientosRes.error) {
      movimientosCaja = (movimientosRes.data || []) as any[]
    }
    // Si falta referencia_pago_id (migración no aplicada), usar select mínimo
    if (movimientosRes.error && String((movimientosRes.error as any).message || '').includes('column')) {
      const fallback = await admin
        .from('movimientos_caja')
        .select('id, caja_id, tipo, monto, concepto, fecha_hora')
        .eq('caja_id', cajaId)
        .gte('fecha_hora', startISO)
        .lte('fecha_hora', endISO)
        .order('fecha_hora', { ascending: true })
      movimientosCaja = (fallback.data || []) as any[]
    }

    const pagoIdsConMovimiento = new Set<string>()
    for (const m of movimientosCaja) {
      const ref = (m as any).referencia_pago_id
      if (ref) pagoIdsConMovimiento.add(String(ref))
    }

    const ingresosPorMovimientos = movimientosCaja
      .filter((m: any) => String(m.tipo || '').toLowerCase() === 'entrada')
      .reduce((sum: number, m: any) => sum + (Number(m.monto) || 0), 0)

    // 2) Fallback: pagos del día que aún NO tienen movimiento en movimientos_caja
    const selectPagos = 'id,venta_id,monto,fecha_pago,created_at,numero_cuota,empresa_id,compania_id,sucursal_id,sucursal_donde_se_cobro,usuario_que_cobro'
    const selectPagosMin = 'id,venta_id,monto,fecha_pago,created_at,numero_cuota,empresa_id,compania_id,usuario_que_cobro'

    let resPorFecha = await admin.from('pagos').select(selectPagos).gte('fecha_pago', startISO).lte('fecha_pago', endISO)
    if (resPorFecha.error && String((resPorFecha.error as any).message || '').includes('column')) {
      resPorFecha = await admin.from('pagos').select(selectPagosMin).gte('fecha_pago', startISO).lte('fecha_pago', endISO) as typeof resPorFecha
    }
    let resPorCreated = await admin.from('pagos').select(selectPagos).gte('created_at', startISO).lte('created_at', endISO)
    if (resPorCreated.error && String((resPorCreated.error as any).message || '').includes('column')) {
      resPorCreated = await admin.from('pagos').select(selectPagosMin).gte('created_at', startISO).lte('created_at', endISO) as typeof resPorCreated
    }

    const byId = new Map<string, any>()
    for (const p of (resPorFecha.data || []) as any[]) {
      if (p?.id) byId.set(p.id, p)
    }
    for (const p of (resPorCreated.data || []) as any[]) {
      if (p?.id && !byId.has(p.id)) byId.set(p.id, p)
    }
    let pagosDelDia = Array.from(byId.values())

    if (empresaId) {
      pagosDelDia = pagosDelDia.filter(
        (p: any) => p.empresa_id === empresaId || p.compania_id === empresaId
      )
    }

    const ventaIds = [...new Set(pagosDelDia.map((p: any) => p.venta_id).filter(Boolean))]
    let ventasMap = new Map<string, { sucursal_id?: string | null }>()
    if (ventaIds.length > 0) {
      const { data: ventasData } = await admin.from('ventas').select('id,sucursal_id').in('id', ventaIds)
      ventasMap = new Map((ventasData || []).map((v: any) => [v.id, v]))
    }

    if (sucursalId) {
      pagosDelDia = pagosDelDia.filter((p: any) => {
        const sucPago = p.sucursal_donde_se_cobro ?? p.sucursal_id ?? null
        const rawVenta = ventasMap.get(p.venta_id)?.sucursal_id
        const sucVenta =
          rawVenta != null && String(rawVenta).trim() !== '' ? rawVenta : null
        // Sin cambios en BD: para “Verificar pago” el pago suele traer la sucursal del aprobador;
        // la caja del día debe alinearse con la sucursal del préstamo si existe (como admin consolida por préstamo).
        const sucEfectiva = sucVenta ?? sucPago
        const sinSucursal =
          sucEfectiva == null || String(sucEfectiva).trim() === ''
        return (
          sinSucursal ||
          String(sucEfectiva).toLowerCase() === String(sucursalId).toLowerCase()
        )
      })
    }

    // Solo pagos que NO tienen ya un movimiento (pagos viejos / fallback)
    const pagosSinMovimiento = pagosDelDia.filter((p: any) => !pagoIdsConMovimiento.has(String(p.id)))
    const ingresosPagos = pagosSinMovimiento.reduce((sum: number, p: any) => sum + (Number(p.monto) || 0), 0)

    // Sintetizar "movimientos" solo para pagos sin movimiento (fallback)
    let pagosMovimientos: any[] = []
    if (pagosSinMovimiento.length > 0) {
      const ventaIdsParaDatos = [...new Set(pagosSinMovimiento.map((p: any) => p.venta_id).filter(Boolean))]
      const { data: ventasData } = await admin.from('ventas').select('id,cliente_id,numero_prestamo').in('id', ventaIdsParaDatos)
      const ventasMapDatos = new Map((ventasData || []).map((v: any) => [v.id, v]))

      const clienteIds = [...new Set((ventasData || []).map((v: any) => v.cliente_id).filter(Boolean))]
      const { data: clientesData } = clienteIds.length
        ? await admin.from('clientes').select('id,nombre_completo,email').in('id', clienteIds)
        : { data: [] }
      const clientesMap = new Map((clientesData || []).map((c: any) => [c.id, c]))

      const cobradorIds = [...new Set(pagosSinMovimiento.map((p: any) => p.usuario_que_cobro).filter(Boolean))]
      const { data: perfilesData } = cobradorIds.length
        ? await admin.from('perfiles').select('user_id,nombre_completo,email').in('user_id', cobradorIds)
        : { data: [] }
      const perfilesMap = new Map((perfilesData || []).map((p: any) => [p.user_id, p]))

      pagosMovimientos = pagosSinMovimiento.map((p: any) => {
        const venta = ventasMapDatos.get(p.venta_id)
        const cliente = venta ? clientesMap.get(venta.cliente_id) : undefined
        const perfilCobrador = p.usuario_que_cobro ? perfilesMap.get(p.usuario_que_cobro) : undefined
        const fechaPago = p.fecha_pago || p.created_at
        const numeroPrestamo = venta?.numero_prestamo || p.venta_id
        const numeroCuota = p.numero_cuota === null || p.numero_cuota === undefined ? 'Inicial' : p.numero_cuota
        const concepto = `Pago ${numeroPrestamo || ''}`.trim()
        const observaciones = cliente?.nombre_completo
          ? `Cliente: ${cliente.nombre_completo} | Cuota ${numeroCuota}`
          : `Cuota ${numeroCuota}`
        return {
          id: `pago-${p.id}`,
          caja_id: cajaId,
          sucursal_id: sucursalId ?? '',
          usuario_id: p.usuario_que_cobro || 'sistema',
          tipo: 'Entrada',
          monto: p.monto || 0,
          concepto,
          observaciones,
          fecha_hora: fechaPago,
          usuario: perfilCobrador
            ? { id: perfilCobrador.user_id, nombre_completo: perfilCobrador.nombre_completo, email: perfilCobrador.email }
            : undefined,
        }
      })
    }

    // Total ingresos del día = movimientos (ya incluyen pagos nuevos) + solo fallback de pagos viejos
    const totalIngresosDia = ingresosPorMovimientos + ingresosPagos

    return NextResponse.json({
      movimientosCaja,
      pagosMovimientos,
      ingresosPagos,
      totalIngresosDia,
    })
  } catch (err) {
    console.error('[api/caja/datos-del-dia] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error obteniendo datos de caja' },
      { status: 500 }
    )
  }
}
