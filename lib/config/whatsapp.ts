/**
 * Configuración centralizada de WhatsApp para producción.
 * Usa el número oficial (no Sandbox) configurado en variables de entorno.
 *
 * Twilio API requiere formato: whatsapp:+E164
 * Configura TWILIO_NUMBER en Supabase Edge Functions con tu número oficial (ej: +18095551234).
 */

/** Número oficial de WhatsApp en formato E.164 */
export const WHATSAPP_NUMERO_OFICIAL =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER_OFFICIAL ||
  process.env.TWILIO_WHATSAPP_NUMBER ||
  '13025472070'

/**
 * Formato para Twilio API de producción.
 * Twilio requiere prefijo whatsapp: para identificar el canal.
 */
export function formatearParaTwilio(numero: string): string {
  const limpio = numero.replace(/\D/g, '').replace(/^\+/, '')
  const e164 = limpio.startsWith('1') && limpio.length === 11 ? limpio : '1' + limpio
  return `whatsapp:+${e164}`
}
