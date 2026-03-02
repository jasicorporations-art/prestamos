/**
 * Sistema de Créditos de Notificación WhatsApp.
 * 1 mensaje = 1 crédito. Plan base: 750 créditos/mes. Extensión: 200 créditos.
 * Estado 'Cupo Agotado' cuando créditos = 0.
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const CREDITOS_BASE_MENSUAL = 750
export const CREDITOS_PAQUETE_EXTENSION = 200
export const COSTO_TWILIO_POR_MENSAJE = 0.025
export const GANANCIA_FIJA_PLAN = 15

export type EstadoCupo =
  | { ok: true; creditos: number; restantes: number; aviso?: string }
  | { ok: false; creditos: number; aviso: string; status: 'Cupo Agotado' }

function getPeriodoActual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Obtiene o crea el registro de consumo del mes actual para una empresa.
 */
export async function getConsumoActual(empresaId: string): Promise<{
  creditos_consumidos: number
  creditos_extension: number
  whatsapp_status: string | null
}> {
  const admin = getSupabaseAdmin()
  const periodo = getPeriodoActual()

  const { data, error } = await admin
    .from('whatsapp_consumo_mensual')
    .select('mensajes_enviados, creditos_extension, whatsapp_status')
    .eq('empresa_id', empresaId)
    .eq('periodo', periodo)
    .maybeSingle()

  if (error) throw error
  const consumidos = data?.mensajes_enviados ?? 0
  const extension = data?.creditos_extension ?? 0

  if (data) {
    return {
      creditos_consumidos: consumidos,
      creditos_extension: extension,
      whatsapp_status: data.whatsapp_status,
    }
  }

  const { data: inserted, error: insertErr } = await admin
    .from('whatsapp_consumo_mensual')
    .insert({
      empresa_id: empresaId,
      periodo,
      mensajes_enviados: 0,
      creditos_extension: 0,
    })
    .select('mensajes_enviados, creditos_extension, whatsapp_status')
    .single()

  if (insertErr) throw insertErr
  return {
    creditos_consumidos: inserted?.mensajes_enviados ?? 0,
    creditos_extension: inserted?.creditos_extension ?? 0,
    whatsapp_status: inserted?.whatsapp_status ?? null,
  }
}

/**
 * Créditos totales disponibles = 750 (base) + extensiones compradas.
 */
function creditosTotales(extension: number): number {
  return CREDITOS_BASE_MENSUAL + extension
}

/**
 * Verifica si se puede enviar. Retorna estado con aviso amigable (sin info técnica).
 */
export async function verificarCupo(empresaId: string): Promise<EstadoCupo> {
  const { creditos_consumidos, creditos_extension, whatsapp_status } = await getConsumoActual(empresaId)
  const total = creditosTotales(creditos_extension)
  const restantes = Math.max(0, total - creditos_consumidos)

  if (whatsapp_status === 'Cupo Agotado' || restantes <= 0) {
    return {
      ok: false,
      creditos: creditos_consumidos,
      aviso:
        'Has agotado tus notificaciones mensuales. Para continuar enviando recibos y recordatorios ahora mismo, puedes adquirir un Paquete de Extensión de 200 Notificaciones.',
      status: 'Cupo Agotado',
    }
  }

  return {
    ok: true,
    creditos: creditos_consumidos,
    restantes,
    aviso: undefined,
  }
}

/**
 * Incrementa el contador tras un envío exitoso.
 * Si llega a 0 restantes, actualiza status a 'Cupo Agotado'.
 */
export async function incrementarConsumo(empresaId: string): Promise<void> {
  const admin = getSupabaseAdmin()
  const periodo = getPeriodoActual()

  const { data: actual } = await admin
    .from('whatsapp_consumo_mensual')
    .select('id, mensajes_enviados, creditos_extension')
    .eq('empresa_id', empresaId)
    .eq('periodo', periodo)
    .maybeSingle()

  const nuevoConsumido = (actual?.mensajes_enviados ?? 0) + 1
  const extension = actual?.creditos_extension ?? 0
  const total = creditosTotales(extension)
  const status = nuevoConsumido >= total ? 'Cupo Agotado' : null

  if (actual) {
    await admin
      .from('whatsapp_consumo_mensual')
      .update({
        mensajes_enviados: nuevoConsumido,
        whatsapp_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', actual.id)
  } else {
    await admin.from('whatsapp_consumo_mensual').insert({
      empresa_id: empresaId,
      periodo,
      mensajes_enviados: nuevoConsumido,
      whatsapp_status: status,
    })
  }
}

/**
 * Agrega créditos de extensión tras compra exitosa.
 */
export async function agregarCreditosExtension(
  empresaId: string,
  creditos: number,
  stripeSessionId: string,
  montoUsd: number,
  costoProveedorUsd: number
): Promise<void> {
  const admin = getSupabaseAdmin()
  const periodo = getPeriodoActual()

  await admin.from('whatsapp_recargas').insert({
    empresa_id: empresaId,
    stripe_session_id: stripeSessionId,
    creditos,
    monto_usd: montoUsd,
    costo_proveedor_usd: costoProveedorUsd,
  })

  const { data: actual } = await admin
    .from('whatsapp_consumo_mensual')
    .select('id, creditos_extension, whatsapp_status')
    .eq('empresa_id', empresaId)
    .eq('periodo', periodo)
    .maybeSingle()

  const nuevaExtension = (actual?.creditos_extension ?? 0) + creditos

  if (actual) {
    await admin
      .from('whatsapp_consumo_mensual')
      .update({
        creditos_extension: nuevaExtension,
        whatsapp_status: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', actual.id)
  } else {
    await admin.from('whatsapp_consumo_mensual').insert({
      empresa_id: empresaId,
      periodo,
      mensajes_enviados: 0,
      creditos_extension: creditos,
    })
  }
}

/**
 * Registra mensaje fallido en cola (Sin Créditos).
 */
export async function registrarMensajeFallido(
  empresaId: string,
  tipo: 'recibo' | 'recordatorio',
  payload: Record<string, unknown>,
  ventaId?: string,
  pagoId?: string
): Promise<void> {
  const admin = getSupabaseAdmin()
  await admin.from('whatsapp_cola_mensajes').insert({
    empresa_id: empresaId,
    tipo,
    venta_id: ventaId || null,
    pago_id: pagoId || null,
    payload,
    status: 'fallido_sin_creditos',
  })
}

/**
 * Reinicia el contador mensual (día 1).
 */
export async function reiniciarConsumoMensual(): Promise<{ reiniciados: number }> {
  const admin = getSupabaseAdmin()
  const periodo = getPeriodoActual()

  const { data, error } = await admin
    .from('whatsapp_consumo_mensual')
    .update({
      mensajes_enviados: 0,
      creditos_extension: 0,
      whatsapp_status: null,
      updated_at: new Date().toISOString(),
    })
    .eq('periodo', periodo)
    .select('id')

  if (error) throw error
  return { reiniciados: data?.length ?? 0 }
}
