/**
 * Lógica de filtrado para "Mi Ruta de Hoy"
 * Filtra clientes según su frecuencia de pago (tipo_plazo) y la fecha actual.
 */

const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export interface ItemParaFiltro {
  id: string
  tipo_plazo?: 'diario' | 'semanal' | 'quincenal' | 'mensual' | null
  dia_pago_mensual?: number | null
  dia_pago_semanal?: number | null
  fecha_inicio_quincenal?: string | null
}

export interface ResultadoFiltro {
  mostrar: boolean
  indicador: string
}

/**
 * Normaliza una fecha a medianoche para comparación.
 */
function fechaMedianoche(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
}

/**
 * Determina si un cliente debe aparecer en la ruta de hoy según su frecuencia de pago.
 * Reglas:
 * - Diario: solo si la próxima cuota vence hoy o está vencida (préstamo de hoy → primer pago mañana)
 * - Semanal: si la próxima cuota vence hoy o está vencida; si no hay fecha, usar dia_pago_semanal
 * - Quincenal: si la próxima cuota vence hoy o está vencida; si no hay fecha, usar días 15/30
 * - Mensual: si la próxima cuota vence hoy o está vencida; si no hay fecha, usar dia_pago_mensual
 *
 * IMPORTANTE: Si un cliente toma un préstamo hoy, el primer pago es mañana (no el mismo día).
 * Cuando tenemos fechaProximoVencimiento (de cuotas_detalladas), es la fuente de verdad.
 */
export function debeAparecerEnRutaHoy(
  item: ItemParaFiltro,
  hoy: Date,
  fechaProximoVencimiento: Date | null
): ResultadoFiltro {
  const diaSemana = hoy.getDay()
  const diaMes = hoy.getDate()
  const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
  const tipo = item.tipo_plazo || 'mensual'

  const hoyNorm = fechaMedianoche(hoy)
  const proxNorm = fechaProximoVencimiento ? fechaMedianoche(fechaProximoVencimiento) : null
  const vencido = proxNorm ? proxNorm.getTime() < hoyNorm.getTime() : false
  const venceHoy = proxNorm ? proxNorm.getTime() === hoyNorm.getTime() : false
  const venceHoyOPasado = vencido || venceHoy

  switch (tipo) {
    case 'diario':
      return { mostrar: venceHoyOPasado, indicador: venceHoyOPasado ? 'Pago Diario' : '' }

    case 'semanal': {
      const diaPago = item.dia_pago_semanal ?? 0
      const hoyEsSuDia = diaSemana === diaPago
      const mostrar = venceHoyOPasado || (proxNorm === null && hoyEsSuDia)
      const nombreDia = NOMBRES_DIAS[diaPago] ?? `Día ${diaPago}`
      const indicador = mostrar ? (venceHoyOPasado ? 'Vence hoy' : `Pago Semanal (${nombreDia})`) : ''
      return { mostrar, indicador }
    }

    case 'quincenal': {
      let esDiaPagoQuincenal = false
      if (item.fecha_inicio_quincenal) {
        const inicio = new Date(item.fecha_inicio_quincenal)
        inicio.setHours(0, 0, 0, 0)
        const diffMs = hoyNorm.getTime() - inicio.getTime()
        const diffDias = Math.floor(diffMs / (24 * 60 * 60 * 1000))
        esDiaPagoQuincenal = diffDias >= 0 && diffDias % 15 === 0
      } else {
        esDiaPagoQuincenal = diaMes === 15 || diaMes === 30 || (diaMes === ultimoDiaMes && diaMes >= 28)
      }
      const mostrar = venceHoyOPasado || (proxNorm === null && esDiaPagoQuincenal)
      const indicador = mostrar ? (venceHoyOPasado ? 'Vence hoy' : 'Pago Quincenal') : ''
      return { mostrar, indicador }
    }

    case 'mensual': {
      const diaPago = item.dia_pago_mensual ?? 1
      const hoyEsSuDia =
        diaMes === diaPago || (diaMes === ultimoDiaMes && diaPago > ultimoDiaMes)
      const mostrar = venceHoyOPasado || (proxNorm === null && hoyEsSuDia)
      const indicador = mostrar ? (venceHoyOPasado ? 'Vence hoy' : `Pago Mensual (día ${diaPago})`) : ''
      return { mostrar, indicador }
    }

    default:
      return { mostrar: venceHoyOPasado, indicador: venceHoyOPasado ? 'Vence hoy' : '' }
  }
}
