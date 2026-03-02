import { supabase } from '../supabase'
import { ventasService } from './ventas'
import { pagosService } from './pagos'
import { calcularFechaVencimientoCuota } from './proximoVencimiento'
import type { Venta, Pago } from '@/types'

export interface CargoMora {
  venta_id: string
  diasAtraso: number
  montoCargo: number
  cuotaVencida: number
  fechaVencimiento: Date
}

export interface ConfiguracionMora {
  porcentajeMora: number // Porcentaje fijo por cuota vencida (ej: 3.7 = 3.7% por cuota)
  diasGracia: number // Días antes de aplicar el cargo (0 = aplicar inmediatamente si está vencida)
  montoMinimo: number // Cargo mínimo (no se usa con porcentaje fijo, pero se mantiene para compatibilidad)
}

// Configuración por defecto (puede ser configurable)
export const CONFIG_MORA: ConfiguracionMora = {
  porcentajeMora: 3.7, // 3.7% fijo por cada cuota vencida
  diasGracia: 0, // Sin días de gracia - aplicar si la fecha de vencimiento ya pasó
  montoMinimo: 0, // No se usa con porcentaje fijo
}

/**
 * Calcula la fecha de vencimiento de una cuota basándose en la fecha de venta
 */
export function calcularFechaVencimiento(
  fechaVenta: Date,
  numeroCuota: number,
  cantidadCuotas: number
): Date {
  // Calcular el monto por cuota
  // Asumimos que las cuotas son mensuales
  const fecha = new Date(fechaVenta)
  fecha.setMonth(fecha.getMonth() + numeroCuota)
  return fecha
}

/**
 * Calcula los días de atraso de una cuota
 */
export function calcularDiasAtraso(fechaVencimiento: Date, fechaActual: Date = new Date()): number {
  const diffTime = fechaActual.getTime() - fechaVencimiento.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

/**
 * Calcula el cargo por mora para una cuota vencida
 * Nuevo sistema: 3.7% fijo por cada cuota vencida (no acumulativo por días)
 */
export function calcularCargoMora(
  montoCuota: number,
  diasAtraso: number,
  config: ConfiguracionMora = CONFIG_MORA
): number {
  // Si no está vencida (diasAtraso <= 0) o está dentro del período de gracia, no hay cargo
  if (diasAtraso <= config.diasGracia) {
    return 0
  }

  // Calcular cargo fijo: 3.7% del monto de la cuota
  const cargoTotal = (montoCuota * config.porcentajeMora) / 100

  return cargoTotal
}

/**
 * Obtiene todas las cuotas vencidas con sus cargos por mora
 * Nota: Usa el valor actual de cuota (basado en saldo pendiente) para calcular el cargo
 */
export async function obtenerCargosMora(ventaId: string): Promise<CargoMora[]> {
  const venta = await ventasService.getById(ventaId)
  if (!venta) return []

  const pagos = await pagosService.getByVenta(ventaId)
  const fechaVenta = new Date(venta.fecha_venta)
  const cargos: CargoMora[] = []

  // Calcular cuántas cuotas ya están pagadas
  const cuotasPagadasSet = new Set(
    pagos
      .map(p => p.numero_cuota)
      .filter((n): n is number => n !== null && n !== undefined)
  )
  const cuotasPagadas = cuotasPagadasSet.size
  
  // Calcular el valor actual de cuota basándose en el saldo pendiente REAL
  const numeroCuotasPendientes = Math.max(0, venta.cantidad_cuotas - cuotasPagadas)
  const montoPorCuota = numeroCuotasPendientes > 0 
    ? Math.round((venta.saldo_pendiente / numeroCuotasPendientes) * 100) / 100
    : 0

  // Verificar cada cuota esperada (usar tipo_plazo si existe para consistencia con próximo vencimiento)
  for (let numeroCuota = 1; numeroCuota <= venta.cantidad_cuotas; numeroCuota++) {
    const fechaVencimiento = venta.tipo_plazo
      ? calcularFechaVencimientoCuota(venta, numeroCuota)
      : calcularFechaVencimiento(fechaVenta, numeroCuota, venta.cantidad_cuotas)
    const pagoCuota = pagos.find(p => p.numero_cuota === numeroCuota)

    // Si la cuota no está pagada y está vencida
    if (!pagoCuota) {
      const diasAtraso = calcularDiasAtraso(fechaVencimiento)
      
      // Si está vencida (diasAtraso > 0), aplicar cargo
      if (diasAtraso > CONFIG_MORA.diasGracia) {
        const montoCargo = calcularCargoMora(montoPorCuota, diasAtraso)
        
        cargos.push({
          venta_id: ventaId,
          diasAtraso,
          montoCargo,
          cuotaVencida: numeroCuota,
          fechaVencimiento,
        })
      }
    }
  }

  return cargos
}

/**
 * Calcula el total de cargos por mora pendientes para una venta.
 * Mora: 3.7% fijo por cada cuota vencida (no acumulativo por días).
 */
export async function calcularTotalCargosMora(ventaId: string): Promise<number> {
  const cargos = await obtenerCargosMora(ventaId)
  const totalCargos = cargos.reduce((total, cargo) => total + cargo.montoCargo, 0)
  return Math.round(totalCargos * 100) / 100
}

/**
 * Resultado para la UI de cobros: Cuota del Día vs Total para Ponerse al Día
 */
export interface OpcionesCobro {
  /** Cantidad de cuotas vencidas (diferencia en días/semanas/meses según tipo_plazo) */
  cuotasVencidas: number
  /** Monto atrasado = cuotasVencidas × valor por cuota */
  montoAtrasado: number
  /** Suma de cargos por mora de todas las cuotas vencidas */
  totalMoras: number
  /** Apartado A: 1 cuota + moras totales */
  cuotaDelDia: number
  /** Apartado B: monto atrasado + moras (recomendado cuando hay atraso) */
  totalParaPonerseAlDia: number
  /** Valor de una cuota (para mostrar) */
  valorCuota: number
  /** Si hay atraso: pagar solo Cuota del Día deja al cliente en mora → requiere autorización admin */
  requiereAutorizacionSiSoloCuotaDelDia: boolean
}

/**
 * Calcula Cuota del Día (A) y Total para Ponerse al Día (B) según la lógica:
 * - Cuotas_Vencidas = cantidad de cuotas no pagadas con fecha_vencimiento <= hoy
 * - Monto_Atrasado = suma de valores de cuotas vencidas (o cuotasVencidas × valorCuota si no hay detalle)
 * - Total_Exigible = Monto_Atrasado + Total_Moras
 */
export async function calcularOpcionesCobro(ventaId: string): Promise<OpcionesCobro> {
  const venta = await ventasService.getById(ventaId)
  if (!venta || venta.saldo_pendiente <= 0) {
    return {
      cuotasVencidas: 0,
      montoAtrasado: 0,
      totalMoras: 0,
      cuotaDelDia: 0,
      totalParaPonerseAlDia: 0,
      valorCuota: 0,
      requiereAutorizacionSiSoloCuotaDelDia: false,
    }
  }

  const cargos = await obtenerCargosMora(ventaId)
  const totalMoras = cargos.reduce((sum, c) => sum + c.montoCargo, 0)
  const cuotasVencidas = cargos.length

  const pagos = await pagosService.getByVenta(ventaId)
  const cuotasPagadasSet = new Set(
    pagos.map((p) => p.numero_cuota).filter((n): n is number => n !== null && n !== undefined)
  )
  const numeroCuotasPendientes = Math.max(0, (venta.cantidad_cuotas || 0) - cuotasPagadasSet.size)
  const valorCuotaFlat =
    numeroCuotasPendientes > 0
      ? Math.round((venta.saldo_pendiente / numeroCuotasPendientes) * 100) / 100
      : venta.saldo_pendiente

  const { data: cuotasDetalladas } = await supabase
    .from('cuotas_detalladas')
    .select('numero_cuota, cuota_fija')
    .eq('venta_id', ventaId)
    .order('numero_cuota', { ascending: true }) as { data: { numero_cuota: number; cuota_fija?: number }[] | null }

  let montoAtrasado: number
  let valorCuota = valorCuotaFlat
  if (cuotasDetalladas && cuotasDetalladas.length > 0 && cargos.length > 0) {
    const cuotaFijaMap = new Map(
      cuotasDetalladas.map((c) => [c.numero_cuota, Number(c.cuota_fija || 0)])
    )
    montoAtrasado = cargos.reduce((sum, cargo) => {
      const cuotaFija = cuotaFijaMap.get(cargo.cuotaVencida)
      return sum + (cuotaFija ?? valorCuotaFlat)
    }, 0)
    if (cargos.length > 0) {
      const primeraPendiente = cuotasDetalladas.find((c) => !cuotasPagadasSet.has(c.numero_cuota))
      if (primeraPendiente) {
        valorCuota = Number(primeraPendiente.cuota_fija || 0) || valorCuotaFlat
      }
    }
  } else {
    montoAtrasado = cuotasVencidas * valorCuotaFlat
  }

  montoAtrasado = Math.round(montoAtrasado * 100) / 100
  const totalParaPonerseAlDia =
    cuotasVencidas > 0
      ? Math.round((montoAtrasado + totalMoras) * 100) / 100
      : Math.round(valorCuota * 100) / 100
  const cuotaDelDia =
    cuotasVencidas > 0
      ? Math.round((valorCuota + totalMoras) * 100) / 100
      : Math.round(valorCuota * 100) / 100

  return {
    cuotasVencidas,
    montoAtrasado,
    totalMoras,
    cuotaDelDia,
    totalParaPonerseAlDia,
    valorCuota,
    requiereAutorizacionSiSoloCuotaDelDia: cuotasVencidas > 1,
  }
}

/**
 * Obtiene todas las ventas con pagos atrasados
 */
export async function obtenerVentasConMora(): Promise<Array<{ venta: Venta; cargos: CargoMora[]; totalCargos: number }>> {
  const ventas = await ventasService.getAll()
  const ventasConMora: Array<{ venta: Venta; cargos: CargoMora[]; totalCargos: number }> = []

  for (const venta of ventas) {
    if (venta.saldo_pendiente > 0) {
      const cargos = await obtenerCargosMora(venta.id)
      if (cargos.length > 0) {
        const totalCargos = cargos.reduce((sum, cargo) => sum + cargo.montoCargo, 0)
        ventasConMora.push({ venta, cargos, totalCargos })
      }
    }
  }

  return ventasConMora
}









