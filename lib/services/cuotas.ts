import { ventasService } from './ventas'
import { pagosService } from './pagos'
import { calcularFechaVencimiento, calcularDiasAtraso } from './mora'
import { calcularFechaVencimientoCuota } from './proximoVencimiento'
import type { Venta, Pago, Cliente, Motor } from '@/types'
import { supabase } from '@/lib/supabase'

export interface CuotaPendiente {
  id: string // ID único para la fila (venta_id + numero_cuota)
  venta_id: string
  cliente: Cliente
  telefono: string // Teléfono del cliente (extraer de dirección o usar campo separado)
  motor: Motor
  numeroCuota: number
  cuotaBase: number
  fechaVencimiento: Date
  penalidad: number
  totalAPagar: number
  diasAtraso: number
  estado: 'vencida' | 'por_vencer' | 'vigente'
}

// Configuración de penalidad: 3.7% fijo por cuota vencida (no acumulativo)
const PORCENTAJE_PENALIDAD_POR_CUOTA = 0.037 // 3.7%
const DIAS_ALERTA = 3 // Días antes del vencimiento para mostrar alerta amarilla

/**
 * Calcula la penalidad basada en cuotas vencidas
 * Nuevo sistema: 3.7% fijo por cada cuota vencida (no acumulativo por días)
 */
function calcularPenalidad(cuotaBase: number, diasAtraso: number): number {
  // Si no está vencida, no hay penalidad
  if (diasAtraso <= 0) return 0
  
  // Aplicar 3.7% fijo por cuota vencida
  return cuotaBase * PORCENTAJE_PENALIDAD_POR_CUOTA
}

/**
 * Obtiene el teléfono del cliente desde el campo celular o intenta extraerlo de la dirección
 */
function obtenerTelefonoCliente(cliente: Cliente): string {
  // Priorizar el campo celular si existe
  if (cliente.celular && cliente.celular.trim() !== '') {
    return cliente.celular.trim()
  }
  
  // Intentar extraer teléfono de la dirección (si está en formato común)
  const direccion = cliente.direccion || ''
  
  // Buscar patrones de teléfono en la dirección
  const patronTelefono = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/
  const match = direccion.match(patronTelefono)
  
  if (match) {
    return match[0]
  }
  
  // Si no se encuentra, usar N/A
  return 'N/A'
}

/**
 * Obtiene todas las cuotas pendientes de todas las ventas
 */
export async function obtenerCuotasPendientes(): Promise<CuotaPendiente[]> {
  const ventas = await ventasService.getAll()
  // Filtrar solo ventas con saldo pendiente antes de procesar
  const ventasConSaldo = ventas.filter(v => v.saldo_pendiente > 0 && v.cliente && v.motor)
  
  // Limitar a las primeras 200 ventas para mejorar rendimiento
  const ventasLimitadas = ventasConSaldo.slice(0, 200)
  
  const cuotasPendientes: CuotaPendiente[] = []
  const fechaActual = new Date()

  const cuotasDetalladasPorVenta = new Map<string, Array<{
    venta_id: string
    numero_cuota: number
    cuota_fija: number
    fecha_pago?: string | null
  }>>()

  if (ventasLimitadas.length > 0) {
    const ventaIds = ventasLimitadas.map((venta) => venta.id)
    const { data: cuotasDetalladas } = await supabase
      .from('cuotas_detalladas')
      .select('venta_id, numero_cuota, cuota_fija, fecha_pago')
      .in('venta_id', ventaIds)
      .order('numero_cuota', { ascending: true }) as { data: { venta_id: string; numero_cuota: number; cuota_fija: number; fecha_pago?: string | null }[] | null }
    ;(cuotasDetalladas || []).forEach((cuota) => {
      const lista = cuotasDetalladasPorVenta.get(cuota.venta_id) || []
      lista.push(cuota)
      cuotasDetalladasPorVenta.set(cuota.venta_id, lista)
    })
  }
  
  for (const venta of ventasLimitadas) {
    // Solo procesar ventas con saldo pendiente
    if (venta.saldo_pendiente <= 0 || !venta.cliente || !venta.motor) {
      continue
    }
    
    // Obtener pagos de esta venta (limitar para mejorar rendimiento)
    const pagos = await pagosService.getByVenta(venta.id, 100)
    const fechaVenta = new Date(venta.fecha_venta)
    
    // Calcular cuántas cuotas únicas ya están pagadas (usando numero_cuota)
    // Esto es importante porque un pago puede ser mayor a una cuota
    const cuotasPagadasSet = new Set(
      pagos
        .map(p => p.numero_cuota)
        .filter((n): n is number => n !== null && n !== undefined)
    )
    const cuotasPagadas = cuotasPagadasSet.size
    
    // Calcular cuántas cuotas quedan pendientes (fallback)
    const numeroCuotasPendientes = Math.max(0, venta.cantidad_cuotas - cuotasPagadas)
    
    // Calcular el valor de cuota actual basándose en el saldo pendiente REAL (fallback)
    const montoPorCuotaFallback = numeroCuotasPendientes > 0 
      ? Math.round((venta.saldo_pendiente / numeroCuotasPendientes) * 100) / 100
      : 0

    const cuotasDetalladas = cuotasDetalladasPorVenta.get(venta.id) || []
    const cuotasParaEvaluar = cuotasDetalladas.length > 0
      ? cuotasDetalladas.map((cuota) => ({
          numeroCuota: cuota.numero_cuota,
          cuotaBase: Number(cuota.cuota_fija || 0) || montoPorCuotaFallback,
          fechaPago: cuota.fecha_pago ? new Date(cuota.fecha_pago) : null,
        }))
      : Array.from({ length: venta.cantidad_cuotas }, (_, index) => ({
          numeroCuota: index + 1,
          cuotaBase: montoPorCuotaFallback,
          fechaPago: null,
        }))
    
    for (const cuotaInfo of cuotasParaEvaluar) {
      const pagoCuota = pagos.find(p => p.numero_cuota === cuotaInfo.numeroCuota)
      if (pagoCuota) continue
      
      const fechaVencimiento = cuotaInfo.fechaPago
        ? cuotaInfo.fechaPago
        : (venta.tipo_plazo
            ? calcularFechaVencimientoCuota(venta, cuotaInfo.numeroCuota)
            : calcularFechaVencimiento(fechaVenta, cuotaInfo.numeroCuota, venta.cantidad_cuotas))
      const diasAtraso = calcularDiasAtraso(fechaVencimiento, fechaActual)
      const penalidad = diasAtraso > 0 ? calcularPenalidad(cuotaInfo.cuotaBase, diasAtraso) : 0
      const totalAPagar = cuotaInfo.cuotaBase + penalidad
      
      let estado: 'vencida' | 'por_vencer' | 'vigente'
      if (diasAtraso > 0) {
        estado = 'vencida'
      } else if (diasAtraso >= -DIAS_ALERTA && diasAtraso < 0) {
        estado = 'por_vencer'
      } else {
        estado = 'vigente'
      }
      
      if (estado === 'vencida' || estado === 'por_vencer') {
        cuotasPendientes.push({
          id: `${venta.id}-${cuotaInfo.numeroCuota}`,
          venta_id: venta.id,
          cliente: venta.cliente,
          telefono: obtenerTelefonoCliente(venta.cliente),
          motor: venta.motor,
          numeroCuota: cuotaInfo.numeroCuota,
          cuotaBase: cuotaInfo.cuotaBase,
          fechaVencimiento,
          penalidad,
          totalAPagar,
          diasAtraso: Math.max(0, diasAtraso),
          estado,
        })
      }
    }
  }
  
  // Ordenar por fecha de vencimiento (las más vencidas primero)
  return cuotasPendientes.sort((a, b) => {
    if (a.estado === 'vencida' && b.estado !== 'vencida') return -1
    if (a.estado !== 'vencida' && b.estado === 'vencida') return 1
    return a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime()
  })
}

