/**
 * Utilidades para montos monetarios.
 * Regla: mantener precisión completa en cálculos y BD; redondear solo al mostrar en UI o al guardar el pago final.
 */

import type { CurrencyCode } from './currencyDetection'

/**
 * Redondea un número a 2 decimales usando redondeo estándar
 * (si el tercer decimal es 5 o superior, redondea hacia arriba).
 * Usar para: mostrar en UI o redondear el monto final antes de guardar el pago.
 */
export function roundCurrency(value: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  return Math.round(value * 100) / 100
}

export type FormatCurrencyOptions = {
  currency?: CurrencyCode
  locale?: string
  showCode?: boolean
}

/**
 * Formatea un número como moneda para mostrar al usuario.
 * - Si se pasa options.currency (o desde hook useFormatCurrency), usa esa moneda y símbolo (ej: $1,200.00 USD).
 * - Si solo se pasa locale (string) o nada: formato numérico con 2 decimales, sin símbolo (compatibilidad).
 */
export function formatCurrency(
  value: number,
  localeOrOptions: string | FormatCurrencyOptions = 'es-DO'
): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0.00'
  const rounded = roundCurrency(value)
  const opts: FormatCurrencyOptions =
    typeof localeOrOptions === 'string'
      ? { locale: localeOrOptions }
      : { locale: 'es-DO', ...localeOrOptions }

  if (opts.currency) {
    const locale = opts.locale || 'es-DO'
    const formatted = rounded.toLocaleString(locale, {
      style: 'currency',
      currency: opts.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    if (opts.showCode === true) {
      return `${formatted} ${opts.currency}`
    }
    return formatted
  }

  return rounded.toLocaleString(opts.locale || 'es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Parsea un valor de input a número y lo redondea a 2 decimales.
 * Útil en onBlur de inputs de monto para forzar formato 0.00.
 */
export function parseAndRoundCurrency(inputValue: string | number): number {
  if (typeof inputValue === 'number' && !Number.isNaN(inputValue)) return roundCurrency(inputValue)
  const parsed = parseFloat(String(inputValue).replace(/,/g, ''))
  if (Number.isNaN(parsed)) return 0
  return roundCurrency(parsed)
}
