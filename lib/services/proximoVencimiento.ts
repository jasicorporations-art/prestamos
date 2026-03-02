import { supabase } from '@/lib/supabase'
import { ventasService } from './ventas'
import { pagosService } from './pagos'
import { ajustarFechaSiDomingo } from './amortizacion'
import type { Venta } from '@/types'

export interface VentaMinimaParaVencimiento {
  id: string
  sucursal_id?: string
  fecha_venta: string
  tipo_plazo?: 'diario' | 'semanal' | 'quincenal' | 'mensual'
  dia_pago_mensual?: number
  dia_pago_semanal?: number
  fecha_inicio_quincenal?: string
  cantidad_cuotas: number
}

export interface ProximoVencimientoResult {
  fecha: Date | null
  numeroCuota: number | null
  cuotaFija?: number
}

/**
 * Suma N meses a una fecha respetando el día del mes (y último día si aplica).
 */
function addMonthsLocal(date: Date, months: number, diaFijo?: number): Date {
  const result = new Date(date)
  const day = diaFijo ?? result.getDate()
  result.setMonth(result.getMonth() + months)
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(day, lastDay))
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Calcula la fecha de vencimiento de una cuota según el tipo de plazo de la venta.
 * Regla de negocio: cuota 1 = primer vencimiento, cuota 2 = segundo, etc.
 */
export function calcularFechaVencimientoCuota(
  venta: Pick<Venta, 'fecha_venta' | 'tipo_plazo' | 'dia_pago_mensual' | 'dia_pago_semanal' | 'fecha_inicio_quincenal'>,
  numeroCuota: number
): Date {
  const fechaInicio = new Date(venta.fecha_venta)
  fechaInicio.setHours(0, 0, 0, 0)
  const tipo = venta.tipo_plazo || 'mensual'

  switch (tipo) {
    case 'diario': {
      const f = new Date(fechaInicio)
      f.setDate(f.getDate() + numeroCuota)
      return f
    }
    case 'semanal': {
      const f = new Date(fechaInicio)
      const diaSemana = venta.dia_pago_semanal ?? 0
      const diaActual = f.getDay()
      let diasHastaPrimero = (diaSemana - diaActual + 7) % 7
      if (diasHastaPrimero === 0) diasHastaPrimero = 7
      f.setDate(f.getDate() + diasHastaPrimero + (numeroCuota - 1) * 7)
      return f
    }
    case 'quincenal': {
      const f = venta.fecha_inicio_quincenal
        ? new Date(venta.fecha_inicio_quincenal)
        : new Date(fechaInicio)
      f.setHours(0, 0, 0, 0)
      const offset = venta.fecha_inicio_quincenal ? (numeroCuota - 1) * 15 : numeroCuota * 15
      f.setDate(f.getDate() + offset)
      return f
    }
    case 'mensual':
    default: {
      const diaPago = venta.dia_pago_mensual
      return addMonthsLocal(fechaInicio, numeroCuota, diaPago ?? undefined)
    }
  }
}

/**
 * Suma N periodos a una fecha según tipo_plazo (para "próximo vencimiento después de pagar N cuotas").
 */
export function sumarPeriodosAVencimiento(
  fechaVencimientoActual: Date,
  cantidadPeriodos: number,
  venta: Pick<Venta, 'tipo_plazo' | 'dia_pago_mensual'>
): Date {
  const tipo = venta.tipo_plazo || 'mensual'
  const f = new Date(fechaVencimientoActual)

  switch (tipo) {
    case 'diario':
      f.setDate(f.getDate() + cantidadPeriodos)
      return f
    case 'semanal':
      f.setDate(f.getDate() + cantidadPeriodos * 7)
      return f
    case 'quincenal':
      f.setDate(f.getDate() + cantidadPeriodos * 15)
      return f
    case 'mensual':
    default:
      return addMonthsLocal(f, cantidadPeriodos, venta.dia_pago_mensual ?? undefined)
  }
}

/**
 * Obtiene la fecha del próximo vencimiento y el número de la próxima cuota a pagar.
 * Si el cliente paga N cuotas juntas, el próximo vencimiento es la fecha de la (siguiente + N) cuota.
 * Esta función devuelve el próximo vencimiento ACTUAL (primera cuota no pagada).
 */
export async function getProximoVencimiento(ventaId: string): Promise<ProximoVencimientoResult> {
  const venta = await ventasService.getById(ventaId)
  if (!venta || venta.saldo_pendiente <= 0) {
    return { fecha: null, numeroCuota: null }
  }

  const pagos = await pagosService.getByVenta(ventaId)
  const cuotasPagadasSet = new Set(
    pagos
      .map(p => p.numero_cuota)
      .filter((n): n is number => n !== null && n !== undefined)
  )

  const { data: cuotasDetalladas } = await supabase
    .from('cuotas_detalladas')
    .select('numero_cuota, fecha_pago')
    .eq('venta_id', ventaId)
    .order('numero_cuota', { ascending: true }) as { data: { numero_cuota: number; fecha_pago?: string }[] | null }

  if (cuotasDetalladas && cuotasDetalladas.length > 0) {
    const primeraPendiente = cuotasDetalladas.find(c => !cuotasPagadasSet.has(c.numero_cuota))
    if (primeraPendiente) {
      const fecha = new Date(primeraPendiente.fecha_pago || 0)
      fecha.setHours(0, 0, 0, 0)
      return { fecha, numeroCuota: primeraPendiente.numero_cuota }
    }
    return { fecha: null, numeroCuota: null }
  }

  for (let n = 1; n <= venta.cantidad_cuotas; n++) {
    if (!cuotasPagadasSet.has(n)) {
      const fecha = calcularFechaVencimientoCuota(venta, n)
      return { fecha, numeroCuota: n }
    }
  }

  return { fecha: null, numeroCuota: null }
}

/**
 * Obtiene próximos vencimientos para múltiples ventas en una sola consulta (batch).
 */
export async function getProximosVencimientosBatch(
  ventas: VentaMinimaParaVencimiento[]
): Promise<Map<string, ProximoVencimientoResult>> {
  const result = new Map<string, ProximoVencimientoResult>()
  if (ventas.length === 0) return result

  const ventaIds = ventas.map((v) => v.id)
  const sucursalIds = [...new Set(ventas.map((v) => v.sucursal_id).filter(Boolean))] as string[]
  const cobrarDomingosMap = new Map<string, boolean>()
  if (sucursalIds.length > 0) {
    const { data: sucursales } = await supabase.from('sucursales').select('id, cobrar_domingos').in('id', sucursalIds) as { data: { id: string; cobrar_domingos?: boolean }[] | null }
    ;(sucursales || []).forEach((s: { id: string; cobrar_domingos?: boolean }) => {
      cobrarDomingosMap.set(s.id, !!s.cobrar_domingos)
    })
  }

  const [cuotasRes, pagosRes] = await Promise.all([
    supabase
      .from('cuotas_detalladas')
      .select('venta_id, numero_cuota, fecha_pago, cuota_fija')
      .in('venta_id', ventaIds)
      .order('numero_cuota', { ascending: true }),
    supabase
      .from('pagos')
      .select('venta_id, numero_cuota')
      .in('venta_id', ventaIds)
      .not('numero_cuota', 'is', null),
  ]) as unknown as [
    { data: { venta_id: string; numero_cuota: number; fecha_pago?: string; cuota_fija?: number }[] | null },
    { data: { venta_id: string; numero_cuota?: number | null }[] | null },
  ]

  const cuotasPorVenta = new Map<string, Array<{ numero_cuota: number; fecha_pago: string; cuota_fija?: number }>>()
  for (const c of cuotasRes.data || []) {
    if (!cuotasPorVenta.has(c.venta_id)) {
      cuotasPorVenta.set(c.venta_id, [])
    }
    cuotasPorVenta.get(c.venta_id)!.push({
      numero_cuota: c.numero_cuota,
      fecha_pago: c.fecha_pago ?? '',
      cuota_fija: c.cuota_fija != null ? Number(c.cuota_fija) : undefined,
    })
  }

  const pagosPorVenta = new Map<string, Set<number>>()
  for (const p of pagosRes.data || []) {
    if (!pagosPorVenta.has(p.venta_id)) {
      pagosPorVenta.set(p.venta_id, new Set())
    }
    if (p.numero_cuota != null) pagosPorVenta.get(p.venta_id)!.add(p.numero_cuota)
  }

  for (const venta of ventas) {
    const cuotasPagadas = pagosPorVenta.get(venta.id) ?? new Set()
    const cuotas = cuotasPorVenta.get(venta.id)

    if (cuotas && cuotas.length > 0) {
      const primeraPendiente = cuotas.find((c) => !cuotasPagadas.has(c.numero_cuota))
      if (primeraPendiente) {
        const fecha = new Date(primeraPendiente.fecha_pago)
        fecha.setHours(0, 0, 0, 0)
        result.set(venta.id, {
          fecha,
          numeroCuota: primeraPendiente.numero_cuota,
          cuotaFija: primeraPendiente.cuota_fija,
        })
      } else {
        result.set(venta.id, { fecha: null, numeroCuota: null })
      }
    } else {
      let found = false
      const cobrarDomingos = venta.sucursal_id ? (cobrarDomingosMap.get(venta.sucursal_id) ?? false) : true
      const ventaConSaldo = venta as VentaMinimaParaVencimiento & { saldo_pendiente?: number }
      const saldo = ventaConSaldo.saldo_pendiente ?? 0
      const cuotasRestantes = (venta.cantidad_cuotas || 0) - cuotasPagadas.size
      const cuotaFijaEstimada = cuotasRestantes > 0 ? saldo / cuotasRestantes : 0
      for (let n = 1; n <= (venta.cantidad_cuotas || 0); n++) {
        if (!cuotasPagadas.has(n)) {
          let fecha = calcularFechaVencimientoCuota(venta, n)
          fecha = ajustarFechaSiDomingo(fecha, cobrarDomingos)
          result.set(venta.id, { fecha, numeroCuota: n, cuotaFija: cuotaFijaEstimada || undefined })
          found = true
          break
        }
      }
      if (!found) result.set(venta.id, { fecha: null, numeroCuota: null })
    }
  }

  return result
}

/**
 * Calcula cuál será el próximo vencimiento si el cliente paga N cuotas ahora.
 * Regla de negocio: si paga en Mayo 3 cuotas, el próximo vencimiento = fecha actual + 3 periodos (ej. 5 Ago).
 */
export async function getProximoVencimientoDespuesDePagar(
  ventaId: string,
  cantidadCuotasAPagar: number
): Promise<ProximoVencimientoResult | null> {
  if (cantidadCuotasAPagar <= 0) return getProximoVencimiento(ventaId)

  const actual = await getProximoVencimiento(ventaId)
  if (!actual.fecha || actual.numeroCuota === null) return actual

  const venta = await ventasService.getById(ventaId)
  if (!venta) return actual

  const nuevaFecha = sumarPeriodosAVencimiento(actual.fecha, cantidadCuotasAPagar, venta)
  const nuevoNumeroCuota = actual.numeroCuota + cantidadCuotasAPagar
  const maxCuota = venta.cantidad_cuotas || 0
  if (nuevoNumeroCuota > maxCuota) {
    return { fecha: null, numeroCuota: null }
  }
  return { fecha: nuevaFecha, numeroCuota: nuevoNumeroCuota }
}
