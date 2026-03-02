export type CuotaDetallada = {
  numero_cuota: number
  fecha_pago: string
  cuota_fija: number
  interes_mes: number
  abono_capital: number
  saldo_pendiente: number
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

/**
 * Si la fecha cae en domingo y cobrarDomingos es false, la mueve al lunes.
 */
export function ajustarFechaSiDomingo(fecha: Date, cobrarDomingos: boolean): Date {
  if (cobrarDomingos) return fecha
  const d = new Date(fecha)
  if (d.getDay() === 0) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

function addMonthsLocal(date: Date, months: number) {
  const result = new Date(date)
  const day = result.getDate()
  result.setMonth(result.getMonth() + months)
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(day, lastDay))
  return result
}

function getFechaPago(
  fechaInicio: Date,
  numeroCuota: number,
  tipoPlazo: 'diario' | 'semanal' | 'quincenal' | 'mensual' = 'mensual',
  diaPagoMensual?: number,
  diaPagoSemanal?: number,
  fechaInicioQuincenal?: string,
  cobrarDomingos = false
): Date {
  const fechaInicioDate = new Date(fechaInicio)
  fechaInicioDate.setHours(0, 0, 0, 0)

  let fecha: Date
  switch (tipoPlazo) {
    case 'diario': {
      const f = new Date(fechaInicioDate)
      f.setDate(f.getDate() + numeroCuota)
      fecha = f
      break
    }
    case 'semanal': {
      const f = new Date(fechaInicioDate)
      const diaSemana = diaPagoSemanal ?? 0
      const diaActual = f.getDay()
      let diasHastaPrimero = (diaSemana - diaActual + 7) % 7
      if (diasHastaPrimero === 0) diasHastaPrimero = 7
      f.setDate(f.getDate() + diasHastaPrimero + (numeroCuota - 1) * 7)
      fecha = f
      break
    }
    case 'quincenal': {
      const f = fechaInicioQuincenal
        ? new Date(fechaInicioQuincenal)
        : new Date(fechaInicioDate)
      f.setHours(0, 0, 0, 0)
      const offset = fechaInicioQuincenal ? (numeroCuota - 1) * 15 : numeroCuota * 15
      f.setDate(f.getDate() + offset)
      fecha = f
      break
    }
    case 'mensual':
    default: {
      const target = addMonthsLocal(fechaInicioDate, numeroCuota)
      if (diaPagoMensual) {
        const ultimoDiaMes = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
        target.setDate(Math.min(diaPagoMensual, ultimoDiaMes))
      }
      fecha = target
    }
  }
  return ajustarFechaSiDomingo(fecha, cobrarDomingos)
}

import { getTasaPeriodicaDirecta, calcularFinanciamientoFrances } from './interes'
import type { TipoPlazo, MetodoInteres } from './interes'

/**
 * Función maestra: calcula financiamiento y genera tabla de amortización completa.
 * Detecta tipo_plazo y aplica la matemática francesa correctamente.
 *
 * Tabla de amortización incluye por cada período:
 * - Fecha de pago (sumando días/semanas/quincenas/meses según tipo)
 * - Interés cobrado en ese período
 * - Abono a capital
 * - Saldo restante
 *
 * A mayor tiempo de préstamo, el beneficio total de intereses aumenta exponencialmente.
 */
export function calcularFinanciamientoConTabla(params: {
  montoBase: number
  tasaAnual: number
  numeroCuotas: number
  tipoPlazo: TipoPlazo
  fechaInicio: string | Date
  diaPagoMensual?: number
  diaPagoSemanal?: number
  fechaInicioQuincenal?: string
  cobrarDomingos?: boolean
  metodoInteres?: MetodoInteres
}): {
  resumen: ReturnType<typeof calcularFinanciamientoFrances>
  tabla: CuotaDetallada[]
} {
  const resumen = calcularFinanciamientoFrances({
    montoBase: params.montoBase,
    tasaAnual: params.tasaAnual,
    numeroCuotas: params.numeroCuotas,
    tipoPlazo: params.tipoPlazo,
    metodoInteres: params.metodoInteres,
  })

  const tabla = calcularAmortizacionFrancesa({
    monto_total: resumen.capitalAmortizado,
    tasa_interes_anual: params.tasaAnual,
    plazo_meses: params.numeroCuotas,
    fecha_inicio: params.fechaInicio,
    tipo_plazo: params.tipoPlazo,
    dia_pago_mensual: params.diaPagoMensual,
    dia_pago_semanal: params.diaPagoSemanal,
    fecha_inicio_quincenal: params.fechaInicioQuincenal,
    cobrar_domingos: params.cobrarDomingos ?? false,
    metodo_interes: params.metodoInteres,
  })

  return { resumen, tabla }
}

export function calcularAmortizacionFrancesa(params: {
  monto_total: number
  tasa_interes_anual: number
  plazo_meses: number
  fecha_inicio: string | Date
  tipo_plazo?: TipoPlazo
  dia_pago_mensual?: number
  dia_pago_semanal?: number
  fecha_inicio_quincenal?: string
  cobrar_domingos?: boolean
  metodo_interes?: MetodoInteres
}): CuotaDetallada[] {
  const {
    monto_total,
    tasa_interes_anual,
    plazo_meses,
    fecha_inicio,
    tipo_plazo = 'mensual',
    dia_pago_mensual,
    dia_pago_semanal,
    fecha_inicio_quincenal,
    cobrar_domingos = false,
    metodo_interes = 'sobre_saldo',
  } = params

  if (plazo_meses <= 0) return []

  // Si es interés fijo, usar amortización simple (lineal)
  if (metodo_interes === 'fijo') {
    const interesTotal = round2(monto_total * getTasaPeriodicaDirecta(tasa_interes_anual) * plazo_meses)
    return calcularAmortizacionSimple({
      capital: monto_total,
      interesTotal,
      plazo_meses,
      fecha_inicio,
      tipo_plazo,
      dia_pago_mensual,
      dia_pago_semanal,
      fecha_inicio_quincenal,
      cobrar_domingos,
    })
  }

  // Sobre saldo: tasa por período (10% mensual = 0.10). Interés compuesto sobre balance
  const tasaPeriodica = getTasaPeriodicaDirecta(tasa_interes_anual)
  const fechaInicio = typeof fecha_inicio === 'string' ? new Date(fecha_inicio) : fecha_inicio

  // n = número total de cuotas (días, semanas, quincenas o meses)
  const n = plazo_meses

  // Cuota = [Monto * i * (1 + i)^n] / [(1 + i)^n - 1]
  const cuotaFija =
    tasaPeriodica === 0
      ? round2(monto_total / n)
      : round2(
          monto_total *
            ((tasaPeriodica * Math.pow(1 + tasaPeriodica, n)) /
              (Math.pow(1 + tasaPeriodica, n) - 1))
        )

  const cuotas: CuotaDetallada[] = []
  let saldo = monto_total

  for (let i = 1; i <= n; i++) {
    const interesPeriodo = round2(saldo * tasaPeriodica)
    let abonoCapital = round2(cuotaFija - interesPeriodo)
    let nuevoSaldo = round2(saldo - abonoCapital)

    if (i === n) {
      abonoCapital = round2(saldo)
      nuevoSaldo = 0
    }

    const fechaPago = getFechaPago(
      fechaInicio,
      i,
      tipo_plazo,
      dia_pago_mensual,
      dia_pago_semanal,
      fecha_inicio_quincenal,
      cobrar_domingos
    )

    cuotas.push({
      numero_cuota: i,
      fecha_pago: fechaPago.toISOString().split('T')[0],
      cuota_fija: i === n ? round2(abonoCapital + interesPeriodo) : cuotaFija,
      interes_mes: interesPeriodo,
      abono_capital: abonoCapital,
      saldo_pendiente: nuevoSaldo,
    })

    saldo = nuevoSaldo
  }

  return cuotas
}

/**
 * Amortización simple: interés proporcional al tiempo.
 * Cuota fija = (Capital + Interés Total) / N
 * Cada cuota: mismo monto, interés y capital distribuidos equitativamente.
 */
export function calcularAmortizacionSimple(params: {
  capital: number
  interesTotal: number
  plazo_meses: number
  fecha_inicio: string | Date
  tipo_plazo?: 'diario' | 'semanal' | 'quincenal' | 'mensual'
  dia_pago_mensual?: number
  dia_pago_semanal?: number
  fecha_inicio_quincenal?: string
  cobrar_domingos?: boolean
}): CuotaDetallada[] {
  const {
    capital,
    interesTotal,
    plazo_meses,
    fecha_inicio,
    tipo_plazo = 'mensual',
    dia_pago_mensual,
    dia_pago_semanal,
    fecha_inicio_quincenal,
    cobrar_domingos = false,
  } = params

  if (plazo_meses <= 0) return []

  const montoTotal = capital + interesTotal
  const cuotaFija = round2(montoTotal / plazo_meses)
  const interesPorCuota = round2(interesTotal / plazo_meses)
  const abonoPorCuota = round2(capital / plazo_meses)
  const fechaInicio = typeof fecha_inicio === 'string' ? new Date(fecha_inicio) : fecha_inicio

  const cuotas: CuotaDetallada[] = []
  let saldo = capital

  for (let i = 1; i <= plazo_meses; i++) {
    const abonoCapital = i === plazo_meses ? round2(saldo) : abonoPorCuota
    const interesMes = i === plazo_meses
      ? round2(cuotaFija - abonoCapital)
      : interesPorCuota
    const nuevoSaldo = round2(saldo - abonoCapital)

    const fechaPago = getFechaPago(
      fechaInicio,
      i,
      tipo_plazo,
      dia_pago_mensual,
      dia_pago_semanal,
      fecha_inicio_quincenal,
      cobrar_domingos
    )

    cuotas.push({
      numero_cuota: i,
      fecha_pago: fechaPago.toISOString().split('T')[0],
      cuota_fija: i === plazo_meses ? round2(abonoCapital + interesMes) : cuotaFija,
      interes_mes: interesMes,
      abono_capital: abonoCapital,
      saldo_pendiente: nuevoSaldo,
    })

    saldo = nuevoSaldo
  }

  return cuotas
}
