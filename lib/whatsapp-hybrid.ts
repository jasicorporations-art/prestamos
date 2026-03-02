/**
 * Sistema híbrido de envío WhatsApp: Evolution API (primario si está configurado) + Twilio (fallback).
 * No modifica la lógica ni el código de Twilio; solo decide qué canal usar y registra logs.
 */

import { enviarWhatsAppViaEdgeFunction } from '@/lib/twilio-whatsapp'
import type { PayloadRecibo } from '@/lib/twilio-whatsapp'

export type ConfigWhatsApp = {
  metodo_envio: 'TWILIO' | 'EVOLUTION'
  evolution_instance?: string | null
  evolution_apikey?: string | null
  evolution_base_url?: string | null
}

export type ResultadoEnvio = {
  enviado: boolean
  sid?: string | null
  metodo_usado: 'TWILIO' | 'EVOLUTION'
  error_evolution?: string
}

/**
 * Obtiene la configuración de envío WhatsApp de la empresa.
 * Busca en configuracion_whatsapp (por empresa_id) o en perfil_empresa.
 * Si no existe tabla o campos, devuelve metodo_envio: 'TWILIO'.
 */
export async function getConfigWhatsAppEmpresa(
  admin: { from: (t: string) => { select: (c: string) => { eq: (col: string, id: string) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> } } } },
  empresaId: string | null | undefined
): Promise<ConfigWhatsApp> {
  const defaultConfig: ConfigWhatsApp = { metodo_envio: 'TWILIO' }
  if (!empresaId || typeof empresaId !== 'string' || empresaId.trim() === '') return defaultConfig

  const selectCols = 'metodo_envio, evolution_instance, evolution_apikey, evolution_base_url'
  try {
    const { data, error } = (await admin
      .from('configuracion_whatsapp')
      .select(selectCols)
      .eq('empresa_id', empresaId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: { message?: string } | null }

    if (!error && data) {
      const metodo = (data.metodo_envio ?? 'TWILIO') as string
      return {
        metodo_envio: metodo.toUpperCase() === 'EVOLUTION' ? 'EVOLUTION' : 'TWILIO',
        evolution_instance: (data.evolution_instance as string) ?? null,
        evolution_apikey: (data.evolution_apikey as string) ?? null,
        evolution_base_url: (data.evolution_base_url as string) ?? null,
      }
    }
  } catch {
    // Tabla o columnas pueden no existir
  }

  try {
    const { data, error } = await admin
      .from('perfil_empresa')
      .select(selectCols)
      .eq('empresa_id', empresaId)
      .maybeSingle() as Promise<{ data: Record<string, unknown> | null; error: { message?: string } | null }>

    if (!error && data) {
      const metodo = (data.metodo_envio ?? 'TWILIO') as string
      return {
        metodo_envio: metodo.toUpperCase() === 'EVOLUTION' ? 'EVOLUTION' : 'TWILIO',
        evolution_instance: (data.evolution_instance as string) ?? null,
        evolution_apikey: (data.evolution_apikey as string) ?? null,
        evolution_base_url: (data.evolution_base_url as string) ?? null,
      }
    }
  } catch {
    // Ignorar
  }

  return defaultConfig
}

/**
 * Envía un mensaje de texto plano vía Evolution API.
 * Endpoint: POST {baseUrl}/message/sendText/{instance}
 * Body: { number: string (solo dígitos con código país), text: string }
 */
export async function enviarEvolutionTexto(
  baseUrl: string,
  instance: string,
  apikey: string | null | undefined,
  telefonoE164: string,
  texto: string
): Promise<{ ok: boolean; error?: string }> {
  const url = `${baseUrl.replace(/\/$/, '')}/message/sendText/${encodeURIComponent(instance)}`
  const number = telefonoE164.replace(/\D/g, '').trim()
  if (!number || number.length < 10) {
    return { ok: false, error: 'Número inválido para Evolution' }
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (apikey && apikey.trim()) headers['apikey'] = apikey.trim()

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ number, text: texto }),
    })

    const text = await res.text()
    if (!res.ok) {
      return { ok: false, error: text || `Evolution API ${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

/**
 * Genera el texto plano del recibo (compatible con Evolution / mensaje libre).
 */
export function textoPlanoRecibo(payload: PayloadRecibo): string {
  if (payload.tipo !== 'recibo') return ''
  const monto = typeof payload.monto_cobrado === 'number'
    ? payload.monto_cobrado.toLocaleString('es-DO', { minimumFractionDigits: 2 })
    : String(payload.monto_cobrado ?? '0')
  const balance = typeof payload.balance_restante === 'number'
    ? payload.balance_restante.toLocaleString('es-DO', { minimumFractionDigits: 2 })
    : String(payload.balance_restante ?? '0')
  const nombre = payload.nombre_cliente || 'Cliente'
  const empresa = payload.nombre_empresa?.trim() || 'Tu financiera'
  const cuota = payload.numero_cuota != null ? String(payload.numero_cuota) : '—'
  const restantes = payload.cuotas_restantes != null ? String(payload.cuotas_restantes) : '—'
  const fecha = payload.fecha ? new Date(payload.fecha).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

  return (
    `Notificación automática del sistema de recibo.\n\n` +
    `¡Hola ${nombre}! Confirmamos tu pago de RD$${monto} realizado el ${fecha}.\n` +
    `Cuota #${cuota} pagada. Te quedan ${restantes} cuotas por pagar.\n` +
    `Tu balance restante es RD$${balance}.\n\n` +
    `Gracias por tu puntualidad. Atentamente: ${empresa}.`
  )
}

/**
 * Indica si la empresa tiene Evolution WhatsApp activo (pagado).
 */
export async function empresaTieneEvolutionPremium(
  admin: { from: (table: string) => any },
  empresaId: string | null | undefined
): Promise<boolean> {
  if (!empresaId || typeof empresaId !== 'string' || empresaId.trim() === '') return false
  const hoy = new Date().toISOString().slice(0, 10)
  try {
    const { data } = await admin
      .from('perfiles')
      .select('has_evolution_whatsapp, premium_until_evolution')
      .or(`empresa_id.eq.${empresaId},compania_id.eq.${empresaId}`)
    const rows = Array.isArray(data) ? data : []
    const vigente = (until: string | null | undefined) => !until || until >= hoy
    const isOn = (v: unknown) => v === true || v === 1 || String(v).toLowerCase() === 'true'
    return rows.some(
      (r: { has_evolution_whatsapp?: unknown; premium_until_evolution?: string | null }) =>
        isOn(r.has_evolution_whatsapp) && vigente(r.premium_until_evolution)
    )
  } catch {
    return false
  }
}

/**
 * Función maestra: envía notificación WhatsApp por Evolution (si está configurado y pagado) o Twilio (fallback).
 * - Solo usa Evolution si metodo_envio === 'EVOLUTION', hay instance + base_url y la empresa tiene Evolution premium.
 * - Si Evolution falla o metodo_envio === 'TWILIO', usa la Edge Function Twilio.
 * - Registra en logs el método usado y errores.
 */
export async function enviarNotificacionWhatsApp(
  empresaId: string | null | undefined,
  payloadTwilioRecibo: PayloadRecibo,
  admin: { from: (table: string) => any },
  logDetalle: (metodo: string, error?: string) => Promise<void>
): Promise<ResultadoEnvio> {
  const config = await getConfigWhatsAppEmpresa(admin, empresaId)
  const tieneEvolutionPremium = await empresaTieneEvolutionPremium(admin, empresaId)

  if (
    config.metodo_envio === 'EVOLUTION' &&
    config.evolution_instance &&
    config.evolution_base_url &&
    tieneEvolutionPremium
  ) {
    const baseUrl = config.evolution_base_url.trim()
    const instance = config.evolution_instance.trim()
    const texto = textoPlanoRecibo(payloadTwilioRecibo)
    const telefono = payloadTwilioRecibo.telefono_cliente.replace(/\D/g, '').trim()
    const telefonoE164 = telefono.startsWith('+') ? telefono : `+${telefono}`

      const evolutionResult = await enviarEvolutionTexto(
        baseUrl,
        instance,
        config.evolution_apikey,
        telefonoE164,
        texto
      )

      if (evolutionResult.ok) {
        await logDetalle('EVOLUTION').catch(() => {})
        return { enviado: true, sid: undefined, metodo_usado: 'EVOLUTION' }
      }

      await logDetalle('EVOLUTION (fallback a Twilio)', evolutionResult.error).catch(() => {})
  }

  try {
    const result = await enviarWhatsAppViaEdgeFunction(payloadTwilioRecibo)
    await logDetalle('TWILIO').catch(() => {})
    return {
      enviado: true,
      sid: result.sid,
      metodo_usado: 'TWILIO',
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await logDetalle('TWILIO', msg).catch(() => {})
    throw err
  }
}
