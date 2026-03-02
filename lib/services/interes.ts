/**
 * Sistema de cálculo de interés basado en el plazo de financiamiento
 */

export interface ConfiguracionInteres {
  plazoMeses: number
  porcentajeInteres: number
  tipo: 'descuento' | 'interes' // 'descuento' reduce el precio, 'interes' lo aumenta
}

// Configuración de intereses por plazo (en meses)
// Plazos más cortos = menor interés
// Plazos más largos = mayor interés
const CONFIGURACION_INTERESES: ConfiguracionInteres[] = [
  // Plazos cortos: interés mínimo
  { plazoMeses: 1, porcentajeInteres: 1, tipo: 'interes' },   // 1% de interés
  { plazoMeses: 2, porcentajeInteres: 1.5, tipo: 'interes' }, // 1.5% de interés
  { plazoMeses: 3, porcentajeInteres: 2, tipo: 'interes' },   // 2% de interés
  { plazoMeses: 4, porcentajeInteres: 2.5, tipo: 'interes' },  // 2.5% de interés
  { plazoMeses: 5, porcentajeInteres: 3, tipo: 'interes' },     // 3% de interés
  { plazoMeses: 6, porcentajeInteres: 3.5, tipo: 'interes' },  // 3.5% de interés
  
  // Plazos medianos: interés moderado
  { plazoMeses: 7, porcentajeInteres: 4, tipo: 'interes' },   // 4% de interés
  { plazoMeses: 8, porcentajeInteres: 5, tipo: 'interes' },   // 5% de interés
  { plazoMeses: 9, porcentajeInteres: 6, tipo: 'interes' },   // 6% de interés
  { plazoMeses: 10, porcentajeInteres: 7, tipo: 'interes' },  // 7% de interés
  { plazoMeses: 11, porcentajeInteres: 8, tipo: 'interes' },   // 8% de interés
  { plazoMeses: 12, porcentajeInteres: 9, tipo: 'interes' },   // 9% de interés
  
  // Plazos largos: mayor interés
  { plazoMeses: 13, porcentajeInteres: 10, tipo: 'interes' },  // 10% de interés
  { plazoMeses: 14, porcentajeInteres: 11, tipo: 'interes' },  // 11% de interés
  { plazoMeses: 15, porcentajeInteres: 12, tipo: 'interes' },  // 12% de interés
  { plazoMeses: 16, porcentajeInteres: 13, tipo: 'interes' },  // 13% de interés
  { plazoMeses: 17, porcentajeInteres: 14, tipo: 'interes' },  // 14% de interés
  { plazoMeses: 18, porcentajeInteres: 15, tipo: 'interes' },  // 15% de interés
  { plazoMeses: 19, porcentajeInteres: 16, tipo: 'interes' },  // 16% de interés
  { plazoMeses: 20, porcentajeInteres: 17, tipo: 'interes' }, // 17% de interés
  { plazoMeses: 21, porcentajeInteres: 18, tipo: 'interes' },  // 18% de interés
  { plazoMeses: 22, porcentajeInteres: 19, tipo: 'interes' },  // 19% de interés
  { plazoMeses: 23, porcentajeInteres: 20, tipo: 'interes' }, // 20% de interés
  { plazoMeses: 24, porcentajeInteres: 22, tipo: 'interes' },  // 22% de interés (2 años)
]

/**
 * Obtiene la configuración de interés para un plazo específico
 */
function obtenerConfiguracionInteres(plazoMeses: number): ConfiguracionInteres {
  // Buscar la configuración exacta
  const configExacta = CONFIGURACION_INTERESES.find(c => c.plazoMeses === plazoMeses)
  if (configExacta) return configExacta
  
  // Si no hay configuración exacta, usar la más cercana
  // Para plazos menores al mínimo, usar la primera configuración
  if (plazoMeses < CONFIGURACION_INTERESES[0].plazoMeses) {
    return CONFIGURACION_INTERESES[0]
  }
  
  // Para plazos mayores al máximo, usar la última configuración
  if (plazoMeses > CONFIGURACION_INTERESES[CONFIGURACION_INTERESES.length - 1].plazoMeses) {
    return CONFIGURACION_INTERESES[CONFIGURACION_INTERESES.length - 1]
  }
  
  // Interpolar entre las configuraciones más cercanas
  const configAnterior = CONFIGURACION_INTERESES
    .filter(c => c.plazoMeses < plazoMeses)
    .sort((a, b) => b.plazoMeses - a.plazoMeses)[0]
  
  const configSiguiente = CONFIGURACION_INTERESES
    .filter(c => c.plazoMeses > plazoMeses)
    .sort((a, b) => a.plazoMeses - b.plazoMeses)[0]
  
  if (configAnterior && configSiguiente) {
    // Interpolación lineal
    const diferencia = configSiguiente.plazoMeses - configAnterior.plazoMeses
    const pesoAnterior = (configSiguiente.plazoMeses - plazoMeses) / diferencia
    const pesoSiguiente = (plazoMeses - configAnterior.plazoMeses) / diferencia
    
    const porcentajeInterpolado = 
      configAnterior.porcentajeInteres * pesoAnterior +
      configSiguiente.porcentajeInteres * pesoSiguiente
    
    return {
      plazoMeses,
      porcentajeInteres: Math.max(0, Math.round(porcentajeInterpolado * 100) / 100), // Asegurar que nunca sea negativo
      tipo: 'interes', // Siempre interés, nunca descuento
    }
  }
  
  // Fallback: usar la última configuración
  return CONFIGURACION_INTERESES[CONFIGURACION_INTERESES.length - 1]
}

const PORCENTAJE_CARGO_MANEJO = 4.5

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export type TipoPlazo = 'diario' | 'semanal' | 'quincenal' | 'mensual'

/** Método de cálculo de interés */
export type MetodoInteres = 'sobre_saldo' | 'fijo'

/**
 * Convierte la tasa de interés ANUAL a tasa periódica (para legacy/opcional).
 * - Mensual: i = (tasa_anual / 100) / 12
 * - Quincenal: i = (tasa_anual / 100) / 24
 * - Semanal: i = (tasa_anual / 100) / 52
 * - Diario: i = (tasa_anual / 100) / 360
 */
export function getTasaPeriodica(tasaAnual: number, tipoPlazo: TipoPlazo): number {
  const periodosPorAnio =
    tipoPlazo === 'diario' ? 360
    : tipoPlazo === 'semanal' ? 52
    : tipoPlazo === 'quincenal' ? 24
    : 12
  return tasaAnual / 100 / periodosPorAnio
}

/**
 * Tasa periódica DIRECTA: el porcentaje ingresado es la tasa por período.
 * NO se divide entre 12, 360, etc. Ejemplo: 10% mensual = 0.10
 * Fórmula: Capital_Final = Capital_Pendiente × (1 + i)^n
 */
export function getTasaPeriodicaDirecta(porcentajePorPeriodo: number): number {
  return porcentajePorPeriodo / 100
}

/**
 * Función maestra: Calcula financiamiento según método elegido.
 *
 * metodo_interes:
 * - sobre_saldo: Interés compuesto sobre saldo. Tasa por período (10% mensual = 10% cada mes).
 *   Fórmula: Cuota = [Capital * i * (1 + i)^n] / [(1 + i)^n - 1]
 * - fijo: Interés lineal. interesTotal = Capital * (tasa/100) * n. Cuota fija = (Capital + interesTotal) / n
 *
 * Cargo por manejo (4.5%) se SUMA al capital ANTES de calcular.
 */
export function calcularFinanciamientoFrances(params: {
  montoBase: number
  tasaAnual: number
  numeroCuotas: number
  tipoPlazo: TipoPlazo
  metodoInteres?: MetodoInteres
}): {
  cuotaFija: number
  interesesTotales: number
  montoTotal: number
  cargoManejo: number
  montoBase: number
  capitalAmortizado: number
} {
  const { montoBase, tasaAnual, numeroCuotas, tipoPlazo, metodoInteres = 'sobre_saldo' } = params

  if (numeroCuotas <= 0 || montoBase <= 0) {
    return {
      cuotaFija: 0,
      interesesTotales: 0,
      montoTotal: montoBase,
      cargoManejo: 0,
      montoBase,
      capitalAmortizado: montoBase,
    }
  }

  const cargoManejo = round2((montoBase * PORCENTAJE_CARGO_MANEJO) / 100)
  const capitalAmortizado = round2(montoBase + cargoManejo)
  const n = numeroCuotas

  let cuotaFija: number
  let interesesTotales: number

  if (metodoInteres === 'fijo') {
    // Interés lineal: Total = Capital * (tasa/100) * n
    const i = getTasaPeriodicaDirecta(tasaAnual)
    interesesTotales = round2(capitalAmortizado * i * n)
    const montoTotal = round2(capitalAmortizado + interesesTotales)
    cuotaFija = round2(montoTotal / n)
    return {
      cuotaFija,
      interesesTotales,
      montoTotal,
      cargoManejo,
      montoBase,
      capitalAmortizado,
    }
  }

  // Sobre saldo: tasa por período (10% mensual = 0.10)
  const i = getTasaPeriodicaDirecta(tasaAnual)

  if (i === 0) {
    cuotaFija = round2(capitalAmortizado / n)
    interesesTotales = 0
  } else {
    const factor = Math.pow(1 + i, n)
    cuotaFija = round2((capitalAmortizado * i * factor) / (factor - 1))
    const totalPagado = cuotaFija * n
    interesesTotales = round2(totalPagado - capitalAmortizado)
  }

  const montoTotal = round2(capitalAmortizado + interesesTotales)

  return {
    cuotaFija,
    interesesTotales,
    montoTotal,
    cargoManejo,
    montoBase,
    capitalAmortizado,
  }
}

/**
 * Calcula el interés proporcional al tiempo usando Tasa Mensual.
 * Fórmula: Interés Total = Capital * (Tasa/100) * Cantidad de Meses
 * Ejemplo: RD$10,000 al 10% por 1 mes = RD$1,000. Por 2 meses = RD$2,000.
 *
 * @param capital Monto del préstamo (precio base)
 * @param tasaMensual Tasa de interés mensual en % (ej: 10 = 10% al mes)
 * @param mesesEquivalentes Cantidad de meses (días/30 para préstamos por días)
 */
export function calcularInteresProporcionalMensual(
  capital: number,
  tasaMensual: number,
  mesesEquivalentes: number
): {
  interesTotal: number
  montoTotal: number
  cuotaFija: number
} {
  const interesTotal = capital * (tasaMensual / 100) * mesesEquivalentes
  const montoTotal = capital + interesTotal
  const cuotaFija = mesesEquivalentes > 0 ? montoTotal / mesesEquivalentes : 0
  return {
    interesTotal: Math.round(interesTotal * 100) / 100,
    montoTotal: Math.round(montoTotal * 100) / 100,
    cuotaFija: Math.round(cuotaFija * 100) / 100,
  }
}

/**
 * Convierte el plazo a meses equivalentes para aplicar la tasa mensual.
 * - Diario: días / 30
 * - Semanal: semanas / 4.33 (aprox 4.33 semanas/mes)
 * - Quincenal: quincenas / 2 (2 quincenas/mes)
 * - Mensual: meses directos
 */
export function convertirPlazoAMesesEquivalentes(
  tipoPlazo: 'diario' | 'semanal' | 'quincenal' | 'mensual',
  cantidad: number
): number {
  switch (tipoPlazo) {
    case 'diario':
      return cantidad / 30
    case 'semanal':
      return cantidad / 4.33
    case 'quincenal':
      return cantidad / 2
    case 'mensual':
    default:
      return cantidad
  }
}

/**
 * Calcula el monto total con interés basado en el plazo de financiamiento
 * @param precioBase Precio base del motor
 * @param plazoMeses Plazo de financiamiento en meses
 * @returns Objeto con el monto total, interés aplicado y detalles
 */
export function calcularMontoConInteres(
  precioBase: number,
  plazoMeses: number
): {
  montoTotal: number
  interesAplicado: number
  porcentajeInteres: number
  tipoInteres: 'descuento' | 'interes'
  precioBase: number
} {
  const config = obtenerConfiguracionInteres(plazoMeses)
  
  // Calcular el monto del interés/descuento
  const montoInteres = (precioBase * Math.abs(config.porcentajeInteres)) / 100
  
  // Aplicar interés o descuento
  let montoTotal: number
  if (config.tipo === 'descuento') {
    // Descuento: reducir el precio
    montoTotal = precioBase - montoInteres
  } else {
    // Interés: aumentar el precio
    montoTotal = precioBase + montoInteres
  }
  
  return {
    montoTotal: Math.round(montoTotal * 100) / 100, // Redondear a 2 decimales
    interesAplicado: montoInteres,
    porcentajeInteres: config.porcentajeInteres,
    tipoInteres: config.tipo,
    precioBase,
  }
}

/**
 * Obtiene todas las configuraciones de interés disponibles
 */
export function obtenerConfiguracionesInteres(): ConfiguracionInteres[] {
  return CONFIGURACION_INTERESES
}

/**
 * Formatea el plazo en meses a texto legible
 */
export function formatearPlazo(plazoMeses: number): string {
  if (plazoMeses < 12) {
    return `${plazoMeses} ${plazoMeses === 1 ? 'mes' : 'meses'}`
  }
  
  const anos = Math.floor(plazoMeses / 12)
  const meses = plazoMeses % 12
  
  if (meses === 0) {
    return `${anos} ${anos === 1 ? 'año' : 'años'}`
  }
  
  return `${anos} ${anos === 1 ? 'año' : 'años'} y ${meses} ${meses === 1 ? 'mes' : 'meses'}`
}

