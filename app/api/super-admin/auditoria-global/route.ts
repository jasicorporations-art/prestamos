import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/auth-super-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Misma huella de datos que la vista `historial_movimientos` (triggers → actividad_logs.tipo_accion NOT NULL). */
const FUENTE_AUDITORIA =
  'actividad_logs filas con tipo_accion (equivalente a la vista historial_movimientos alimentada por triggers)'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type ActividadAuditoriaRow = Record<string, unknown> & {
  id: string
  empresa_id?: string | null
  usuario_id?: string | null
  usuario_nombre?: string | null
  tipo_accion?: string | null
  entidad_tipo?: string | null
  entidad_id?: string | null
  fecha_hora?: string
  old_data?: unknown
  new_data?: unknown
  detalle?: string | null
  accion?: string | null
  sucursal_nombre?: string | null
}

function dedupeById(rows: ActividadAuditoriaRow[]): ActividadAuditoriaRow[] {
  const m = new Map<string, ActividadAuditoriaRow>()
  for (const r of rows) {
    if (r?.id && !m.has(r.id)) m.set(r.id, r)
  }
  return [...m.values()]
}

function applyDateRange(
  q: ReturnType<ReturnType<typeof createServiceRoleClient>['from']>,
  fechaDesde?: string | null,
  fechaHasta?: string | null
) {
  let query = q
  if (fechaDesde?.trim()) {
    const d = fechaDesde.trim()
    query = query.gte('fecha_hora', d.includes('T') ? d : `${d}T00:00:00.000Z`)
  }
  if (fechaHasta?.trim()) {
    const d = fechaHasta.trim()
    query = query.lte('fecha_hora', d.includes('T') ? d : `${d}T23:59:59.999Z`)
  }
  return query
}

async function enrichRows(admin: ReturnType<typeof createServiceRoleClient>, rows: ActividadAuditoriaRow[]) {
  const empresaIds = [...new Set(rows.map((r) => r.empresa_id).filter(Boolean))] as string[]
  const userIds = [...new Set(rows.map((r) => r.usuario_id).filter(Boolean))] as string[]
  const empMap = new Map<string, string>()
  const userMap = new Map<string, string>()

  if (empresaIds.length > 0) {
    const { data } = await admin.from('empresas').select('id,nombre').in('id', empresaIds)
    for (const e of data || []) {
      const row = e as { id: string; nombre: string }
      empMap.set(row.id, row.nombre)
    }
  }

  if (userIds.length > 0) {
    let { data: perfiles } = await admin
      .from('perfiles')
      .select('user_id,usuario_id,nombre_completo,email')
      .in('user_id', userIds)
    if (!perfiles?.length) {
      const r2 = await admin
        .from('perfiles')
        .select('user_id,usuario_id,nombre_completo,email')
        .in('usuario_id', userIds)
      perfiles = r2.data
    }
    for (const p of perfiles || []) {
      const row = p as {
        user_id?: string
        usuario_id?: string
        nombre_completo?: string
        email?: string
      }
      const uid = row.user_id || row.usuario_id
      if (uid) {
        userMap.set(uid, row.nombre_completo || row.email || uid.slice(0, 8))
      }
    }
  }

  return rows.map((r) => ({
    ...r,
    empresa_nombre: r.empresa_id ? empMap.get(r.empresa_id) ?? null : null,
    usuario_etiqueta:
      (r.usuario_id ? userMap.get(r.usuario_id) : null) ||
      r.usuario_nombre ||
      (r.usuario_id ? `UUID ${String(r.usuario_id).slice(0, 8)}…` : 'Sin sesión / sistema'),
  }))
}

/**
 * GET /api/super-admin/auditoria-global
 * Query: empresa_id, usuario_id, categoria (todas|eliminaciones|cobros), fecha_desde, fecha_hasta, buscar_id, limit
 */
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })

  try {
    const admin = createServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const empresaId = searchParams.get('empresa_id') || undefined
    const usuarioId = searchParams.get('usuario_id') || undefined
    const categoria = (searchParams.get('categoria') || 'todas').toLowerCase()
    const fechaDesde = searchParams.get('fecha_desde')
    const fechaHasta = searchParams.get('fecha_hasta')
    const buscarIdRaw = (searchParams.get('buscar_id') || '').trim()
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '150', 10) || 150, 1), 500)

    const fechaDesdeU = fechaDesde || undefined
    const fechaHastaU = fechaHasta || undefined

    let rows: ActividadAuditoriaRow[] = []

    if (buscarIdRaw) {
      if (!UUID_RE.test(buscarIdRaw)) {
        return NextResponse.json({ error: 'buscar_id debe ser un UUID válido' }, { status: 400 })
      }
      const id = buscarIdRaw

      const bases: ReturnType<typeof admin.from>[] = []

      // Por PK del registro tocado
      bases.push(
        applyDateRange(
          admin.from('actividad_logs').select('*').not('tipo_accion', 'is', null).eq('entidad_id', id),
          fechaDesdeU,
          fechaHastaU
        ) as unknown as ReturnType<typeof admin.from>
      )
      // Pagos vinculados a un préstamo (venta)
      bases.push(
        applyDateRange(
          admin
            .from('actividad_logs')
            .select('*')
            .not('tipo_accion', 'is', null)
            .eq('entidad_tipo', 'pagos')
            .filter('new_data->>venta_id', 'eq', id),
          fechaDesdeU,
          fechaHastaU
        ) as unknown as ReturnType<typeof admin.from>
      )
      bases.push(
        applyDateRange(
          admin
            .from('actividad_logs')
            .select('*')
            .not('tipo_accion', 'is', null)
            .eq('entidad_tipo', 'pagos')
            .filter('old_data->>venta_id', 'eq', id),
          fechaDesdeU,
          fechaHastaU
        ) as unknown as ReturnType<typeof admin.from>
      )
      // Préstamos vinculados a un cliente
      bases.push(
        applyDateRange(
          admin
            .from('actividad_logs')
            .select('*')
            .not('tipo_accion', 'is', null)
            .eq('entidad_tipo', 'ventas')
            .filter('new_data->>cliente_id', 'eq', id),
          fechaDesdeU,
          fechaHastaU
        ) as unknown as ReturnType<typeof admin.from>
      )
      bases.push(
        applyDateRange(
          admin
            .from('actividad_logs')
            .select('*')
            .not('tipo_accion', 'is', null)
            .eq('entidad_tipo', 'ventas')
            .filter('old_data->>cliente_id', 'eq', id),
          fechaDesdeU,
          fechaHastaU
        ) as unknown as ReturnType<typeof admin.from>
      )

      const results = await Promise.all(
        bases.map((q) =>
          (q as any).order('fecha_hora', { ascending: false }).limit(limit)
        )
      )

      for (const res of results) {
        if (res.error) {
          console.warn('[auditoria-global] subconsulta:', res.error.message)
          continue
        }
        rows.push(...((res.data || []) as ActividadAuditoriaRow[]))
      }
      rows = dedupeById(rows)
      rows.sort(
        (a, b) =>
          new Date(String(b.fecha_hora || 0)).getTime() -
          new Date(String(a.fecha_hora || 0)).getTime()
      )
      rows = rows.slice(0, limit)
    } else {
      let q = admin
        .from('actividad_logs')
        .select('*')
        .not('tipo_accion', 'is', null)
        .order('fecha_hora', { ascending: false })
        .limit(limit)

      q = applyDateRange(q, fechaDesdeU, fechaHastaU) as typeof q

      if (empresaId && UUID_RE.test(empresaId)) {
        q = q.eq('empresa_id', empresaId)
      }
      if (usuarioId && UUID_RE.test(usuarioId)) {
        q = q.eq('usuario_id', usuarioId)
      }

      if (categoria === 'eliminaciones') {
        q = q.eq('tipo_accion', 'DELETE')
      } else if (categoria === 'cobros') {
        q = q.eq('entidad_tipo', 'pagos').in('tipo_accion', ['INSERT', 'UPDATE'])
      }

      const { data, error } = await q
      if (error) throw error
      rows = (data || []) as ActividadAuditoriaRow[]
    }

    const movimientos = await enrichRows(admin, rows)

    return NextResponse.json({
      fuente: FUENTE_AUDITORIA,
      movimientos,
      total: movimientos.length,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error en auditoría global'
    console.error('[auditoria-global]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
