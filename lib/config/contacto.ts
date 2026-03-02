/**
 * Número de WhatsApp para soporte al cliente (formato E.164).
 * Configurar en .env: WHATSAPP_NUMBER=+15558584209
 * Para componentes cliente (Next.js): NEXT_PUBLIC_WHATSAPP_NUMBER=+15558584209
 */
export const WHATSAPP_NUMBER_E164 =
  process.env.WHATSAPP_NUMBER ||
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER_E164 ||
  '+15558584209'
export const WHATSAPP_DEFAULT_MESSAGE = 'Hola, necesito soporte técnico'

export function buildWhatsAppUrl(number: string, message: string): string | null {
  if (!number || !message) {
    return null
  }
  const digitsOnly = number.replace(/\D/g, '')
  if (!/^\d{10,15}$/.test(digitsOnly)) {
    return null
  }
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${digitsOnly}?text=${encodedMessage}`
}
