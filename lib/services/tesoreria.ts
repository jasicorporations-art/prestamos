/**
 * Servicio de Tesorería - Consolidado de Caja
 * KPIs, gráficos y detalle de movimientos
 */

import { supabase } from '../supabase'
import { perfilesService } from './perfiles'
import { obtenerClientesMorosos } from './reporteMora'
import { getCompaniaActual } from '../utils/compania'
import { orEmpresaCompania } from '../utils/postgrest'

export interface TesoreriaKPIs {
  ingresosTotales: number
  egresosTotales: number
  flujoNeto: number
  carteraEnRiesgo: number
}

export interface TesoreriaMovimiento {
  id: string
  fecha_hora: string
  concepto: string
  sucursal_nombre: string
  tipo: 'Entrada' | 'Salida'
  monto: number
  origen: 'pago' | 'movimiento'
}

export interface TesoreriaChartPoint {
  fecha: string
  ingresos: number
  egresos: number
  neto: number
}

export type RangoTiempo = 'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado'

function getRangoFechas(
  rango: RangoTiempo,
  fechaInicioCustom?: string,
  fechaFinCustom?: string
): { inicio: Date; fin: Date } {
  const now = new Date()
  const fin = new Date(now)
  fin.setHours(23, 59, 59, 999)
  let inicio: Date

  if (rango === 'personalizado' && fechaInicioCustom && fechaFinCustom) {
    inicio = new Date(`${fechaInicioCustom}T00:00:00`)
    const finDate = new Date(`${fechaFinCustom}T23:59:59`)
    if (!isNaN(inicio.getTime()) && !isNaN(finDate.getTime())) {
      return { inicio, fin: finDate }
    }
  }

  switch (rango) {
    case 'hoy':
      inicio = new Date(now)
      inicio.setHours(0, 0, 0, 0)
      break
    case 'semana':
      inicio = new Date(now)
      inicio.setHours(0, 0, 0, 0)
      inicio.setDate(inicio.getDate() - 7)
      break
    case 'mes':
      // Primer día del mes actual (incluye todo el mes hasta hoy)
      inicio = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      break
    case 'anio':
      // Primer día del año actual (incluye todo el año hasta hoy)
      inicio = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      break
    default:
      inicio = new Date(now)
      inicio.setHours(0, 0, 0, 0)
      inicio.setDate(inicio.getDate() - 30)
  }
  return { inicio, fin }
}

export const tesoreriaService = {
  async getKPIs(params: {
    sucursalId?: string
    rango: RangoTiempo
    fechaInicio?: string
    fechaFin?: string
  }): Promise<TesoreriaKPIs> {
    const { sucursalId, rango, fechaInicio, fechaFin } = params
    const { inicio, fin } = getRangoFechas(rango, fechaInicio, fechaFin)
    const perfil = await perfilesService.getPerfilActual()
    const empresaId = perfil?.empresa_id || perfil?.compania_id || getCompaniaActual() || null

    const filtrarPagos = (pagos: any[]) => {
      let f = pagos || []
      if (empresaId) {
        f = f.filter((p: any) => p.empresa_id === empresaId || p.compania_id === empresaId)
      }
      if (sucursalId) {
        f = f.filter((p: any) => {
          const suc = p.sucursal_donde_se_cobro || p.sucursal_id
          return suc === sucursalId || (!suc && !sucursalId)
        })
      }
      return f
    }

    let queryMov = supabase
      .from('movimientos_caja')
      .select('tipo,monto')
      .gte('fecha_hora', inicio.toISOString())
      .lte('fecha_hora', fin.toISOString())
    if (sucursalId) queryMov = queryMov.eq('sucursal_id', sucursalId)
    if (empresaId) {
      try {
        queryMov = queryMov.or(orEmpresaCompania(empresaId))
      } catch {
        // Tabla sin empresa_id/compania_id, RLS o filtro en memoria después
      }
    }
    const { data: movData } = await queryMov

    // Filtrar pagos por timestamp completo (no por fecha YYYY-MM-DD) para que "hoy" incluya todo el día en zona local
    const inicioISO = inicio.toISOString()
    const finISO = fin.toISOString()
    let queryPagos = supabase
      .from('pagos')
      .select('monto,sucursal_donde_se_cobro,sucursal_id,empresa_id,compania_id,fecha_pago,fecha_hora')
      .gte('fecha_hora', inicioISO)
      .lte('fecha_hora', finISO)
    const { data: pagosData } = await queryPagos

    const pagosFiltrados = filtrarPagos(pagosData || [])
    const ingresosPagos = pagosFiltrados.reduce((s: number, p: any) => s + (p.monto || 0), 0)
    const ingresosMov = (movData || [])
      .filter((m: any) => m.tipo === 'Entrada')
      .reduce((s: number, m: any) => s + (m.monto || 0), 0)
    const egresosMov = (movData || [])
      .filter((m: any) => m.tipo === 'Salida')
      .reduce((s: number, m: any) => s + (m.monto || 0), 0)

    const ingresosTotales = ingresosPagos + ingresosMov
    const egresosTotales = egresosMov

    const clientesMorosos = await obtenerClientesMorosos(sucursalId)
    const carteraEnRiesgo = clientesMorosos.reduce((s, c) => s + c.totalDeuda, 0)

    return {
      ingresosTotales,
      egresosTotales,
      flujoNeto: ingresosTotales - egresosTotales,
      carteraEnRiesgo,
    }
  },

  async getChartData(params: {
    sucursalId?: string
    rango: RangoTiempo
    fechaInicio?: string
    fechaFin?: string
  }): Promise<TesoreriaChartPoint[]> {
    const { sucursalId, rango, fechaInicio, fechaFin } = params
    const { inicio, fin } = getRangoFechas(rango, fechaInicio, fechaFin)
    const perfil = await perfilesService.getPerfilActual()
    const empresaId = perfil?.empresa_id || perfil?.compania_id || getCompaniaActual() || null

    const filtrarPagos = (pagos: any[]) => {
      let f = pagos || []
      if (empresaId) {
        f = f.filter((p: any) => p.empresa_id === empresaId || p.compania_id === empresaId)
      }
      if (sucursalId) {
        f = f.filter((p: any) => {
          const suc = p.sucursal_donde_se_cobro || p.sucursal_id
          return suc === sucursalId || (!suc && !sucursalId)
        })
      }
      return f
    }

    let queryMovChart = supabase
      .from('movimientos_caja')
      .select('tipo,monto,fecha_hora')
      .gte('fecha_hora', inicio.toISOString())
      .lte('fecha_hora', fin.toISOString())
    if (sucursalId) queryMovChart = queryMovChart.eq('sucursal_id', sucursalId)
    if (empresaId) {
      try {
        queryMovChart = queryMovChart.or(orEmpresaCompania(empresaId))
      } catch {
        // Sin columna empresa/compania
      }
    }
    const { data: movDataChart } = await queryMovChart

    const inicioISOChart = inicio.toISOString()
    const finISOChart = fin.toISOString()
    const { data: pagosDataChart } = await supabase
      .from('pagos')
      .select('monto,sucursal_donde_se_cobro,sucursal_id,empresa_id,compania_id,fecha_pago,fecha_hora')
      .gte('fecha_hora', inicioISOChart)
      .lte('fecha_hora', finISOChart)

    const pagosFiltrados = filtrarPagos(pagosDataChart || [])

    const porFecha = new Map<string, { ingresos: number; egresos: number }>()
    const addToDate = (key: string, tipo: 'ingresos' | 'egresos', monto: number) => {
      if (!porFecha.has(key)) porFecha.set(key, { ingresos: 0, egresos: 0 })
      const obj = porFecha.get(key)!
      obj[tipo] += monto
    }

    pagosFiltrados.forEach((p: any) => {
      const f = (p.fecha_hora || p.fecha_pago || '').toString().split('T')[0]
      if (f) addToDate(f, 'ingresos', p.monto || 0)
    })
    ;(movDataChart || []).forEach((m: any) => {
      const f = (m.fecha_hora || '').toString().split('T')[0]
      if (f) addToDate(f, m.tipo === 'Entrada' ? 'ingresos' : 'egresos', m.monto || 0)
    })

    const puntos: TesoreriaChartPoint[] = []
    const iter = new Date(inicio)
    while (iter <= fin) {
      const key = iter.toISOString().split('T')[0]
      const data = porFecha.get(key) || { ingresos: 0, egresos: 0 }
      puntos.push({
        fecha: key,
        ingresos: data.ingresos,
        egresos: data.egresos,
        neto: data.ingresos - data.egresos,
      })
      iter.setDate(iter.getDate() + 1)
    }
    return puntos
  },

  async getMovimientos(params: {
    sucursalId?: string
    rango: RangoTiempo
    fechaInicio?: string
    fechaFin?: string
    limit?: number
  }): Promise<TesoreriaMovimiento[]> {
    const { sucursalId, rango, fechaInicio, fechaFin, limit = 100 } = params
    const { inicio, fin } = getRangoFechas(rango, fechaInicio, fechaFin)
    const perfil = await perfilesService.getPerfilActual()
    const empresaId = perfil?.empresa_id || perfil?.compania_id || getCompaniaActual() || null

    let queryMov = supabase
      .from('movimientos_caja')
      .select(`
        id,tipo,monto,concepto,fecha_hora,sucursal_id,
        sucursales(nombre)
      `)
      .gte('fecha_hora', inicio.toISOString())
      .lte('fecha_hora', fin.toISOString())
      .order('fecha_hora', { ascending: false })
      .limit(limit)
    if (sucursalId) queryMov = queryMov.eq('sucursal_id', sucursalId)
    if (empresaId) {
      try {
        queryMov = queryMov.or(orEmpresaCompania(empresaId))
      } catch {
        // Tabla sin empresa_id/compania_id
      }
    }
    const { data: movData } = await queryMov

    const inicioISOMov = inicio.toISOString()
    const finISOMov = fin.toISOString()
    const { data: pagosData } = await supabase
      .from('pagos')
      .select(`
        id,monto,sucursal_donde_se_cobro,sucursal_id,empresa_id,compania_id,fecha_pago,fecha_hora,venta_id,
        ventas(numero_prestamo)
      `)
      .gte('fecha_hora', inicioISOMov)
      .lte('fecha_hora', finISOMov)

    let pagosFiltrados = pagosData || []
    if (empresaId) {
      pagosFiltrados = pagosFiltrados.filter(
        (p: any) => p.empresa_id === empresaId || p.compania_id === empresaId
      )
    }
    if (sucursalId) {
      pagosFiltrados = pagosFiltrados.filter((p: any) => {
        const suc = p.sucursal_donde_se_cobro || p.sucursal_id
        return suc === sucursalId || (!suc && !sucursalId)
      })
    }

    const sucursalIds = new Set<string>()
    ;(movData || []).forEach((m: any) => m.sucursal_id && sucursalIds.add(m.sucursal_id))
    pagosFiltrados.forEach((p: any) => {
      const s = p.sucursal_donde_se_cobro || p.sucursal_id
      if (s) sucursalIds.add(s)
    })
    const sucursalesList = sucursalIds.size
      ? await supabase.from('sucursales').select('id,nombre').in('id', [...sucursalIds])
      : { data: [] }
    const sucMap = new Map((sucursalesList.data || []).map((s: any) => [s.id, s.nombre]))

    const movimientos: TesoreriaMovimiento[] = []

    ;(movData || []).forEach((m: any) => {
      const suc = Array.isArray(m.sucursales) ? m.sucursales[0] : m.sucursales
      movimientos.push({
        id: m.id,
        fecha_hora: m.fecha_hora,
        concepto: m.concepto || '',
        sucursal_nombre: (suc?.nombre) || sucMap.get(m.sucursal_id) || 'N/A',
        tipo: m.tipo,
        monto: m.monto || 0,
        origen: 'movimiento',
      })
    })

    pagosFiltrados.forEach((p: any) => {
      const venta = p.ventas as any
      const concepto = venta?.numero_prestamo
        ? `Pago cuota - ${venta.numero_prestamo}`
        : 'Pago de cuota'
      const sucId = p.sucursal_donde_se_cobro || p.sucursal_id
      movimientos.push({
        id: `pago-${p.id}`,
        fecha_hora: p.fecha_hora || p.fecha_pago,
        concepto,
        sucursal_nombre: sucMap.get(sucId) || 'N/A',
        tipo: 'Entrada',
        monto: p.monto || 0,
        origen: 'pago',
      })
    })

    movimientos.sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime())
    return movimientos.slice(0, limit)
  },
}
