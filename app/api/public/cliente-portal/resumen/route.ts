import { NextRequest, NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { CLIENTE_PORTAL_COOKIE_NAME, readClientePortalSession } from '@/lib/server/clientePortalSession'
import { tienePortalPasswordConfigurada } from '@/lib/portal-password-configurada'
import { expandClienteIdsPortal } from '@/lib/server/portal-cliente-ids'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'
export const revalidate = 0

function ventaCoincideTenantSesion(
  row: { empresa_id?: string | null; compania_id?: string | null },
  empresaSesion: string
): boolean {
  const aid = String(empresaSesion || '').trim().toLowerCase()
  const e = row.empresa_id != null ? String(row.empresa_id).trim().toLowerCase() : ''
  const c = row.compania_id != null ? String(row.compania_id).trim().toLowerCase() : ''
  if (!e && !c) return true
  return e === aid || c === aid
}

export async function GET(request: NextRequest) {
  noStore()
  try {
    const token = request.cookies.get(CLIENTE_PORTAL_COOKIE_NAME)?.value
    const session = readClientePortalSession(token)
    if (!session) return NextResponse.json({ error: 'Sesion invalida' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { cliente_id, empresa_id } = session

    // ── 1. Datos del cliente ─────────────────────────────────────────────────
    let { data: clienteRow, error: cErr } = await admin
      .from('clientes')
      .select('id,nombre_completo,cedula,celular,portal_password')
      .eq('id', cliente_id)
      .eq('empresa_id', empresa_id)
      .maybeSingle()

    if (cErr && String(cErr.message || '').toLowerCase().includes('portal_password')) {
      const retry = await admin
        .from('clientes')
        .select('id,nombre_completo,cedula,celular')
        .eq('id', cliente_id)
        .eq('empresa_id', empresa_id)
        .maybeSingle()
      clienteRow = retry.data as typeof clienteRow
      cErr = retry.error
    }

    if (cErr || !clienteRow) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    const rawPortal = (clienteRow as { portal_password?: string | null }).portal_password
    const cliente = {
      id: clienteRow.id,
      nombre_completo: clienteRow.nombre_completo,
      cedula: clienteRow.cedula,
      celular: clienteRow.celular,
      tiene_contrasena_portal: tienePortalPasswordConfigurada(rawPortal),
    }

    // ── 2. IDs del titular (sesión + duplicados por cédula), misma lógica que recibo del portal
    const allClienteIds = await expandClienteIdsPortal(
      admin,
      cliente_id,
      empresa_id,
      clienteRow.cedula
    )

    // ── 3. Ventas: tenant por empresa_id O compania_id (BDs multi-tenant) ─────
    let ventasData: any[] = []
    {
      const dual = await admin
        .from('ventas')
        .select(
          'id,numero_prestamo,monto_total,saldo_pendiente,status,fecha_venta,cantidad_cuotas,tipo_plazo,metodo_interes,porcentaje_interes,empresa_id,compania_id'
        )
        .in('cliente_id', allClienteIds)
        .or(`empresa_id.eq.${empresa_id},compania_id.eq.${empresa_id}`)
        .order('fecha_venta', { ascending: false })

      if (dual.error && String(dual.error.message || '').toLowerCase().includes('column')) {
        const retry = await admin
          .from('ventas')
          .select(
            'id,numero_prestamo,monto_total,saldo_pendiente,status,fecha_venta,cantidad_cuotas,tipo_plazo,metodo_interes,porcentaje_interes,empresa_id'
          )
          .in('cliente_id', allClienteIds)
          .eq('empresa_id', empresa_id)
          .order('fecha_venta', { ascending: false })
        ventasData = retry.data || []
      } else {
        ventasData = dual.data || []
      }

      // Legacy: préstamos sin tenant en columnas conocidas
      if (ventasData.length === 0) {
        const fb = await admin
          .from('ventas')
          .select(
            'id,numero_prestamo,monto_total,saldo_pendiente,status,fecha_venta,cantidad_cuotas,tipo_plazo,metodo_interes,porcentaje_interes,empresa_id,compania_id'
          )
          .eq('cliente_id', cliente_id)
          .order('fecha_venta', { ascending: false })
        if (fb.error && String(fb.error.message || '').toLowerCase().includes('column')) {
          const fb2 = await admin
            .from('ventas')
            .select(
              'id,numero_prestamo,monto_total,saldo_pendiente,status,fecha_venta,cantidad_cuotas,tipo_plazo,metodo_interes,porcentaje_interes,empresa_id'
            )
            .in('cliente_id', allClienteIds)
            .order('fecha_venta', { ascending: false })
          ventasData = fb2.data || []
        } else {
          ventasData = fb.data || []
        }
      }
    }

    // IDs de préstamo para consultar pagos: lista mostrada + cualquier venta del titular que pertenezca al tenant
    // (evita que pagos nuevos no aparezcan si un préstamo quedó fuera del .or(empresa_id, compania_id) por datos mixtos)
    const ventaIdSet = new Set<string>()
    for (const v of ventasData) {
      const id = String((v as any)?.id ?? '')
      if (id) ventaIdSet.add(id)
    }

    {
      let vRows: Array<{ id: string; empresa_id?: string | null; compania_id?: string | null }> = []
      const wide = await admin
        .from('ventas')
        .select('id,empresa_id,compania_id')
        .in('cliente_id', allClienteIds)
      if (wide.error && String(wide.error.message || '').toLowerCase().includes('column')) {
        const w2 = await admin.from('ventas').select('id,empresa_id').in('cliente_id', allClienteIds)
        vRows = (w2.data || []) as typeof vRows
      } else {
        vRows = (wide.data || []) as typeof vRows
      }
      for (const row of vRows) {
        if (row?.id && ventaCoincideTenantSesion(row, empresa_id)) {
          ventaIdSet.add(String(row.id))
        }
      }
    }

    const ventaIds: string[] = [...ventaIdSet]

    // Ventas activas para dashboard
    const statusActivos = ['active', 'activo', 'pending', 'Active', 'Activo', 'Pending']
    const ventasActivas = ventasData.filter((v: any) => {
      if (v.status === undefined || v.status === null) return true
      return statusActivos.includes(String(v.status))
    })

    // ── 4. Pagos aprobados y cuotas ───────────────────────────────────────────
    let pagosAprobados: any[] = []
    let cuotasData: any[] = []

    if (ventaIds.length > 0) {
      const [pagosRes, cuotasRes] = await Promise.all([
        admin
          .from('pagos')
          .select('id,venta_id,monto,fecha_pago,numero_cuota')
          .in('venta_id', ventaIds)
          .order('fecha_pago', { ascending: false })
          .limit(2000),
        admin
          .from('cuotas_detalladas')
          .select('venta_id,numero_cuota,fecha_vencimiento,fecha_pago,monto_cuota,estado')
          .in('venta_id', ventaIds)
          .order('numero_cuota', { ascending: true })
          .limit(5000),
      ])
      if (pagosRes.error) {
        console.error('[cliente-portal/resumen] pagos query:', pagosRes.error.message)
      }
      if (cuotasRes.error) {
        console.error('[cliente-portal/resumen] cuotas query:', cuotasRes.error.message)
      }
      pagosAprobados = pagosRes.data || []
      cuotasData = cuotasRes.data || []
    }

    // ── 5. Notificaciones del portal (solo de esta empresa) ──────────────────
    // Se filtra por id_empresa para evitar mostrar comprobantes de otras empresas
    // aunque allClienteIds contenga IDs de clientes legacy con empresa_id null.
    let notificacionesPendientes: any[] = []
    {
      const { data: notifData } = await admin
        .from('pagos_pendientes_verificacion')
        .select('id,id_prestamo,monto,fecha_notificacion,estado')
        .in('id_cliente', allClienteIds)
        .eq('id_empresa', empresa_id)
        .order('fecha_notificacion', { ascending: false })

      if (notifData && notifData.length > 0) {
        notificacionesPendientes = (notifData || []).filter((n: any) => {
          const estado = String(n.estado || '').toLowerCase().trim()
          return estado === 'pendiente' || estado === 'en revision'
        })
      }
    }

    // ── 6. Mapas y etiquetas ─────────────────────────────────────────────────
    const pagos = pagosAprobados.map((p: any) => ({
      ...p,
      recibo_url: `/portal-cliente/recibo/${p.id}`,
    }))

    const pagadaPorCuota = new Set<string>()
    for (const p of pagos) {
      const n = p?.numero_cuota
      if (n === null || n === undefined || Number.isNaN(Number(n))) continue
      const vid = String(p?.venta_id ?? '')
      if (!vid) continue
      pagadaPorCuota.add(`${vid}:${Number(n)}`)
    }

    const ventaNumeroMap = new Map<string, string>()
    for (const v of ventasData) {
      const id = String((v as any)?.id ?? '')
      if (!id) continue
      const num = (v as any)?.numero_prestamo
      ventaNumeroMap.set(id, num != null && String(num).trim() !== '' ? String(num) : id.slice(0, 8))
    }

    const cuotas = cuotasData.map((c: any) => {
      const hoy = new Date()
      const venc = c.fecha_vencimiento ? new Date(c.fecha_vencimiento) : null
      const vid = String(c.venta_id ?? '')
      const nCuota = Number(c.numero_cuota)
      const pagada = Number.isFinite(nCuota) && nCuota > 0 ? pagadaPorCuota.has(`${vid}:${nCuota}`) : false
      const vencida = !pagada && !!venc && venc.getTime() < hoy.getTime()
      return {
        ...c,
        pagada,
        vencida,
        numero_prestamo_label: ventaNumeroMap.get(vid) ?? vid.slice(0, 8),
      }
    })

    // Teléfono de la empresa para el botón WhatsApp del portal
    let empresa_telefono: string | null = null
    try {
      const { data: empRow } = await admin
        .from('empresas')
        .select('telefono')
        .eq('id', empresa_id)
        .maybeSingle()
      empresa_telefono = (empRow as any)?.telefono || null
    } catch { /* ignorar */ }

    const resp = NextResponse.json({
      cliente,
      empresa_telefono,
      resumen: {
        prestamos_activos: ventasActivas.length,
        saldo_total: ventasActivas.reduce((acc: number, v: any) => acc + Number(v.saldo_pendiente || 0), 0),
      },
      ventas: ventasActivas.map((v: any) => ({
        ...v,
        contrato_url: `/portal-cliente/documentos/${v.id}/contrato`,
        carta_saldo_url: Number(v.saldo_pendiente || 0) <= 0.0001
          ? `/portal-cliente/documentos/${v.id}/carta-saldo`
          : null,
      })),
      ventas_documentos: ventasData.map((v: any) => ({
        ...v,
        contrato_url: `/portal-cliente/documentos/${v.id}/contrato`,
        carta_saldo_url: Number(v.saldo_pendiente || 0) <= 0.0001
          ? `/portal-cliente/documentos/${v.id}/carta-saldo`
          : null,
      })),
      pagos,
      cuotas,
      notificaciones_pendientes: notificacionesPendientes,
    })
    resp.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0')
    resp.headers.set('Pragma', 'no-cache')
    resp.headers.set('Expires', '0')
    resp.headers.set('Vary', 'Cookie')
    resp.headers.set('CDN-Cache-Control', 'no-store')
    resp.headers.set('Vercel-CDN-Cache-Control', 'no-store')
    return resp
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error cargando resumen' }, { status: 500 })
  }
}
