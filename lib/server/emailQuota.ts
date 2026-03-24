import type { SupabaseClient } from '@supabase/supabase-js'
import { isValidUUID } from '@/lib/utils/compania'
import {
  mensajeCupoCorreoAgotado,
  normalizarPlanSuscripcion,
} from '@/lib/planes-correo-empresa'

function rpcMissing(error: { message?: string } | null | undefined): boolean {
  return /function.*does not exist|42704|42883|Could not find the function/i.test(String(error?.message || ''))
}

async function fetchPlanForMensaje(
  admin: SupabaseClient,
  empresaUuid: string
): Promise<ReturnType<typeof normalizarPlanSuscripcion>> {
  const { data } = await admin
    .from('empresas')
    .select('plan_suscripcion')
    .eq('id', empresaUuid)
    .maybeSingle()
  return normalizarPlanSuscripcion((data as { plan_suscripcion?: string } | null)?.plan_suscripcion)
}

/**
 * Resuelve el UUID de fila en `empresas` para aplicar cupo.
 */
export async function resolveEmpresaRowUuid(
  admin: SupabaseClient,
  raw: string | null | undefined
): Promise<string | null> {
  if (raw == null || String(raw).trim() === '') return null
  const s = String(raw).trim()
  if (isValidUUID(s)) return s
  const { data, error } = await admin.from('empresas').select('id').eq('nombre', s).maybeSingle()
  if (error || !data?.id) return null
  return String((data as { id: string }).id)
}

export type EmailQuotaResult = { allowed: true } | { allowed: false; mensaje: string }

/** Modo tras reservar cupo antes de llamar a Resend. */
export type EmailQuotaSendMode =
  | { kind: 'none' }
  | { kind: 'consumed' }
  | { kind: 'legacy_increment' }

async function checkEmpresaEmailQuotaLegacyColumns(
  admin: SupabaseClient,
  empresaUuid: string
): Promise<EmailQuotaResult> {
  const { data, error } = await admin
    .from('empresas')
    .select('limite_correos_mensual, correos_consumidos, plan_suscripcion')
    .eq('id', empresaUuid)
    .maybeSingle()

  if (error) {
    const msg = String(error.message || '')
    if (/column|does not exist|schema cache/i.test(msg)) {
      console.warn('[email-quota] Columnas legado ausentes; omitir límite.')
      return { allowed: true }
    }
    console.warn('[email-quota] Error leyendo cupo legado:', error.message)
    return { allowed: true }
  }

  const row = data as {
    limite_correos_mensual?: number | null
    correos_consumidos?: number | null
    plan_suscripcion?: string | null
  } | null

  if (!row) return { allowed: true }

  const limite = row.limite_correos_mensual
  if (limite == null) return { allowed: true }

  if (!('correos_consumidos' in row)) {
    return { allowed: true }
  }

  const consumidos = Number(row.correos_consumidos ?? 0)
  if (!Number.isFinite(consumidos)) return { allowed: true }

  if (consumidos >= limite) {
    const plan = normalizarPlanSuscripcion(row.plan_suscripcion ?? undefined)
    return { allowed: false, mensaje: mensajeCupoCorreoAgotado(plan) }
  }
  return { allowed: true }
}

async function incrementLegacyCorreosConsumidos(admin: SupabaseClient, empresaUuid: string): Promise<void> {
  try {
    const { error } = await admin.rpc('empresas_increment_correo_consumido', {
      p_empresa_id: empresaUuid,
    })
    if (error) {
      if (/function.*does not exist|42704|42883/i.test(String(error.message))) {
        const { data: row } = await admin
          .from('empresas')
          .select('correos_consumidos')
          .eq('id', empresaUuid)
          .maybeSingle()
        if (!(row && 'correos_consumidos' in (row as object))) return
        const next =
          Number((row as { correos_consumidos?: number } | null)?.correos_consumidos ?? 0) + 1
        await admin.from('empresas').update({ correos_consumidos: next }).eq('id', empresaUuid)
        return
      }
      console.warn('[email-quota] increment legacy RPC:', error.message)
    }
  } catch (e) {
    console.warn('[email-quota] increment legacy exception:', e)
  }
}

/**
 * Solo lectura: para UI o validaciones sin consumir.
 * Prioridad: RPC empresas_get_consumo_correos_actual → columnas empresas.
 */
export async function checkEmpresaEmailQuota(
  admin: SupabaseClient,
  empresaUuid: string | null
): Promise<EmailQuotaResult> {
  if (!empresaUuid) return { allowed: true }

  const { data, error } = await admin.rpc('empresas_get_consumo_correos_actual', {
    p_empresa_id: empresaUuid,
  })
  if (!error && data != null) {
    const row = Array.isArray(data) ? data[0] : data
    if (row && typeof row === 'object') {
      const r = row as { excedido?: boolean; limite_correos_mensual?: number | null }
      if (r.limite_correos_mensual == null) return { allowed: true }
      if (r.excedido) {
        const plan = await fetchPlanForMensaje(admin, empresaUuid)
        return { allowed: false, mensaje: mensajeCupoCorreoAgotado(plan) }
      }
      return { allowed: true }
    }
  }
  if (error && !rpcMissing(error)) {
    console.warn('[email-quota] empresas_get_consumo_correos_actual:', error.message)
  }

  return checkEmpresaEmailQuotaLegacyColumns(admin, empresaUuid)
}

/**
 * Reserva 1 unidad de cupo de forma atómica antes de enviar por Resend.
 * Si falla Resend, llamar `rollbackEmailQuotaAfterFailedSend`.
 * Si Resend OK y mode es legacy_increment, llamar `commitEmailQuotaAfterSuccessfulSend`.
 */
export async function beginEmailQuotaForSend(
  admin: SupabaseClient,
  empresaUuid: string | null
): Promise<
  { ok: true; mode: EmailQuotaSendMode } | { ok: false; mensaje: string }
> {
  if (!empresaUuid) return { ok: true, mode: { kind: 'none' } }

  const { data, error } = await admin.rpc('empresas_consumir_cuota_correo', {
    p_empresa_id: empresaUuid,
    p_cantidad: 1,
  })

  if (!error && typeof data === 'boolean') {
    if (data === true) return { ok: true, mode: { kind: 'consumed' } }
    const plan = await fetchPlanForMensaje(admin, empresaUuid)
    return { ok: false, mensaje: mensajeCupoCorreoAgotado(plan) }
  }

  if (error && rpcMissing(error)) {
    const q = await checkEmpresaEmailQuota(admin, empresaUuid)
    if (!q.allowed) return { ok: false, mensaje: q.mensaje }
    return { ok: true, mode: { kind: 'legacy_increment' } }
  }

  console.warn('[email-quota] empresas_consumir_cuota_correo', error?.message)
  return {
    ok: false,
    mensaje:
      'No se pudo validar el cupo de correos. Intenta de nuevo o contacta al administrador.',
  }
}

export async function commitEmailQuotaAfterSuccessfulSend(
  admin: SupabaseClient,
  empresaUuid: string | null,
  mode: EmailQuotaSendMode
): Promise<void> {
  if (!empresaUuid) return
  if (mode.kind === 'consumed' || mode.kind === 'none') return
  if (mode.kind === 'legacy_increment') {
    const { data, error } = await admin.rpc('empresas_consumir_cuota_correo', {
      p_empresa_id: empresaUuid,
      p_cantidad: 1,
    })
    if (!error && data === true) return
    await incrementLegacyCorreosConsumidos(admin, empresaUuid)
  }
}

export async function rollbackEmailQuotaAfterFailedSend(
  admin: SupabaseClient,
  empresaUuid: string | null,
  mode: EmailQuotaSendMode
): Promise<void> {
  if (!empresaUuid || mode.kind !== 'consumed') return
  const { error } = await admin.rpc('empresas_devolver_cuota_correo', {
    p_empresa_id: empresaUuid,
    p_cantidad: 1,
  })
  if (error && !rpcMissing(error)) {
    console.warn('[email-quota] empresas_devolver_cuota_correo:', error.message)
  }
}

/** @deprecated Prefer begin/commit/rollback; mantenido por compatibilidad. */
export async function incrementEmpresaEmailQuota(
  admin: SupabaseClient,
  empresaUuid: string | null
): Promise<void> {
  if (!empresaUuid) return
  await incrementLegacyCorreosConsumidos(admin, empresaUuid)
}
