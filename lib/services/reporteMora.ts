/**
 * Servicio para generar reportes de mora y análisis de riesgo
 */

import { supabase } from '../supabase'
import { ventasService } from './ventas'
import { calcularFechaVencimiento, calcularDiasAtraso, calcularCargoMora, CONFIG_MORA } from './mora'
import { calcularFechaVencimientoCuota } from './proximoVencimiento'
import { perfilesService } from './perfiles'
import type { Venta, Sucursal } from '@/types'

export type NivelMora = 'temprana' | 'media' | 'critica'

export interface ClienteMoroso {
  venta_id: string
  cliente_id: string
  cliente_nombre: string
  cliente_cedula?: string
  telefono: string
  sucursal_id?: string
  sucursal_nombre?: string
  diasAtraso: number
  nivelMora: NivelMora
  montoPendiente: number
  montoMora: number
  totalDeuda: number
  cuotasVencidas: number
  ultimaCuotaVencida: number
  fechaUltimaCuotaVencida: Date | null
  motor_marca?: string
  motor_modelo?: string
  motor_numero_chasis?: string
}

export interface ResumenMora {
  totalEnRiesgo: number
  totalClientesEnAtraso: number
  sucursalMasAfectada: {
    id: string
    nombre: string
    totalRiesgo: number
    clientesAfectados: number
  } | null
  distribucionPorNivel: {
    temprana: { cantidad: number; monto: number }
    media: { cantidad: number; monto: number }
    critica: { cantidad: number; monto: number }
  }
  cambioPorcentualSemanal: number | null
}

/**
 * Clasifica el nivel de mora según los días de atraso
 */
export function clasificarNivelMora(diasAtraso: number): NivelMora {
  if (diasAtraso >= 1 && diasAtraso <= 7) {
    return 'temprana'
  } else if (diasAtraso >= 8 && diasAtraso <= 30) {
    return 'media'
  } else {
    return 'critica'
  }
}

/**
 * Obtiene la fecha de vencimiento de una cuota (usa cuotas_detalladas si existe, sino calcula según tipo_plazo)
 */
function getFechaVencimientoCuota(
  venta: Venta,
  numeroCuota: number,
  cuotasDetalladasMap: Map<string, Array<{ numero_cuota: number; fecha_pago: string }>>
): Date {
  const cuotas = cuotasDetalladasMap.get(venta.id)
  const cuotaDet = cuotas?.find(c => c.numero_cuota === numeroCuota)
  if (cuotaDet?.fecha_pago) {
    const f = new Date(cuotaDet.fecha_pago)
    f.setHours(0, 0, 0, 0)
    return f
  }
  // Usar tipo_plazo si existe (semanal, quincenal, diario, mensual)
  if (venta.tipo_plazo) {
    return calcularFechaVencimientoCuota(venta, numeroCuota)
  }
  return calcularFechaVencimiento(new Date(venta.fecha_venta), numeroCuota, venta.cantidad_cuotas)
}

/**
 * Obtiene todos los clientes morosos con análisis detallado
 */
export async function obtenerClientesMorosos(sucursalId?: string): Promise<ClienteMoroso[]> {
  const ventas = await ventasService.getAll()
  const fechaActual = new Date()
  const clientesMorosos: ClienteMoroso[] = []

  // Si se especifica sucursalId, filtrar por sucursal
  const ventasFiltradas = sucursalId
    ? ventas.filter(v => v.sucursal_id === sucursalId)
    : ventas

  const ventasConSaldo = ventasFiltradas.filter(v => v.cliente && v.saldo_pendiente > 0)
  if (ventasConSaldo.length === 0) return []

  const ventaIds = ventasConSaldo.map(v => v.id)

  // Cargar cuotas_detalladas y pagos en batch para evitar N+1
  const [cuotasRes, pagosRes] = await Promise.all([
    supabase
      .from('cuotas_detalladas')
      .select('venta_id, numero_cuota, fecha_pago')
      .in('venta_id', ventaIds)
      .order('numero_cuota', { ascending: true }),
    supabase
      .from('pagos')
      .select('venta_id, numero_cuota')
      .in('venta_id', ventaIds)
      .not('numero_cuota', 'is', null),
  ]) as unknown as [
    { data: { venta_id: string; numero_cuota: number; fecha_pago?: string }[] | null },
    { data: { venta_id: string; numero_cuota?: number | null }[] | null },
  ]

  const cuotasDetalladasMap = new Map<string, Array<{ numero_cuota: number; fecha_pago: string }>>()
  for (const c of cuotasRes.data || []) {
    if (!cuotasDetalladasMap.has(c.venta_id)) {
      cuotasDetalladasMap.set(c.venta_id, [])
    }
    cuotasDetalladasMap.get(c.venta_id)!.push({
      numero_cuota: c.numero_cuota,
      fecha_pago: c.fecha_pago ?? '',
    })
  }

  const pagosPorVenta = new Map<string, Set<number>>()
  for (const p of pagosRes.data || []) {
    if (!pagosPorVenta.has(p.venta_id)) {
      pagosPorVenta.set(p.venta_id, new Set())
    }
    if (p.numero_cuota != null) pagosPorVenta.get(p.venta_id)!.add(p.numero_cuota)
  }

  for (const venta of ventasConSaldo) {
    const cuotasPagadasSet = pagosPorVenta.get(venta.id) ?? new Set()
    const cuotasPagadas = cuotasPagadasSet.size

    const numeroCuotasPendientes = Math.max(0, venta.cantidad_cuotas - cuotasPagadas)
    const montoPorCuota = numeroCuotasPendientes > 0
      ? Math.round((venta.saldo_pendiente / numeroCuotasPendientes) * 100) / 100
      : 0

    let maxDiasAtraso = 0
    let cuotasVencidas = 0
    let ultimaCuotaVencida = 0
    let fechaUltimaCuotaVencida: Date | null = null
    let totalMora = 0

    for (let numeroCuota = 1; numeroCuota <= venta.cantidad_cuotas; numeroCuota++) {
      if (cuotasPagadasSet.has(numeroCuota)) continue

      const fechaVencimiento = getFechaVencimientoCuota(venta, numeroCuota, cuotasDetalladasMap)
      const diasAtraso = calcularDiasAtraso(fechaVencimiento, fechaActual)

      if (diasAtraso > 0) {
        cuotasVencidas++
        if (diasAtraso > maxDiasAtraso) {
          maxDiasAtraso = diasAtraso
          ultimaCuotaVencida = numeroCuota
          fechaUltimaCuotaVencida = fechaVencimiento
        }
        const moraCuota = calcularCargoMora(montoPorCuota, diasAtraso)
        totalMora += moraCuota
      }
    }

    if (cuotasVencidas > 0 && venta.cliente) {
      const nivelMora = clasificarNivelMora(maxDiasAtraso)
      const telefono = venta.cliente.celular || (venta.cliente as any).telefono_garante || 'N/A'
      
      // Obtener nombre de sucursal si existe
      let sucursalNombre: string | undefined
      if (venta.sucursal_id) {
        try {
          const sucursales = await perfilesService.getSucursales()
          const sucursal = sucursales.find(s => s.id === venta.sucursal_id)
          sucursalNombre = sucursal?.nombre
        } catch (error) {
          console.warn('Error obteniendo nombre de sucursal:', error)
        }
      }

      clientesMorosos.push({
        venta_id: venta.id,
        cliente_id: venta.cliente.id,
        cliente_nombre: venta.cliente.nombre_completo,
        cliente_cedula: venta.cliente.cedula,
        telefono,
        sucursal_id: venta.sucursal_id,
        sucursal_nombre: sucursalNombre,
        diasAtraso: maxDiasAtraso,
        nivelMora,
        montoPendiente: venta.saldo_pendiente,
        montoMora: totalMora,
        totalDeuda: venta.saldo_pendiente + totalMora,
        cuotasVencidas,
        ultimaCuotaVencida,
        fechaUltimaCuotaVencida,
        motor_marca: venta.motor?.marca,
        motor_modelo: venta.motor?.modelo,
        motor_numero_chasis: venta.motor?.numero_chasis,
      })
    }
  }

  // Ordenar por días de atraso (mayor a menor)
  clientesMorosos.sort((a, b) => b.diasAtraso - a.diasAtraso)

  return clientesMorosos
}

/**
 * Genera un resumen de mora con estadísticas generales
 */
export async function obtenerResumenMora(): Promise<ResumenMora> {
  const clientesMorosos = await obtenerClientesMorosos()
  
  const totalEnRiesgo = clientesMorosos.reduce((sum, c) => sum + c.totalDeuda, 0)
  // Contar préstamos/ventas en atraso (coincide con la lista y la distribución por nivel)
  const totalClientesEnAtraso = clientesMorosos.length

  // Calcular distribución por sucursal
  const moraPorSucursal = new Map<string, { totalRiesgo: number; clientes: Set<string> }>()
  
  clientesMorosos.forEach(cliente => {
    const sucursalId = cliente.sucursal_id || 'sin-sucursal'
    if (!moraPorSucursal.has(sucursalId)) {
      moraPorSucursal.set(sucursalId, { totalRiesgo: 0, clientes: new Set() })
    }
    const data = moraPorSucursal.get(sucursalId)!
    data.totalRiesgo += cliente.totalDeuda
    data.clientes.add(cliente.cliente_id)
  })

  // Encontrar sucursal más afectada
  let sucursalMasAfectada: ResumenMora['sucursalMasAfectada'] = null
  let maxRiesgo = 0

  for (const [sucursalId, data] of moraPorSucursal.entries()) {
    if (data.totalRiesgo > maxRiesgo && sucursalId !== 'sin-sucursal') {
      maxRiesgo = data.totalRiesgo
      const sucursalNombre = clientesMorosos.find(c => c.sucursal_id === sucursalId)?.sucursal_nombre || 'N/A'
      sucursalMasAfectada = {
        id: sucursalId,
        nombre: sucursalNombre,
        totalRiesgo: data.totalRiesgo,
        clientesAfectados: data.clientes.size,
      }
    }
  }

  // Calcular distribución por nivel
  const distribucionPorNivel = {
    temprana: { cantidad: 0, monto: 0 },
    media: { cantidad: 0, monto: 0 },
    critica: { cantidad: 0, monto: 0 },
  }

  clientesMorosos.forEach(cliente => {
    const nivel = cliente.nivelMora
    distribucionPorNivel[nivel].cantidad++
    distribucionPorNivel[nivel].monto += cliente.totalDeuda
  })

  // TODO: Calcular cambio porcentual semanal (requiere almacenar histórico)
  const cambioPorcentualSemanal = null

  return {
    totalEnRiesgo,
    totalClientesEnAtraso,
    sucursalMasAfectada,
    distribucionPorNivel,
    cambioPorcentualSemanal,
  }
}

/**
 * Obtiene el color según el nivel de mora (código semáforo)
 */
export function obtenerColorMora(nivelMora: NivelMora): string {
  switch (nivelMora) {
    case 'temprana':
      return 'yellow' // Amarillo
    case 'media':
      return 'orange' // Naranja
    case 'critica':
      return 'red' // Rojo
    default:
      return 'gray'
  }
}

/**
 * Obtiene el nombre del nivel de mora en español
 */
export function obtenerNombreNivelMora(nivelMora: NivelMora): string {
  switch (nivelMora) {
    case 'temprana':
      return 'Mora Temprana'
    case 'media':
      return 'Mora Media'
    case 'critica':
      return 'Mora Crítica'
    default:
      return 'Sin Mora'
  }
}

