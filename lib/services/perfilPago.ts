/**
 * Servicio para calcular el Perfil de Pago de un cliente.
 * Usado en el Expediente Digital (carpeta) para mostrar calificación por estrellas,
 * veces pagado con mora y total en recargos.
 */

import { supabase } from '../supabase'
import { ventasService } from './ventas'

/** Días de gracia: pagos dentro de este rango no cuentan como "con mora" */
const DIAS_GRACIA = 0

/** Penalización por días de retraso (para calcular estrellas) */
function penalizacionPorDiasRetraso(diasRetraso: number): number {
  if (diasRetraso <= DIAS_GRACIA) return 0
  if (diasRetraso <= 7) return 0.25
  if (diasRetraso <= 15) return 0.5
  if (diasRetraso <= 30) return 1
  return 1.5
}

export interface PerfilPagoResult {
  estrellas: number
  vecesPagadoConMora: number
  totalPagadoEnRecargos: number
  esAltoRiesgo: boolean
  detallePorVenta?: Array<{
    ventaId: string
    vecesMora: number
    moraAbonada: number
  }>
}

/**
 * Obtiene el perfil de pago de un cliente para mostrar en su expediente.
 * Calcula: estrellas (1-5), veces pagado con mora, total en recargos.
 */
export async function getPerfilPagoCliente(clienteId: string): Promise<PerfilPagoResult> {
  const ventas = await ventasService.getByCliente(clienteId)
  if (!ventas || ventas.length === 0) {
    return {
      estrellas: 5,
      vecesPagadoConMora: 0,
      totalPagadoEnRecargos: 0,
      esAltoRiesgo: false,
    }
  }

  const ventaIds = ventas.map((v) => v.id)

  const [cuotasRes, pagosRes] = await Promise.all([
    supabase
      .from('cuotas_detalladas')
      .select('venta_id, numero_cuota, fecha_pago')
      .in('venta_id', ventaIds)
      .order('numero_cuota', { ascending: true }),
    supabase
      .from('pagos')
      .select('venta_id, numero_cuota, fecha_pago, fecha_hora')
      .in('venta_id', ventaIds)
      .not('numero_cuota', 'is', null),
  ]) as unknown as [
    { data: { venta_id: string; numero_cuota: number; fecha_pago: string }[] | null },
    { data: { venta_id: string; numero_cuota?: number | null; fecha_pago?: string; fecha_hora?: string }[] | null },
  ]

  const cuotasPorVenta = new Map<string, Array<{ numero_cuota: number; fecha_pago: string }>>()
  for (const c of cuotasRes.data || []) {
    if (!cuotasPorVenta.has(c.venta_id)) cuotasPorVenta.set(c.venta_id, [])
    cuotasPorVenta.get(c.venta_id)!.push({
      numero_cuota: c.numero_cuota,
      fecha_pago: c.fecha_pago,
    })
  }

  let vecesPagadoConMora = 0
  let penalizacionTotal = 0
  const detallePorVenta: PerfilPagoResult['detallePorVenta'] = []

  for (const venta of ventas) {
    const cuotas = cuotasPorVenta.get(venta.id) || []
    const pagosVenta = (pagosRes.data || []).filter((p: any) => p.venta_id === venta.id)
    let vecesMoraVenta = 0

    for (const pago of pagosVenta) {
      const numeroCuota = pago.numero_cuota
      if (numeroCuota == null) continue

      const cuota = cuotas.find((c) => c.numero_cuota === numeroCuota)
      const fechaVencimiento = cuota?.fecha_pago
        ? new Date(cuota.fecha_pago)
        : null

      if (!fechaVencimiento) continue

      const fechaPagoReal = new Date(pago.fecha_hora || pago.fecha_pago || 0)
      fechaVencimiento.setHours(0, 0, 0, 0)
      fechaPagoReal.setHours(0, 0, 0, 0)

      const diffMs = fechaPagoReal.getTime() - fechaVencimiento.getTime()
      const diasRetraso = Math.ceil(diffMs / (24 * 60 * 60 * 1000))

      if (diasRetraso > DIAS_GRACIA) {
        vecesPagadoConMora++
        vecesMoraVenta++
        penalizacionTotal += penalizacionPorDiasRetraso(diasRetraso)
      }
    }

    const moraAbonada = Number((venta as any).mora_abonada ?? 0)
    if (vecesMoraVenta > 0 || moraAbonada > 0) {
      detallePorVenta?.push({
        ventaId: venta.id,
        vecesMora: vecesMoraVenta,
        moraAbonada,
      })
    }
  }

  const totalPagadoEnRecargos = ventas.reduce(
    (sum, v) => sum + Number((v as any).mora_abonada ?? 0),
    0
  )

  let estrellas = Math.max(1, Math.min(5, 5 - penalizacionTotal))
  estrellas = Math.round(estrellas * 2) / 2

  const esAltoRiesgo = vecesPagadoConMora > 3

  return {
    estrellas,
    vecesPagadoConMora,
    totalPagadoEnRecargos,
    esAltoRiesgo,
    detallePorVenta,
  }
}
