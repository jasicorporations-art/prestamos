import type { SupabaseClient } from '@supabase/supabase-js'
import { isValidUUID } from '@/lib/utils/compania'

const DEDUPE_SECONDS = 60

export function normalizeReciboMonto(monto: number): number {
  return Math.round(Number(monto) * 100) / 100
}

/**
 * true = ya hubo un envío del mismo recibo (venta + monto) en la ventana de 60s.
 * Si la tabla no existe, devuelve false y no bloquea.
 */
export async function isReciboEmailDuplicateRecent(
  admin: SupabaseClient,
  ventaId: string,
  monto: number
): Promise<boolean> {
  const m = normalizeReciboMonto(monto)
  const since = new Date(Date.now() - DEDUPE_SECONDS * 1000).toISOString()
  const { data, error } = await admin
    .from('recibo_email_send_log')
    .select('id')
    .eq('venta_id', ventaId)
    .eq('monto', m)
    .gte('sent_at', since)
    .limit(1)

  if (error) {
    const msg = String(error.message || '')
    if (/relation|does not exist|schema cache/i.test(msg)) {
      console.warn('[recibo-email] Tabla recibo_email_send_log ausente; dedupe desactivado. Ejecuta supabase/recibo-email-dedupe.sql')
      return false
    }
    console.warn('[recibo-email] Dedupe lookup error:', error.message)
    return false
  }
  return Array.isArray(data) && data.length > 0
}

export async function recordReciboEmailSent(
  admin: SupabaseClient,
  ventaId: string,
  monto: number,
  pagoIds: string[]
): Promise<void> {
  const m = normalizeReciboMonto(monto)
  const { error } = await admin.from('recibo_email_send_log').insert({
    venta_id: ventaId,
    monto: m,
    pago_ids: pagoIds.length ? pagoIds.join(',') : null,
  })
  if (error && !/relation|does not exist|schema cache/i.test(String(error.message))) {
    console.warn('[ recibo-email ] No se pudo registrar envío en log:', error.message)
  }
}

/**
 * Registra fallo de API de correo en actividad_logs (no revierte el pago).
 * historial_movimientos (vista) solo muestra filas con tipo_accion de triggers;
 * estos registros aparecen en Admin > Historial como actividad de la app.
 */
export async function logReciboEmailFailure(
  admin: SupabaseClient,
  opts: {
    usuarioId: string | null
    empresaId: string | null
    ventaId: string
    pagoId: string
    errorMessage: string
  }
): Promise<void> {
  const detalle = `[enviar-recibo-email] venta=${opts.ventaId} pago=${opts.pagoId} — ${opts.errorMessage}`.slice(0, 3500)
  const payload: Record<string, unknown> = {
    usuario_id: opts.usuarioId,
    accion: 'Fallo envío recibo por email',
    detalle,
    entidad_tipo: 'envio_recibo_email',
    entidad_id: opts.pagoId,
    fecha_hora: new Date().toISOString(),
    app_id: 'prestamos',
  }
  if (opts.empresaId && isValidUUID(opts.empresaId)) {
    payload.empresa_id = opts.empresaId
    payload.compania_id = opts.empresaId
  }
  try {
    const { error } = await admin.from('actividad_logs').insert(payload as any)
    if (error) {
      console.warn('[recibo-email] No se pudo escribir actividad_logs:', error.message)
    }
  } catch (e) {
    console.warn('[recibo-email] Excepción al registrar fallo:', e)
  }
}
