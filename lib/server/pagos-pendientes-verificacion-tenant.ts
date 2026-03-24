import type { SupabaseClient } from '@supabase/supabase-js'

export type PerfilPagosVerificar = {
  rol?: string | null
  empresa_id?: string | null
  compania_id?: string | null
  sucursal_id?: string | null
  nombre_completo?: string | null
}

export type RowPagoPendiente = Record<string, unknown>

function isLikelyMissingColumnError(message: string) {
  const m = (message || '').toLowerCase()
  return (
    m.includes('42703') ||
    (m.includes('column') &&
      (m.includes('does not exist') || m.includes('not exist'))) ||
    (m.includes('could not find') && m.includes('column'))
  )
}

/**
 * Perfil del usuario para flujos de pagos por verificar.
 * Incluye `compania_id` si existe en la tabla (BDs multi-tenant).
 */
export async function getPerfilPagosVerificar(
  admin: SupabaseClient,
  userId: string
): Promise<PerfilPagosVerificar | null> {
  const colsFull = 'rol, empresa_id, compania_id, sucursal_id, nombre_completo'
  const colsBasic = 'rol, empresa_id, sucursal_id, nombre_completo'

  for (const uidCol of ['user_id', 'usuario_id'] as const) {
    let r = await admin.from('perfiles').select(colsFull).eq(uidCol, userId).maybeSingle()

    if (r.data) {
      return r.data as PerfilPagosVerificar
    }

    if (r.error && isLikelyMissingColumnError(r.error.message)) {
      r = await admin.from('perfiles').select(colsBasic).eq(uidCol, userId).maybeSingle()
      if (r.data) {
        return { ...(r.data as PerfilPagosVerificar), compania_id: null }
      }
      if (r.error && !isLikelyMissingColumnError(r.error.message)) {
        continue
      }
    } else if (r.error) {
      // Otro error en user_id: intentar usuario_id antes de rendirse
      continue
    }
  }

  return null
}

/** UUIDs de tenant a considerar (portal suele alinear con `empresa_id`; algunos admins solo tienen `compania_id`). */
export function tenantIdsUnicos(perfil: PerfilPagosVerificar | null): string[] {
  const s = new Set<string>()
  if (!perfil) return []
  for (const v of [perfil.empresa_id, perfil.compania_id]) {
    const t = String(v ?? '').trim()
    if (t) s.add(t)
  }
  return [...s]
}

async function selectOrdenado(
  admin: SupabaseClient,
  build: () => ReturnType<ReturnType<SupabaseClient['from']>['select']>
) {
  let res = await build().order('fecha_notificacion', { ascending: false })
  if (res.error && isLikelyMissingColumnError(res.error.message)) {
    res = await build().order('created_at', { ascending: false })
  }
  return res
}

export type FetchPagosPendientesResult = {
  rows: RowPagoPendiente[]
  /** Error de Supabase en la consulta principal (no columna opcional). */
  error: string | null
}

/**
 * Filas de `pagos_pendientes_verificacion` para un único UUID de empresa/compañía.
 */
export async function fetchPagosPendientesParaTenant(
  admin: SupabaseClient,
  tenantId: string
): Promise<FetchPagosPendientesResult> {
  let res = await selectOrdenado(admin, () =>
    admin
      .from('pagos_pendientes_verificacion')
      .select('*')
      .or(`id_empresa.eq.${tenantId},empresa_id.eq.${tenantId}`)
  )

  if (res.error && isLikelyMissingColumnError(res.error.message)) {
    res = await selectOrdenado(admin, () =>
      admin.from('pagos_pendientes_verificacion').select('*').eq('id_empresa', tenantId)
    )
  }

  if (res.error && isLikelyMissingColumnError(res.error.message)) {
    res = await selectOrdenado(admin, () =>
      admin.from('pagos_pendientes_verificacion').select('*').eq('empresa_id', tenantId)
    )
  }

  if (res.error) {
    return { rows: [], error: res.error.message }
  }

  let rows = (res.data || []) as RowPagoPendiente[]

  if (rows.length === 0) {
    const rComp = await selectOrdenado(admin, () =>
      admin.from('pagos_pendientes_verificacion').select('*').eq('compania_id', tenantId)
    )
    if (!rComp.error && (rComp.data?.length ?? 0) > 0) {
      rows = (rComp.data || []) as RowPagoPendiente[]
    } else if (rComp.error && !isLikelyMissingColumnError(rComp.error.message)) {
      return { rows: [], error: rComp.error.message }
    }
  }

  return { rows, error: null }
}

function fechaOrdenRow(r: RowPagoPendiente): string {
  return String(r.fecha_notificacion ?? r.created_at ?? '')
}

export type FetchPagosPendientesMerged = {
  rows: RowPagoPendiente[]
  error: string | null
}

/** Une resultados de varios tenant ids (sin duplicar por `id`). */
export async function fetchPagosPendientesTodosLosTenants(
  admin: SupabaseClient,
  tenantIds: string[]
): Promise<FetchPagosPendientesMerged> {
  const byId = new Map<string, RowPagoPendiente>()
  let lastHardError: string | null = null
  let anyQueryOk = false

  for (const tid of tenantIds) {
    const { rows: chunk, error } = await fetchPagosPendientesParaTenant(admin, tid)
    if (error) {
      lastHardError = error
      continue
    }
    anyQueryOk = true
    for (const r of chunk) {
      const id = String(r.id ?? '')
      if (id) byId.set(id, r)
    }
  }

  const merged = Array.from(byId.values())
  merged.sort((a, b) => fechaOrdenRow(b).localeCompare(fechaOrdenRow(a)))

  if (!anyQueryOk && lastHardError) {
    return { rows: [], error: lastHardError }
  }

  return { rows: merged, error: null }
}

export { isLikelyMissingColumnError }
