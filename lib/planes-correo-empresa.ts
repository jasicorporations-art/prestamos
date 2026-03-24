/**
 * Planes de cupo mensual de correos (Resend) por empresa — JASI LLC.
 * La fuente de verdad en BD es `public.empresas_limite_correos_por_plan` + trigger
 * `tr_empresas_limite_correos_por_plan` (empresas-plan-suscripcion-correos.sql).
 * Plan Ilimitado → `limite_correos_mensual` NULL en BD (sin tope).
 */

export const PLANES_CORREO_ORDEN = ['bronce', 'plata', 'oro', 'ilimitado'] as const

export type PlanCorreoKey = (typeof PLANES_CORREO_ORDEN)[number]

/** Límites por plan (Ilimitado = sin tope en BD, aquí no aplica número). */
export const LIMITE_CORREOS_POR_PLAN: Record<Exclude<PlanCorreoKey, 'ilimitado'>, number> = {
  bronce: 500,
  plata: 1000,
  oro: 4000,
}

/** Nombre visible del plan (mensajes UI). */
export const NOMBRE_PLAN_CORREO: Record<PlanCorreoKey, string> = {
  bronce: 'Bronce',
  plata: 'Plata',
  oro: 'Oro',
  ilimitado: 'Ilimitado',
}

// Incluye alias en minúsculas por si plan_suscripcion llega desde metadata (trial, infinito, etc.)
const ALIAS: Record<string, PlanCorreoKey> = {
  bronce: 'bronce',
  bronze: 'bronce',
  plata: 'plata',
  silver: 'plata',
  oro: 'oro',
  gold: 'oro',
  ilimitado: 'ilimitado',
  unlimited: 'ilimitado',
  infinito: 'ilimitado',
  trial: 'bronce',
  inicial: 'bronce',
}

export function normalizarPlanSuscripcion(raw: string | null | undefined): PlanCorreoKey {
  const k = String(raw ?? 'bronce')
    .trim()
    .toLowerCase()
  return ALIAS[k] ?? 'bronce'
}

/** null = plan Ilimitado (sin tope mensual). */
export function limiteCorreosParaPlan(plan: PlanCorreoKey): number | null {
  if (plan === 'ilimitado') return null
  return LIMITE_CORREOS_POR_PLAN[plan]
}

/** Siguiente nivel para upsell; null si ya está en el tope configurado. */
export function etiquetaSiguientePlan(plan: PlanCorreoKey): string | null {
  const idx = PLANES_CORREO_ORDEN.indexOf(plan)
  if (idx < 0 || idx >= PLANES_CORREO_ORDEN.length - 1) return null
  const next = PLANES_CORREO_ORDEN[idx + 1]
  return NOMBRE_PLAN_CORREO[next]
}

/**
 * Mensaje al bloquear envío por cupo (Resend).
 */
export function mensajeCupoCorreoAgotado(plan: PlanCorreoKey): string {
  const nombre = NOMBRE_PLAN_CORREO[plan]
  const siguiente = etiquetaSiguientePlan(plan)
  if (!siguiente) {
    return `Has agotado tus correos del Plan ${nombre}. Contacta a JASI LLC para ampliar tu cupo mensual.`
  }
  return `Has agotado tus correos del Plan ${nombre}. Sube a ${siguiente} para seguir enviando recibos.`
}

/** Porcentaje de uso del cupo del mes (0–100). */
export function porcentajeConsumoCorreos(consumidos: number, limite: number): number {
  if (!Number.isFinite(limite) || limite <= 0) return 0
  const c = Math.max(0, Number(consumidos) || 0)
  return Math.min(100, Math.round((c / limite) * 100))
}
