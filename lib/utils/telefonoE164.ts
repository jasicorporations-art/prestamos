/**
 * Normaliza un número de teléfono a formato E.164 para Twilio WhatsApp.
 * Soporta República Dominicana (+1 809/829/849) y otros países.
 * @returns Número en formato E.164 (ej: +18095551234) o null si no es válido
 */
export function normalizarE164(telefono: string | null | undefined): string | null {
  if (!telefono || typeof telefono !== 'string') return null
  const digits = telefono.replace(/\D/g, '')
  if (digits.length < 10) return null
  // RD: 10 dígitos → +1 + 10 dígitos; o ya viene con 1 (11 dígitos)
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  // Otros países: si empieza con código de país (ej 52 México, 34 España), asumir válido
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`
  return null
}

/** Verifica si el string es un número E.164 válido (mínimo 10 dígitos tras +). */
export function esE164Valido(e164: string): boolean {
  return /^\+[1-9]\d{9,14}$/.test(e164)
}
