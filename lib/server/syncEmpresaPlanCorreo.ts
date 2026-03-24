/**
 * Alinea `empresas.plan_suscripcion` (cupos de correo) con el plan SaaS
 * (`user_metadata.planType`: TRIAL, BRONCE, PLATA, ORO, INFINITO, …).
 *
 * El plan efectivo por empresa es el **más alto** entre el dueño de la empresa y los
 * usuarios admin del tenant (el que paga suele ser admin; el campo `empresas.user_id`
 * a veces no coincide con quien tiene el plan en Stripe).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { isValidUUID } from '@/lib/utils/compania'
import type { PlanCorreoKey } from '@/lib/planes-correo-empresa'

const PLAN_RANK: Record<string, number> = {
  TRIAL: 0,
  INICIAL: 1,
  BRONCE: 2,
  BRONZE: 2,
  PLATA: 3,
  SILVER: 3,
  ORO: 4,
  GOLD: 4,
  INFINITO: 5,
  ILIMITADO: 5,
  UNLIMITED: 5,
}

function rankPlanType(raw: string | null | undefined): number {
  const p = String(raw ?? 'TRIAL')
    .toUpperCase()
    .replace(/\s+/g, '')
    .trim()
  return PLAN_RANK[p] ?? 0
}

function readPlanFromUserMetadata(meta: Record<string, unknown> | undefined): string | undefined {
  if (!meta) return undefined
  const a = meta.planType ?? meta.plan_type
  if (typeof a === 'string' && a.trim()) return a.trim()
  return undefined
}

/** Mapeo plan de suscripción de la app → plan de cupo de correos en `empresas`. */
export function saasPlanTypeToPlanCorreoKey(planType: string | null | undefined): PlanCorreoKey {
  const p = String(planType ?? 'TRIAL')
    .toUpperCase()
    .replace(/\s+/g, '')
    .trim()

  switch (p) {
    case 'PLATA':
    case 'SILVER':
      return 'plata'
    case 'ORO':
    case 'GOLD':
      return 'oro'
    case 'INFINITO':
    case 'ILIMITADO':
    case 'UNLIMITED':
      return 'ilimitado'
    case 'TRIAL':
    case 'INICIAL':
    case 'BRONCE':
    case 'BRONZE':
    default:
      return 'bronce'
  }
}

async function empresaIdsForUser(
  admin: SupabaseClient,
  userId: string
): Promise<string[]> {
  const ids = new Set<string>()

  const { data: perfiles } = await admin
    .from('perfiles')
    .select('empresa_id, compania_id')
    .eq('user_id', userId)

  for (const pf of perfiles || []) {
    const row = pf as { empresa_id?: string | null; compania_id?: string | null }
    for (const raw of [row.empresa_id, row.compania_id]) {
      if (raw == null || String(raw).trim() === '') continue
      const s = String(raw).trim()
      if (isValidUUID(s)) {
        ids.add(s)
        continue
      }
      const { data: emp } = await admin.from('empresas').select('id').eq('nombre', s).maybeSingle()
      if (emp?.id) ids.add(String(emp.id))
    }
  }

  if (ids.size === 0) {
    const { data: emp } = await admin
      .from('empresas')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (emp?.id) ids.add(String(emp.id))
  }

  return [...ids]
}

/**
 * Mayor plan entre dueño de empresa y admins del perfil (Stripe suele estar en el admin).
 */
async function resolveBestPlanTypeForEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  fallbackUserId: string
): Promise<string | undefined> {
  const candidateIds = new Set<string>()

  const { data: emp } = await admin
    .from('empresas')
    .select('user_id')
    .eq('id', empresaId)
    .maybeSingle()
  const ownerId = (emp as { user_id?: string | null } | null)?.user_id
  if (ownerId && String(ownerId).trim()) {
    candidateIds.add(String(ownerId).trim())
  }

  const { data: miembros } = await admin
    .from('perfiles')
    .select('user_id, rol')
    .eq('empresa_id', empresaId)

  for (const p of miembros || []) {
    const row = p as { user_id?: string; rol?: string | null }
    if (!row.user_id) continue
    const rol = String(row.rol || '').toLowerCase()
    if (rol === 'admin' || rol === 'superadmin' || rol === 'super admin') {
      candidateIds.add(String(row.user_id))
    }
  }

  candidateIds.add(fallbackUserId)

  let bestRank = -1
  let bestRaw: string | undefined

  for (const uid of candidateIds) {
    try {
      const { data, error } = await admin.auth.admin.getUserById(uid)
      if (error || !data?.user) continue
      const meta = data.user.user_metadata as Record<string, unknown> | undefined
      const pt = readPlanFromUserMetadata(meta) || 'TRIAL'
      const r = rankPlanType(pt)
      if (r > bestRank) {
        bestRank = r
        bestRaw = pt
      }
    } catch {
      continue
    }
  }

  return bestRaw
}

export type SyncEmpresaPlanCorreoResult = {
  ok: boolean
  actualizadas?: number
  planCorreo?: PlanCorreoKey
  error?: string
}

export type SyncEmpresaPlanCorreoOptions = {
  /** Stripe webhooks: aplicar sin filtrar candidatos de plan (usa override o usuario). */
  force?: boolean
}

/**
 * Actualiza `plan_suscripcion` en cada empresa vinculada al usuario (dispara trigger de límite).
 * @param planTypeOverride — ej. 'PLATA' desde Stripe o 'INICIAL' al cancelar suscripción.
 */
export async function syncEmpresaPlanCorreoForUser(
  admin: SupabaseClient,
  userId: string,
  planTypeOverride?: string | null,
  options?: SyncEmpresaPlanCorreoOptions
): Promise<SyncEmpresaPlanCorreoResult> {
  const empresaIds = await empresaIdsForUser(admin, userId)

  if (empresaIds.length === 0) {
    let fallbackPlan = planTypeOverride
    if (fallbackPlan == null && !options?.force) {
      const { data: authData } = await admin.auth.admin.getUserById(userId)
      const meta = authData?.user?.user_metadata as Record<string, unknown> | undefined
      fallbackPlan = readPlanFromUserMetadata(meta)
    }
    const planCorreo = saasPlanTypeToPlanCorreoKey(fallbackPlan)
    return { ok: true, actualizadas: 0, planCorreo }
  }

  let actualizadas = 0
  let lastPlanCorreo: PlanCorreoKey = 'bronce'

  for (const empresaId of empresaIds) {
    const { data: empRow, error: empErr } = await admin
      .from('empresas')
      .select('plan_suscripcion')
      .eq('id', empresaId)
      .maybeSingle()

    if (empErr) {
      if (/column|does not exist|schema cache/i.test(empErr.message || '')) {
        return { ok: false, error: empErr.message }
      }
      console.warn('[syncEmpresaPlanCorreo] select empresa:', empErr.message)
      continue
    }

    let effectivePlan: string | null | undefined = planTypeOverride ?? undefined

    if (effectivePlan == null) {
      if (options?.force) {
        const { data: authData } = await admin.auth.admin.getUserById(userId)
        const meta = authData?.user?.user_metadata as Record<string, unknown> | undefined
        effectivePlan = readPlanFromUserMetadata(meta)
      } else {
        effectivePlan = await resolveBestPlanTypeForEmpresa(admin, empresaId, userId)
      }
    }

    const planCorreo = saasPlanTypeToPlanCorreoKey(effectivePlan)
    lastPlanCorreo = planCorreo

    const current = (empRow as { plan_suscripcion?: string } | null)?.plan_suscripcion
    if (current === planCorreo) {
      continue
    }

    const { error: upErr } = await admin
      .from('empresas')
      .update({ plan_suscripcion: planCorreo })
      .eq('id', empresaId)

    if (upErr) {
      console.warn('[syncEmpresaPlanCorreo] update empresa:', upErr.message)
      continue
    }
    actualizadas += 1
  }

  return { ok: true, actualizadas, planCorreo: lastPlanCorreo }
}

/** userId → planType raw (TRIAL, PLATA, …) desde auth.users.user_metadata */
export async function buildAuthUserPlanTypeMap(admin: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  let page = 1
  const perPage = 1000
  let batch: { id: string; user_metadata?: Record<string, unknown> }[] = []
  do {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.warn('[buildAuthUserPlanTypeMap]', error.message)
      break
    }
    batch = (data?.users ?? []) as { id: string; user_metadata?: Record<string, unknown> }[]
    for (const u of batch) {
      const pt = readPlanFromUserMetadata(u.user_metadata) || 'TRIAL'
      map.set(u.id, pt)
    }
    page += 1
  } while (batch.length === perPage)
  return map
}

export type PerfilPlanRow = {
  user_id?: string | null
  usuario_id?: string | null
  rol?: string | null
}

/**
 * Cupo de correo inferido del plan SaaS (metadata): mayor rango entre dueño y admins del tenant.
 */
export function planCorreoDesdeMapaSaas(
  empresaOwnerUserId: string | null | undefined,
  miembros: PerfilPlanRow[],
  planByUserId: Map<string, string>
): PlanCorreoKey {
  const candidateIds = new Set<string>()
  if (empresaOwnerUserId && String(empresaOwnerUserId).trim()) {
    candidateIds.add(String(empresaOwnerUserId).trim())
  }
  for (const p of miembros) {
    const uid = (p.user_id ?? p.usuario_id) as string | null | undefined
    if (!uid) continue
    const rol = String(p.rol || '').toLowerCase()
    if (rol === 'admin' || rol === 'super_admin' || rol === 'superadmin' || rol === 'super admin') {
      candidateIds.add(String(uid))
    }
  }
  if (candidateIds.size === 0 && miembros.length > 0) {
    for (const p of miembros) {
      const uid = (p.user_id ?? p.usuario_id) as string | null | undefined
      if (uid) candidateIds.add(String(uid))
    }
  }
  let bestRank = -1
  let bestRaw = 'TRIAL'
  for (const uid of candidateIds) {
    const pt = planByUserId.get(uid) || 'TRIAL'
    const r = rankPlanType(pt)
    if (r > bestRank) {
      bestRank = r
      bestRaw = pt
    }
  }
  return saasPlanTypeToPlanCorreoKey(bestRaw)
}
