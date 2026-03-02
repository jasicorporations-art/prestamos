import { supabase } from '../supabase'
import type { Ruta } from '@/types'
import { getCompaniaActual } from '../utils/compania'
import { withAppIdFilter } from '../utils/appId'
import { orEmpresaCompania } from '../utils/postgrest'

export interface VentaEnRuta {
  id: string
  numero_prestamo?: string
  monto_total: number
  saldo_pendiente: number
  cantidad_cuotas: number
  fecha_venta: string
  tipo_plazo?: 'diario' | 'semanal' | 'quincenal' | 'mensual'
  dia_pago_mensual?: number
  dia_pago_semanal?: number
  fecha_inicio_quincenal?: string
  ruta_id?: string
  orden_visita?: number
  status?: string
  sucursal_id?: string
  ruta_nombre?: string
  cliente_id: string
  cliente_nombre?: string
  cliente_cedula?: string
  cliente_celular?: string
  cliente_direccion?: string
  motor_id: string
  motor_marca?: string
  motor_modelo?: string
  motor_matricula?: string
  /** Indicador de por qué está en la ruta: "Pago Semanal", "Vence hoy", etc. */
  indicadorRuta?: string
}

export const rutasService = {
  /** Obtiene todas las rutas activas (para filtros en mapa de cobros) */
  async getAllRutas(): Promise<Ruta[]> {
    const { data, error } = await supabase
      .from('rutas')
      .select('*')
      .eq('activa', true)
      .order('nombre')
    if (error) throw error
    return data || []
  },

  async getRutasBySucursal(sucursalId: string): Promise<Ruta[]> {
    const { data, error } = await supabase
      .from('rutas')
      .select('*')
      .eq('sucursal_id', sucursalId)
      .eq('activa', true)
      .order('nombre')

    if (error) throw error
    return data || []
  },

  /**
   * Obtiene "Mi Ruta de Hoy" - préstamos activos en ruta ordenados por orden_visita.
   * Si el usuario tiene ruta asignada en su perfil, muestra solo esa ruta.
   * Si no, muestra todas las rutas de su sucursal.
   */
  async getMiRutaDeHoy(sucursalId?: string): Promise<VentaEnRuta[]> {
    const { perfilesService } = await import('./perfiles')
    const sucursal = sucursalId || await perfilesService.getSucursalActual()
    const rutaAsignada = await perfilesService.getRutaActual()
    if (!sucursal) return []

    // Si el usuario tiene ruta asignada, filtrar solo por esa ruta
    if (rutaAsignada) {
      const { data, error } = await supabase
        .from('mi_ruta_de_hoy')
        .select('*')
        .eq('ruta_id', rutaAsignada)

      if (error) {
        if (error.message?.includes('mi_ruta_de_hoy') || error.message?.includes('does not exist')) {
          return this.getMiRutaDeHoyFallbackPorRuta(rutaAsignada)
        }
        throw error
      }
      const sorted = (data || []).sort((a: any, b: any) => (a.orden_visita || 0) - (b.orden_visita || 0))
      return sorted
    }

    // Sin ruta asignada: mostrar todas las rutas de la sucursal
    const { data, error } = await supabase
      .from('mi_ruta_de_hoy')
      .select('*')
      .eq('ruta_sucursal_id', sucursal)

    if (error) {
      if (error.message?.includes('mi_ruta_de_hoy') || error.message?.includes('does not exist')) {
        return this.getMiRutaDeHoyFallback(sucursal)
      }
      throw error
    }

    const sorted = (data || []).sort((a: any, b: any) => (a.orden_visita || 0) - (b.orden_visita || 0))
    return sorted
  },

  /** Fallback por ruta asignada cuando la vista no existe */
  async getMiRutaDeHoyFallbackPorRuta(rutaId: string): Promise<VentaEnRuta[]> {
    const compania = getCompaniaActual()
    let query = supabase
      .from('ventas')
      .select(`
        id,
        numero_prestamo,
        monto_total,
        saldo_pendiente,
        cantidad_cuotas,
        fecha_venta,
        tipo_plazo,
        dia_pago_mensual,
        dia_pago_semanal,
        fecha_inicio_quincenal,
        ruta_id,
        orden_visita,
        status,
        sucursal_id,
        cliente:clientes(id, nombre_completo, cedula, celular, direccion),
        motor:motores(id, marca, modelo, matricula)
      `)
      .eq('ruta_id', rutaId)
      .eq('status', 'active')
      .gte('saldo_pendiente', 0.01)

    if (compania) {
      query = query.eq('empresa_id', compania)
    }
    query = withAppIdFilter(query, 'ventas')

    const { data, error } = await query.order('orden_visita', { ascending: true })

    if (error) throw error

    return (data || []).map((v: any) => ({
      id: v.id,
      numero_prestamo: v.numero_prestamo,
      monto_total: v.monto_total,
      saldo_pendiente: v.saldo_pendiente,
      cantidad_cuotas: v.cantidad_cuotas,
      fecha_venta: v.fecha_venta,
      tipo_plazo: v.tipo_plazo,
      dia_pago_mensual: v.dia_pago_mensual,
      dia_pago_semanal: v.dia_pago_semanal,
      fecha_inicio_quincenal: v.fecha_inicio_quincenal,
      ruta_id: v.ruta_id,
      orden_visita: v.orden_visita,
      status: v.status,
      sucursal_id: v.sucursal_id,
      cliente_id: v.cliente_id,
      cliente_nombre: v.cliente?.nombre_completo,
      cliente_cedula: v.cliente?.cedula,
      cliente_celular: v.cliente?.celular,
      cliente_direccion: v.cliente?.direccion,
      motor_id: v.motor_id,
      motor_marca: v.motor?.marca,
      motor_modelo: v.motor?.modelo,
      motor_matricula: v.motor?.matricula,
    }))
  },

  /** Fallback si la vista no existe: consultar ventas directamente */
  async getMiRutaDeHoyFallback(sucursalId: string): Promise<VentaEnRuta[]> {
    const compania = getCompaniaActual()
    let query = supabase
      .from('ventas')
      .select(`
        id,
        numero_prestamo,
        monto_total,
        saldo_pendiente,
        cantidad_cuotas,
        fecha_venta,
        tipo_plazo,
        dia_pago_mensual,
        dia_pago_semanal,
        fecha_inicio_quincenal,
        ruta_id,
        orden_visita,
        status,
        sucursal_id,
        cliente:clientes(id, nombre_completo, cedula, celular, direccion),
        motor:motores(id, marca, modelo, matricula)
      `)
      .not('ruta_id', 'is', null)
      .eq('status', 'active')
      .gte('saldo_pendiente', 0.01)

    if (compania) {
      query = query.eq('empresa_id', compania)
    }
    query = withAppIdFilter(query, 'ventas')

    const { data, error } = await query.order('orden_visita', { ascending: true })

    if (error) throw error

    // Filtrar por sucursal de la venta o por ruta (necesitamos cargar rutas)
    const rutaIds = [...new Set((data || []).map((v: any) => v.ruta_id).filter(Boolean))]
    const rutasBySucursal: Record<string, boolean> = {}
    if (rutaIds.length > 0) {
      const { data: rutas } = await supabase.from('rutas').select('id, sucursal_id').in('id', rutaIds) as { data: { id: string; sucursal_id?: string }[] | null }
      ;(rutas || []).forEach((r: any) => { rutasBySucursal[r.id] = r.sucursal_id === sucursalId })
    }
    const filtered = (data || []).filter(
      (v: any) => v.sucursal_id === sucursalId || rutasBySucursal[v.ruta_id]
    )

    return filtered.map((v: any) => ({
      id: v.id,
      numero_prestamo: v.numero_prestamo,
      monto_total: v.monto_total,
      saldo_pendiente: v.saldo_pendiente,
      cantidad_cuotas: v.cantidad_cuotas,
      fecha_venta: v.fecha_venta,
      tipo_plazo: v.tipo_plazo,
      dia_pago_mensual: v.dia_pago_mensual,
      dia_pago_semanal: v.dia_pago_semanal,
      fecha_inicio_quincenal: v.fecha_inicio_quincenal,
      ruta_id: v.ruta_id,
      orden_visita: v.orden_visita,
      status: v.status,
      sucursal_id: v.sucursal_id,
      cliente_id: v.cliente_id,
      cliente_nombre: v.cliente?.nombre_completo,
      cliente_cedula: v.cliente?.cedula,
      cliente_celular: v.cliente?.celular,
      cliente_direccion: v.cliente?.direccion,
      motor_id: v.motor_id,
      motor_marca: v.motor?.marca,
      motor_modelo: v.motor?.modelo,
      motor_matricula: v.motor?.matricula,
    }))
  },

  /**
   * Obtiene ventas de la sucursal SIN ruta asignada que tienen cuota vencida o programada para hoy.
   * Incluye todos los clientes que deben pagar hoy según su tipo_plazo (diario, semanal, quincenal, mensual).
   */
  async getVentasConCuotaHoySinRuta(sucursalId: string): Promise<VentaEnRuta[]> {
    const { perfilesService } = await import('./perfiles')
    const sucursal = sucursalId || await perfilesService.getSucursalActual()
    if (!sucursal) return []

    const compania = getCompaniaActual()
    let query = supabase
      .from('ventas')
      .select(`
        id,
        numero_prestamo,
        monto_total,
        saldo_pendiente,
        cantidad_cuotas,
        fecha_venta,
        tipo_plazo,
        dia_pago_mensual,
        dia_pago_semanal,
        fecha_inicio_quincenal,
        ruta_id,
        orden_visita,
        status,
        sucursal_id,
        cliente_id,
        motor_id,
        cliente:clientes(id, nombre_completo, cedula, celular, direccion),
        motor:motores(id, marca, modelo, matricula)
      `)
      .eq('sucursal_id', sucursal)
      .is('ruta_id', null)
      .eq('status', 'active')
      .gte('saldo_pendiente', 0.01)

    if (compania) {
      query = query.or(orEmpresaCompania(compania))
    }
    query = withAppIdFilter(query, 'ventas')

    const { data, error } = await query
    if (error || !data || data.length === 0) return []

    const raw: VentaEnRuta[] = data.map((v: any) => ({
      id: v.id,
      numero_prestamo: v.numero_prestamo,
      monto_total: v.monto_total,
      saldo_pendiente: v.saldo_pendiente,
      cantidad_cuotas: v.cantidad_cuotas,
      fecha_venta: v.fecha_venta,
      tipo_plazo: v.tipo_plazo,
      dia_pago_mensual: v.dia_pago_mensual,
      dia_pago_semanal: v.dia_pago_semanal,
      fecha_inicio_quincenal: v.fecha_inicio_quincenal,
      ruta_id: v.ruta_id,
      orden_visita: v.orden_visita,
      status: v.status,
      sucursal_id: v.sucursal_id,
      cliente_id: v.cliente_id,
      cliente_nombre: v.cliente?.nombre_completo,
      cliente_cedula: v.cliente?.cedula,
      cliente_celular: v.cliente?.celular,
      cliente_direccion: v.cliente?.direccion,
      motor_id: v.motor_id,
      motor_marca: v.motor?.marca,
      motor_modelo: v.motor?.modelo,
      motor_matricula: v.motor?.matricula,
    }))

    const { getProximosVencimientosBatch } = await import('./proximoVencimiento')
    const { debeAparecerEnRutaHoy } = await import('./rutaFiltrado')

    const proximosVencimientos = await getProximosVencimientosBatch(raw)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const resultado: VentaEnRuta[] = []
    for (const v of raw) {
      const prox = proximosVencimientos.get(v.id)
      const fechaProx = prox?.fecha ? new Date(prox.fecha) : null
      const { mostrar, indicador } = debeAparecerEnRutaHoy(v, hoy, fechaProx)
      if (mostrar) {
        resultado.push({ ...v, indicadorRuta: indicador || 'Sin ruta asignada' })
      }
    }
    return resultado
  },

  /**
   * Obtiene Mi Ruta de Hoy filtrada por frecuencia de pago y fecha actual.
   * - Diario: siempre mostrar
   * - Semanal: solo si la próxima cuota vence hoy o está vencida
   * - Quincenal: si la próxima cuota vence hoy o está vencida
   * - Mensual: solo si la próxima cuota vence hoy o está vencida
   * Incluye tanto clientes en ruta como clientes sin ruta que deben pagar hoy.
   * Los clientes que ya pagaron hoy se excluyen de la lista.
   */
  async getMiRutaDeHoyFiltrada(sucursalId?: string): Promise<{
    items: VentaEnRuta[]
    ventasConPagoHoy: Set<string>
    meta: number
    cobrado: number
    pendiente: number
  }> {
    const { perfilesService } = await import('./perfiles')
    const { getProximosVencimientosBatch } = await import('./proximoVencimiento')
    const { pagosService } = await import('./pagos')
    const { debeAparecerEnRutaHoy } = await import('./rutaFiltrado')

    const sucursal = sucursalId || await perfilesService.getSucursalActual()
    if (!sucursal) {
      return { items: [], ventasConPagoHoy: new Set(), meta: 0, cobrado: 0, pendiente: 0 }
    }

    const [rawEnRuta, rawSinRuta] = await Promise.all([
      this.getMiRutaDeHoy(sucursal),
      this.getVentasConCuotaHoySinRuta(sucursal),
    ])

    const raw = [...rawEnRuta]
    const idsEnRuta = new Set(rawEnRuta.map((v) => v.id))
    for (const v of rawSinRuta) {
      if (!idsEnRuta.has(v.id)) raw.push(v)
    }

    if (raw.length === 0) {
      return { items: [], ventasConPagoHoy: new Set(), meta: 0, cobrado: 0, pendiente: 0 }
    }

    const ventaIds = raw.map((v) => v.id)
    const [proximosVencimientos, ventasConPagoHoy, cobrado] = await Promise.all([
      getProximosVencimientosBatch(raw),
      pagosService.getVentasConPagoHoy(ventaIds),
      pagosService.getMontoCobradoHoyPorVentas(ventaIds),
    ])

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const conIndicador: VentaEnRuta[] = []
    for (const v of raw) {
      const prox = proximosVencimientos.get(v.id)
      const fechaProx = prox?.fecha ? new Date(prox.fecha) : null
      const { mostrar, indicador } = debeAparecerEnRutaHoy(v, hoy, fechaProx)
      if (mostrar) {
        conIndicador.push({ ...v, indicadorRuta: indicador || v.indicadorRuta })
      }
    }

    const sinPagadosHoy = conIndicador.filter((v) => !ventasConPagoHoy.has(v.id))

    const meta = conIndicador.reduce((sum, v) => {
      const prox = proximosVencimientos.get(v.id)
      const cuota =
        prox?.cuotaFija ??
        (v.saldo_pendiente && v.cantidad_cuotas ? v.saldo_pendiente / v.cantidad_cuotas : 0)
      return sum + (cuota || 0)
    }, 0)

    const pendiente = Math.max(0, meta - cobrado)

    const ordenados = [...sinPagadosHoy].sort((a, b) => {
      const ordenA = a.orden_visita ?? (a.ruta_id ? 9999 : 10000)
      const ordenB = b.orden_visita ?? (b.ruta_id ? 9999 : 10000)
      if (ordenA !== ordenB) return ordenA - ordenB
      return (a.cliente_nombre || '').localeCompare(b.cliente_nombre || '')
    })

    return { items: ordenados, ventasConPagoHoy, meta, cobrado, pendiente }
  },

}
