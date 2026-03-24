/**
 * Sugiere una moneda por defecto según la configuración regional del usuario
 * (locale, timezone o Intl). Usado al primer uso si no hay selección guardada.
 */

export type CurrencyCode = 'USD' | 'MXN' | 'COP' | 'EUR' | 'DOP' | 'GTQ' | 'PEN' | 'CRC'

const CURRENCY_BY_LOCALE: Record<string, CurrencyCode> = {
  'es-MX': 'MXN',
  'es-CO': 'COP',
  'es-ES': 'EUR',
  'es-DO': 'DOP',
  'es-GT': 'GTQ',
  'es-PE': 'PEN',
  'es-CR': 'CRC',
  'en-US': 'USD',
  'de': 'EUR',
  'fr': 'EUR',
  'en': 'USD',
}

const FALLBACK_CURRENCY: CurrencyCode = 'USD'

/**
 * Obtiene la moneda sugerida según el locale del navegador o timezone.
 * Solo se ejecuta en el cliente (usa navigator / Intl).
 */
export function suggestCurrencyFromLocale(): CurrencyCode {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return FALLBACK_CURRENCY
  }
  try {
    const locale = navigator.language || (navigator as any).userLanguage || 'en'
    const base = locale.split('-')[0]
    const full = locale
    if (CURRENCY_BY_LOCALE[full]) return CURRENCY_BY_LOCALE[full]
    if (CURRENCY_BY_LOCALE[`${base}-${locale.split('-')[1]?.toUpperCase() || ''}`]) {
      const region = locale.split('-')[1]
      if (region) return CURRENCY_BY_LOCALE[`${base}-${region}`] ?? FALLBACK_CURRENCY
    }
    try {
      const resolved = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })
      const currency = resolved.resolvedOptions().currency
      if (currency && ['USD', 'MXN', 'COP', 'EUR', 'DOP', 'GTQ', 'PEN', 'CRC'].includes(currency)) {
        return currency as CurrencyCode
      }
    } catch {
      // ignore
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz.includes('America/Mexico')) return 'MXN'
    if (tz.includes('America/Bogota')) return 'COP'
    if (tz.includes('America/Santo_Domingo')) return 'DOP'
    if (tz.includes('America/Guatemala')) return 'GTQ'
    if (tz.includes('America/Lima')) return 'PEN'
    if (tz.includes('America/Costa_Rica')) return 'CRC'
    if (tz.includes('Europe')) return 'EUR'
  } catch {
    // ignore
  }
  return FALLBACK_CURRENCY
}

export const SUPPORTED_CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: 'USD', label: 'Dólar estadounidense', symbol: '$' },
  { code: 'MXN', label: 'Peso mexicano', symbol: '$' },
  { code: 'COP', label: 'Peso colombiano', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'DOP', label: 'Peso dominicano', symbol: '$' },
  { code: 'GTQ', label: 'Quetzal guatemalteco', symbol: 'Q' },
  { code: 'PEN', label: 'Sol peruano', symbol: 'S/' },
  { code: 'CRC', label: 'Colón costarricense', symbol: '₡' },
]
