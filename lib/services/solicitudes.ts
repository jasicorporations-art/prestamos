import { supabase } from '../supabase'
import type { SolicitudCambio } from '@/types'
import { getCompaniaActual } from '../utils/compania'
import { withAppIdFilter } from '../utils/appId'

export const solicitudesService = {
  /** Cuenta solicitudes pendientes (ventas pending + solicitudes_cambio pending) */
  async getContadorPendientes(): Promise<number> {
    const compania = getCompaniaActual()
    let total = 0

    try {
      // Ventas con status pending
      let ventasQuery = supabase
        .from('ventas')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (compania) {
        ventasQuery = ventasQuery.eq('empresa_id', compania)
      }
      ventasQuery = withAppIdFilter(ventasQuery, 'ventas')
      const { count: ventasCount } = await ventasQuery
      total += ventasCount ?? 0

      // Solicitudes_cambio pendientes
      let solicitudesQuery = supabase
        .from('solicitudes_cambio')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (compania) {
        solicitudesQuery = solicitudesQuery.eq('empresa_id', compania)
      }
      const { count: solCount } = await solicitudesQuery
      total += solCount ?? 0
    } catch (e) {
      console.warn('Error contando pendientes:', e)
    }
    return total
  },

  /** Obtiene ventas pendientes de aprobación */
  async getVentasPendientes(): Promise<any[]> {
    const compania = getCompaniaActual()
    let query = supabase
      .from('ventas')
      .select(`
        *,
        motor:motores(*),
        cliente:clientes(*)
      `)
      .eq('status', 'pending')

    if (compania) {
      query = query.eq('empresa_id', compania)
    }
    query = withAppIdFilter(query, 'ventas')
    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      if (error.message?.includes('status') || error.message?.includes('column')) {
        return []
      }
      throw error
    }
    return data || []
  },

  /** Obtiene solicitudes de renovación pendientes */
  async getSolicitudesPendientes(): Promise<SolicitudCambio[]> {
    const compania = getCompaniaActual()
    let query = supabase
      .from('solicitudes_cambio')
      .select(`
        *,
        venta:ventas(*, motor:motores(*), cliente:clientes(*))
      `)
      .eq('status', 'pending')

    if (compania) {
      query = query.eq('empresa_id', compania)
    }
    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /** Aprueba un préstamo (venta) pendiente - solo Admin */
  async aprobarVenta(ventaId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')

    const { perfilesService } = await import('./perfiles')
    const esAdmin = await perfilesService.esAdmin()
    if (!esAdmin) throw new Error('Solo un administrador puede aprobar préstamos.')

    const { error } = await (supabase as any).rpc('aprobar_prestamo', {
      p_venta_id: ventaId,
      p_usuario_id: user.id,
    })

    if (error) {
      // Si la función no existe, actualizar status manualmente
      if (error.message?.includes('function') || error.message?.includes('does not exist')) {
        const { error: updateError } = await (supabase as any)
          .from('ventas')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', ventaId)

        if (updateError) throw updateError
        return
      }
      throw error
    }
  },

  /** Rechaza un préstamo pendiente - solo Admin */
  async rechazarVenta(ventaId: string): Promise<void> {
    const { perfilesService } = await import('./perfiles')
    const esAdmin = await perfilesService.esAdmin()
    if (!esAdmin) throw new Error('Solo un administrador puede rechazar préstamos.')

    const { error } = await (supabase as any)
      .from('ventas')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', ventaId)

    if (error) throw error
  },

  /** Aprueba una solicitud de renovación - solo Admin */
  async aprobarSolicitud(solicitudId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')

    const { perfilesService } = await import('./perfiles')
    const esAdmin = await perfilesService.esAdmin()
    if (!esAdmin) throw new Error('Solo un administrador puede aprobar solicitudes.')

    const { data: sol } = await supabase
      .from('solicitudes_cambio')
      .select('venta_id')
      .eq('id', solicitudId)
      .single()

    if (!sol?.venta_id) throw new Error('Solicitud no encontrada')

    await this.aprobarVenta(sol.venta_id)

    await (supabase as any)
      .from('solicitudes_cambio')
      .update({
        status: 'aprobada',
        aprobado_por: user.id,
        fecha_aprobacion: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', solicitudId)
  },

  /** Rechaza una solicitud de renovación - solo Admin */
  async rechazarSolicitud(solicitudId: string, observaciones?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')

    const { perfilesService } = await import('./perfiles')
    const esAdmin = await perfilesService.esAdmin()
    if (!esAdmin) throw new Error('Solo un administrador puede rechazar solicitudes.')

    await (supabase as any)
      .from('solicitudes_cambio')
      .update({
        status: 'rechazada',
        aprobado_por: user.id,
        fecha_aprobacion: new Date().toISOString(),
        observaciones: observaciones || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', solicitudId)
  },

  /** Crea una solicitud de renovación */
  async crearSolicitudRenovacion(ventaId: string, datos?: { monto?: number; plazo?: number }): Promise<SolicitudCambio> {
    const compania = getCompaniaActual()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')

    const { perfilesService } = await import('./perfiles')
    const sucursalId = await perfilesService.getSucursalActual()

    const { data, error } = await (supabase as any)
      .from('solicitudes_cambio')
      .insert({
        venta_id: ventaId,
        tipo: 'renovacion',
        monto_solicitado: datos?.monto,
        plazo_solicitado: datos?.plazo,
        solicitado_por: user.id,
        sucursal_id: sucursalId,
        empresa_id: compania,
        status: 'pending',
      })
      .select('*')
      .single()

    if (error) throw error
    return data as SolicitudCambio
  },
}
