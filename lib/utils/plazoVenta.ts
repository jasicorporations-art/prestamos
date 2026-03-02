/**
 * Utilidades para formatear el plazo de una venta según su tipo.
 * IMPORTANTE: Para ventas quincenales, semanales y diarias, plazo_meses/cantidad_cuotas
 * almacenan el NÚMERO DE CUOTAS (ej: 30 quincenas = 30), NO la duración en meses.
 * Por eso nunca debemos mostrar "30 meses" para 30 quincenas.
 */

export type TipoPlazo = 'diario' | 'semanal' | 'quincenal' | 'mensual'

interface VentaPlazo {
  tipo_plazo?: TipoPlazo | null
  cantidad_cuotas?: number
  plazo_meses?: number | null
}

/**
 * Formatea el plazo de una venta mostrando la unidad correcta según el tipo.
 * - Mensual: "12 meses" o "1 año"
 * - Quincenal: "30 quincenas" (nunca "15 meses")
 * - Semanal: "52 semanas" (nunca "12 meses")
 * - Diario: "30 días" (nunca "1 mes")
 */
export function formatearPlazoVenta(venta: VentaPlazo): string {
  const tipo = venta.tipo_plazo || 'mensual'
  const cantidad = venta.cantidad_cuotas ?? venta.plazo_meses ?? 0

  if (!cantidad || cantidad <= 0) return 'N/A'

  switch (tipo) {
    case 'diario':
      if (cantidad === 1) return '1 día'
      if (cantidad < 7) return `${cantidad} días`
      if (cantidad < 30) {
        const semanas = Math.floor(cantidad / 7)
        const dias = cantidad % 7
        if (dias === 0) return `${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`
        return `${semanas} ${semanas === 1 ? 'semana' : 'semanas'} y ${dias} ${dias === 1 ? 'día' : 'días'}`
      }
      return `${cantidad} días`
    case 'semanal':
      if (cantidad === 1) return '1 semana'
      if (cantidad < 52) return `${cantidad} semanas`
      {
        const años = Math.floor(cantidad / 52)
        const semanas = cantidad % 52
        if (semanas === 0) return `${años} ${años === 1 ? 'año' : 'años'}`
        return `${años} ${años === 1 ? 'año' : 'años'} y ${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`
      }
    case 'quincenal':
      if (cantidad === 1) return '1 quincena'
      if (cantidad < 24) return `${cantidad} quincenas`
      {
        const años = Math.floor(cantidad / 24)
        const quincenas = cantidad % 24
        if (quincenas === 0) return `${años} ${años === 1 ? 'año' : 'años'}`
        return `${años} ${años === 1 ? 'año' : 'años'} y ${quincenas} ${quincenas === 1 ? 'quincena' : 'quincenas'}`
      }
    case 'mensual':
    default:
      if (cantidad === 1) return '1 mes'
      if (cantidad < 12) return `${cantidad} meses`
      {
        const años = Math.floor(cantidad / 12)
        const meses = cantidad % 12
        if (meses === 0) return `${años} ${años === 1 ? 'año' : 'años'}`
        return `${años} ${años === 1 ? 'año' : 'años'} y ${meses} ${meses === 1 ? 'mes' : 'meses'}`
      }
  }
}
