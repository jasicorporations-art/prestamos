import { supabase, supabaseRaw } from '../supabase'
import type { Caja, MovimientoCaja, MovimientoCajaResumen, ResumenTotalesCaja } from '@/types'
import { perfilesService } from './perfiles'
import { getAppId, withAppIdFilter } from '../utils/appId'
import { getCompaniaActual } from '../utils/compania'

/** Fecha en YYYY-MM-DD en zona horaria local (para filtrar "día" correctamente) */
function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Inicio y fin del día actual en hora local, como ISO para consultas a la DB (timestamptz) */
function getTodayLocalRange(fecha?: string): { startISO: string; endISO: string } {
  const d = fecha ? new Date(fecha + 'T12:00:00') : new Date()
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

export const cajasService = {
  /**
   * Obtiene o crea automáticamente la caja del día para la sucursal especificada o actual
   * Ya no requiere proceso de "apertura", siempre está disponible
   */
  async getCajaAbiertaActual(sucursalIdParam?: string): Promise<Caja | null> {
    try {
      const sucursalId = sucursalIdParam || await perfilesService.getSucursalActual()
      if (!sucursalId) {
        throw new Error('No hay sucursal asignada')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const hoy = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const inicioDia = `${hoy}T00:00:00`
      const finDia = `${hoy}T23:59:59.999`

      // Buscar caja ABIERTA del día (para que cerrar/abrir afecte siempre la misma)
      let { data, error } = await supabase
        .from('cajas')
        .select('*')
        .eq('sucursal_id', sucursalId)
        .eq('estado', 'Abierta')
        .gte('created_at', inicioDia)
        .lte('created_at', finDia)
        .order('created_at', { ascending: false })
        .limit(1) as { data: { sucursal_id?: string; sucursal?: unknown; [key: string]: unknown }[] | null; error: { code?: string } | null }

      if (error && error.code !== 'PGRST116') {
        console.error('Error consultando cajas:', error)
        return await this.crearCajaAutomatica(sucursalId, user.id, hoy)
      }

      if (data && data.length > 0) {
        const cajaData = data[0] as Record<string, unknown>
        if (cajaData && !cajaData.fecha && cajaData.created_at) {
          cajaData.fecha = (cajaData.created_at as string).slice(0, 10)
        }
        if (cajaData && cajaData.sucursal_id) {
          try {
            const { data: sucursalData } = await supabase
              .from('sucursales')
              .select('*')
              .eq('id', cajaData.sucursal_id)
              .single() as { data: Record<string, unknown> | null }
            if (sucursalData) cajaData.sucursal = sucursalData
          } catch {
            // ignorar
          }
        }
        return cajaData as unknown as Caja
      }

      // No hay caja abierta: crear una si no existe ninguna del día
      const { data: cualquierCaja } = await supabase
        .from('cajas')
        .select('id')
        .eq('sucursal_id', sucursalId)
        .gte('created_at', inicioDia)
        .lte('created_at', finDia)
        .limit(1)
      if (!cualquierCaja || cualquierCaja.length === 0) {
        return await this.crearCajaAutomatica(sucursalId, user.id, hoy)
      }
      return null
    } catch (error) {
      console.error('Error obteniendo caja abierta:', error)
      throw error
    }
  },

  /**
   * Crea automáticamente una caja para el día si no existe.
   * Incluye empresa_id de la sucursal para que RLS permita a todos los usuarios de la empresa verla.
   */
  async crearCajaAutomatica(sucursalId: string, userId: string, fecha: string): Promise<Caja> {
    try {
      let empresaId: string | null = null
      try {
        const { data: suc } = await supabase.from('sucursales').select('empresa_id').eq('id', sucursalId).single()
        empresaId = (suc as { empresa_id?: string } | null)?.empresa_id ?? null
      } catch {
        const perfil = await perfilesService.getPerfilActual()
        empresaId = perfil?.empresa_id ?? perfil?.compania_id ?? null
      }
      const insertPayload: Record<string, unknown> = {
        sucursal_id: sucursalId,
        monto_apertura: 0,
        estado: 'Abierta',
      }
      if (empresaId) insertPayload.empresa_id = empresaId

      const { data, error } = await (supabase as any)
        .from('cajas')
        .insert(insertPayload)
        .select('*')
        .single()

      if (error) {
        const inicioDia = `${fecha}T00:00:00`
        const finDia = `${fecha}T23:59:59.999`
        const { data: existingData } = await supabase
          .from('cajas')
          .select('*')
          .eq('sucursal_id', sucursalId)
          .gte('created_at', inicioDia)
          .lte('created_at', finDia)
          .limit(1)
          .single()
        if (existingData) {
          const row = existingData as Record<string, unknown>
          return {
            ...row,
            usuario_id: row.usuario_id ?? userId,
            monto_cierre_esperado: (row.monto_cierre_esperado as number) ?? 0,
            fecha: (row.created_at as string)?.slice(0, 10) ?? fecha,
          } as Caja
        }
        throw error
      }

      const row = data as Record<string, unknown>
      return {
        ...row,
        fecha: (row.created_at as string)?.slice(0, 10) ?? fecha,
      } as Caja
    } catch (error) {
      console.error('Error creando caja automática:', error)
      throw error
    }
  },

  /**
   * Verifica si la caja está abierta para la sucursal actual o específica
   */
  async estaCajaAbierta(sucursalIdParam?: string): Promise<boolean> {
    try {
      const caja = await this.getCajaAbiertaActual(sucursalIdParam)
      return !!caja && caja.estado === 'Abierta'
    } catch (error) {
      console.error('Error verificando estado de caja:', error)
      return false
    }
  },

  /**
   * Actualiza el monto de apertura de la caja del día
   * Ya no "abre" la caja, solo actualiza el monto inicial si se proporciona
   */
  async abrirCaja(montoApertura: number, observaciones?: string): Promise<Caja> {
    try {
      // Obtener o crear la caja automáticamente
      const caja = await this.getCajaAbiertaActual()
      if (!caja) {
        throw new Error('No se pudo obtener o crear la caja')
      }

      const sucursalId = caja.sucursal_id
      let empresaId: string | null = null
      if (sucursalId) {
        try {
          const { data: suc } = await supabase.from('sucursales').select('empresa_id').eq('id', sucursalId).single()
          empresaId = (suc as { empresa_id?: string } | null)?.empresa_id ?? null
        } catch {
          const perfil = await perfilesService.getPerfilActual()
          empresaId = perfil?.empresa_id ?? perfil?.compania_id ?? null
        }
      }

      // Actualizar el monto de apertura (diferencia/updated_at pueden no existir en el esquema)
      const payload: Record<string, unknown> = {
        monto_apertura: montoApertura,
        monto_cierre_esperado: montoApertura,
        monto_cierre_real: null,
        estado: 'Abierta',
        observaciones: observaciones || null,
      }
      if (empresaId) payload.empresa_id = empresaId
      let updatePayload = { ...payload, diferencia: null, updated_at: new Date().toISOString() }
      let result = await (supabase as any).from('cajas').update(updatePayload).eq('id', caja.id).select('*').single()
      if (result.error && (result.error.message?.includes('diferencia') || result.error.message?.includes('schema cache') || result.error.message?.includes('column'))) {
        result = await (supabase as any).from('cajas').update(payload).eq('id', caja.id).select('*').single()
      }
      const { data, error } = result
      if (error) throw error

      // Cargar sucursal
      if (data && data.sucursal_id) {
        try {
          const { data: sucursalData } = await supabase
            .from('sucursales')
            .select('*')
            .eq('id', data.sucursal_id)
            .single()
          
          if (sucursalData) {
            data.sucursal = sucursalData
          }
        } catch (sucursalError) {
          console.warn('No se pudo cargar la información de la sucursal:', sucursalError)
        }
      }

      // Registrar actividad
      const { actividadService } = await import('./actividad')
      await actividadService.registrarActividad(
        `Actualizó el fondo de caja a $${montoApertura.toLocaleString()}`,
        observaciones || `Fondo de caja actualizado`,
        'caja',
        data.id
      )

      return data
    } catch (error) {
      console.error('Error actualizando caja:', error)
      throw error
    }
  },

  /**
   * Actualiza el fondo de caja para una sucursal específica (Admin)
   */
  async abrirCajaSucursal(
    sucursalId: string,
    montoApertura: number,
    observaciones?: string,
    ip?: string
  ): Promise<Caja> {
    try {
      // Obtener o crear la caja del día (abierta o cerrada) para no duplicar filas
      const hoy = new Date().toISOString().split('T')[0]
      const inicioDia = `${hoy}T00:00:00`
      const finDia = `${hoy}T23:59:59.999`
      const { data: cajasDelDia } = await supabase
        .from('cajas')
        .select('*')
        .eq('sucursal_id', sucursalId)
        .gte('created_at', inicioDia)
        .lte('created_at', finDia)
        .order('created_at', { ascending: false })
        .limit(1)
      let caja = cajasDelDia?.[0] as Caja | undefined
      if (!caja) {
        const { data: { user } } = await supabase.auth.getUser()
        caja = await this.crearCajaAutomatica(sucursalId, user?.id ?? '', hoy)
        // La nueva caja ya está Abierta; solo actualizamos monto y empresa_id
      }

      let empresaId: string | null = null
      try {
        const { data: suc } = await supabase.from('sucursales').select('empresa_id').eq('id', sucursalId).single()
        empresaId = (suc as { empresa_id?: string } | null)?.empresa_id ?? null
      } catch {
        // ignorar
      }

      const payload: Record<string, unknown> = {
        monto_apertura: montoApertura,
        monto_cierre_esperado: montoApertura,
        monto_cierre_real: null,
        estado: 'Abierta',
        observaciones: observaciones || null,
      }
      if (empresaId) payload.empresa_id = empresaId
      let result = await (supabase as any).from('cajas').update({ ...payload, diferencia: null, updated_at: new Date().toISOString() }).eq('id', caja.id).select('*').single()
      if (result.error && (result.error.message?.includes('diferencia') || result.error.message?.includes('schema cache') || result.error.message?.includes('column'))) {
        result = await (supabase as any).from('cajas').update(payload).eq('id', caja.id).select('*').single()
      }
      const { data, error } = result
      if (error) throw error

      // Registrar actividad
      const { actividadService } = await import('./actividad')
      const detalleBase = observaciones || `Caja abierta por administrador`
      const detalle = ip ? `${detalleBase} (IP: ${ip})` : detalleBase
      await actividadService.registrarActividad(
        `Abrió caja (Admin) - Fondo $${montoApertura.toLocaleString()}`,
        detalle,
        'caja',
        data.id
      )

      return data
    } catch (error) {
      console.error('Error actualizando caja (admin):', error)
      throw error
    }
  },

  /**
   * Cierra la caja de la sucursal actual
   */
  async cerrarCaja(montoCierreReal: number, observaciones?: string): Promise<Caja> {
    try {
      const cajaAbierta = await this.getCajaAbiertaActual()
      if (!cajaAbierta) {
        throw new Error('No hay caja abierta para cerrar')
      }

      // Calcular monto esperado en tiempo real: apertura + ingresos - salidas
      const sucursalParaPagos = cajaAbierta.sucursal_id || undefined
      const [ingresosDia, salidasDia] = await Promise.all([
        this.getIngresosDelDia(cajaAbierta.fecha, sucursalParaPagos),
        this.getSalidasDelDia(cajaAbierta.id),
      ])
      const ingresosMovimientos = (await this.getMovimientosCaja(cajaAbierta.id))
        .filter((m) => m.tipo === 'Entrada')
        .reduce((sum, m) => sum + (m.monto || 0), 0)
      const montoEsperado =
        (cajaAbierta.monto_apertura ?? 0) + ingresosDia + ingresosMovimientos - salidasDia

      // Calcular diferencia (sobrante o faltante)
      const diferencia = montoCierreReal - montoEsperado

      const payload: Record<string, unknown> = {
        monto_cierre_real: montoCierreReal,
        monto_cierre_esperado: montoEsperado,
        estado: 'Cerrada',
        observaciones: observaciones || null,
      }
      let result = await (supabase as any).from('cajas').update({ ...payload, diferencia, updated_at: new Date().toISOString() }).eq('id', cajaAbierta.id).select('*').single()
      if (result.error && (result.error.message?.includes('diferencia') || result.error.message?.includes('schema cache') || result.error.message?.includes('column'))) {
        result = await (supabase as any).from('cajas').update(payload).eq('id', cajaAbierta.id).select('*').single()
      }
      const { data: rawData, error } = result
      if (error) throw error
      const data = rawData ? { ...rawData, diferencia } : rawData

      // Intentar cargar la sucursal por separado
      if (data && data.sucursal_id) {
        try {
          const { data: sucursalData } = await supabase
            .from('sucursales')
            .select('*')
            .eq('id', data.sucursal_id)
            .single()
          
          if (sucursalData) {
            data.sucursal = sucursalData
          }
        } catch (sucursalError) {
          console.warn('No se pudo cargar la información de la sucursal:', sucursalError)
        }
      }

      // Registrar actividad
      const { actividadService } = await import('./actividad')
      const diferenciaTexto = diferencia >= 0 
        ? `Sobrante: $${diferencia.toLocaleString()}`
        : `Faltante: $${Math.abs(diferencia).toLocaleString()}`
      
      await actividadService.registrarActividad(
        `Cerró la caja. Esperado: $${montoEsperado.toLocaleString()}, Real: $${montoCierreReal.toLocaleString()}`,
        diferenciaTexto,
        'caja',
        data.id
      )

      // Si hay faltante, generar alerta para admin
      if (diferencia < 0) {
        console.warn(`⚠️ ALERTA: Faltante de $${Math.abs(diferencia).toLocaleString()} en la caja ${cajaAbierta.id}`)
        // Aquí podrías enviar notificación al admin
      }

      return data
    } catch (error) {
      console.error('Error cerrando caja:', error)
      throw error
    }
  },

  /**
   * Cierra la caja (o todas las abiertas) de una sucursal (Admin). Un solo clic cierra todas.
   */
  async cerrarCajaSucursal(
    sucursalId: string,
    montoCierreReal: number,
    observaciones?: string,
    ip?: string
  ): Promise<Caja> {
    try {
      const hoy = new Date().toISOString().split('T')[0]
      const inicioDia = `${hoy}T00:00:00`
      const finDia = `${hoy}T23:59:59.999`
      const { data: cajasAbiertas } = await supabase
        .from('cajas')
        .select('*')
        .eq('sucursal_id', sucursalId)
        .eq('estado', 'Abierta')
        .gte('created_at', inicioDia)
        .lte('created_at', finDia)
        .order('created_at', { ascending: false })
      if (!cajasAbiertas?.length) {
        throw new Error('No hay caja abierta para cerrar')
      }
      const cajaPrincipal = cajasAbiertas[0] as Record<string, unknown>
      const montoEsperado = (cajaPrincipal.monto_cierre_esperado as number) ?? 0
      const diferencia = montoCierreReal - montoEsperado
      const payload: Record<string, unknown> = {
        monto_cierre_real: montoCierreReal,
        estado: 'Cerrada',
        observaciones: observaciones || null,
      }
      const updatePayload = { ...payload, diferencia, updated_at: new Date().toISOString() }
      for (const c of cajasAbiertas as { id: string }[]) {
        let result = await (supabase as any).from('cajas').update(updatePayload).eq('id', c.id).select('*').single()
        if (result.error && (result.error.message?.includes('diferencia') || result.error.message?.includes('schema cache') || result.error.message?.includes('column'))) {
          result = await (supabase as any).from('cajas').update(payload).eq('id', c.id).select('*').single()
        }
        if (result.error) throw result.error
      }
      const data = { ...cajaPrincipal, ...payload, diferencia } as Caja
      const { actividadService } = await import('./actividad')
      const detalleBase = observaciones || `Caja cerrada por administrador`
      const detalle = ip ? `${detalleBase} (IP: ${ip})` : detalleBase
      await actividadService.registrarActividad(
        `Cerró caja (Admin) - Monto $${montoCierreReal.toLocaleString()}`,
        detalle,
        'caja',
        (cajaPrincipal.id as string)
      )
      return data
    } catch (error) {
      console.error('Error cerrando caja (admin):', error)
      throw error
    }
  },

  /**
   * Obtiene el historial de cajas de la sucursal actual
   */
  async getHistorialCajas(diasAtras: number = 30): Promise<Caja[]> {
    try {
      const sucursalId = await perfilesService.getSucursalActual()
      if (!sucursalId) {
        throw new Error('No hay sucursal asignada')
      }

      const fechaLimite = new Date()
      fechaLimite.setDate(fechaLimite.getDate() - diasAtras)
      const fechaLimiteStr = fechaLimite.toISOString().split('T')[0]

      const desde = `${fechaLimiteStr}T00:00:00`
      const { data, error } = await supabase
        .from('cajas')
        .select('*')
        .eq('sucursal_id', sucursalId)
        .gte('created_at', desde)
        .order('created_at', { ascending: false }) as { data: { sucursal_id?: string; sucursal?: unknown; [key: string]: unknown }[] | null; error: unknown }

      if (error) throw error

      // Cargar sucursales por separado si es necesario
      if (data && data.length > 0) {
        const sucursalIds = [...new Set(data.map(c => c.sucursal_id).filter((id): id is string => Boolean(id)))]
        if (sucursalIds.length > 0) {
          try {
            const { data: sucursalesData } = await supabase
              .from('sucursales')
              .select('*')
              .in('id', sucursalIds) as { data: { id: string; [key: string]: unknown }[] | null }
            
            if (sucursalesData) {
              const sucursalesMap = new Map(sucursalesData.map(s => [s.id, s]))
              data.forEach(caja => {
                if (caja.sucursal_id && sucursalesMap.has(caja.sucursal_id)) {
                  caja.sucursal = sucursalesMap.get(caja.sucursal_id)
                }
              })
            }
          } catch (sucursalError) {
            console.warn('No se pudieron cargar las sucursales:', sucursalError)
          }
        }
      }

      return (data || []) as unknown as Caja[]
    } catch (error) {
      console.error('Error obteniendo historial de cajas:', error)
      throw error
    }
  },

  /**
   * Obtiene todos los movimientos de caja de una caja específica
   */
  async getMovimientosCaja(cajaId: string): Promise<MovimientoCaja[]> {
    try {
      const runQuery = async (client: typeof supabase, useView: boolean) => {
        return await (client as any)
          .from(useView ? 'movimientos_caja_resumen' : 'movimientos_caja')
          .select('*')
          .eq('caja_id', cajaId)
          .order('fecha_hora', { ascending: true })
      }

      const runResult = await runQuery(supabase, true) as { data: { usuario_id?: string; usuario_nombre?: string; usuario_email?: string; [key: string]: unknown }[] | null; error: unknown }
      let { data, error } = runResult
      if (error) {
        const fallback = await runQuery(supabase, false) as { data: { usuario_id?: string; usuario_nombre?: string; usuario_email?: string; [key: string]: unknown }[] | null; error: unknown }
        data = fallback.data
        error = fallback.error
      }

      if (error) throw error
      let movimientos: Array<Record<string, unknown> & { usuario_id?: string; usuario_nombre?: string; usuario_email?: string }> = (data || []) as Array<Record<string, unknown> & { usuario_id?: string; usuario_nombre?: string; usuario_email?: string }>
      if (movimientos.length === 0) return []

      const userIds = [...new Set(movimientos.map(m => m.usuario_id).filter((id): id is string => Boolean(id)))]
      if (userIds.length > 0) {
        let perfilesQuery = supabase
          .from('perfiles')
          .select('user_id,nombre_completo,email')
          .in('user_id', userIds)
        let { data: perfilesData, error: perfilesError } = await perfilesQuery
        if (perfilesError && perfilesError.message?.includes('column') && perfilesError.message.includes('app_id')) {
          const fallback = await supabaseRaw
            .from('perfiles')
            .select('user_id,nombre_completo,email')
            .in('user_id', userIds)
          perfilesData = fallback.data
        }
        const perfilesMap = new Map((perfilesData || []).map((p: { user_id: string; nombre_completo?: string | null; email?: string | null }) => [p.user_id, p]))
        movimientos = movimientos.map(mov => {
          const perfil = mov.usuario_id ? perfilesMap.get(mov.usuario_id) : undefined
          return {
            ...mov,
            usuario: perfil,
            usuario_nombre: (mov.usuario_nombre || perfil?.nombre_completo) ?? undefined,
            usuario_email: (mov.usuario_email || perfil?.email) ?? undefined,
          }
        })
      }

      return movimientos as unknown as MovimientoCaja[]
    } catch (error) {
      console.error('Error obteniendo movimientos de caja:', error)
      throw error
    }
  },

  /**
   * Obtiene pagos del día como movimientos de caja (Entradas) para mostrar en el historial diario
   */
  async getPagosDelDiaMovimientos(
    cajaId: string,
    fecha?: string,
    sucursalIdParam?: string
  ): Promise<MovimientoCaja[]> {
    try {
      const sucursalId = sucursalIdParam ?? (await perfilesService.getSucursalActual()) ?? null

      const { startISO, endISO } = getTodayLocalRange(fecha)
      const perfil = await perfilesService.getPerfilActual()
      const empresaId = getCompaniaActual() || perfil?.empresa_id || perfil?.compania_id || null

      // Usar fecha_pago para el rango del día (siempre presente); fecha_hora puede ser null en pagos antiguos
      let query = supabase
        .from('pagos')
        .select(
          'id,venta_id,monto,fecha_hora,fecha_pago,created_at,numero_cuota,sucursal_donde_se_cobro,sucursal_id,empresa_id,compania_id,usuario_que_cobro'
        )
        .gte('fecha_pago', startISO)
        .lte('fecha_pago', endISO)

      let { data, error } = await query
      if (error && error.message?.includes('column') && error.message.includes('usuario_que_cobro')) {
        const fallback = await supabase
          .from('pagos')
          .select('id,venta_id,monto,fecha_hora,fecha_pago,created_at,numero_cuota,sucursal_donde_se_cobro,sucursal_id,empresa_id,compania_id')
          .gte('fecha_pago', startISO)
          .lte('fecha_pago', endISO)
        data = fallback.data as any
        error = fallback.error
      }

      if (error) throw error

      let pagosFiltrados = data || []
      if (empresaId) {
        pagosFiltrados = pagosFiltrados.filter((pago: any) =>
          pago.empresa_id === empresaId || pago.compania_id === empresaId
        )
      }
      if (sucursalId) {
        pagosFiltrados = pagosFiltrados.filter((pago: any) => {
          const sucursalCobro = pago.sucursal_donde_se_cobro
          const sucursalPago = pago.sucursal_id
          return (
            sucursalCobro === sucursalId ||
            sucursalPago === sucursalId ||
            (!sucursalCobro && !sucursalPago)
          )
        })
      }

      const pagosDelDia = pagosFiltrados
      if (!pagosDelDia.length) return []

      const ventaIds = [...new Set(pagosDelDia.map((p: any) => p.venta_id).filter(Boolean))]
      const { data: ventasData } = ventaIds.length
        ? await supabase
            .from('ventas')
            .select('id,cliente_id,numero_prestamo')
            .in('id', ventaIds)
        : { data: [] }
      const ventasMap = new Map((ventasData || []).map((v: any) => [v.id, v]))

      const clienteIds = [...new Set((ventasData || []).map((v: any) => v.cliente_id).filter(Boolean))]
      const { data: clientesData } = clienteIds.length
        ? await supabase
            .from('clientes')
            .select('id,nombre_completo,email')
            .in('id', clienteIds)
        : { data: [] }
      const clientesMap = new Map((clientesData || []).map((c: any) => [c.id, c]))

      const cobradorIds = [...new Set(pagosDelDia.map((p: any) => p.usuario_que_cobro).filter(Boolean))]
      const { data: perfilesData } = cobradorIds.length
        ? await supabase
            .from('perfiles')
            .select('user_id,nombre_completo,email')
            .in('user_id', cobradorIds)
        : { data: [] }
      const perfilesMap = new Map((perfilesData || []).map((p: any) => [p.user_id, p]))

      return pagosDelDia.map((p: any) => {
        const venta = ventasMap.get(p.venta_id)
        const cliente = venta ? clientesMap.get(venta.cliente_id) : undefined
        const perfilCobrador = p.usuario_que_cobro ? perfilesMap.get(p.usuario_que_cobro) : undefined
        const fechaPago = p.fecha_hora || p.fecha_pago || p.created_at
        const numeroPrestamo = venta?.numero_prestamo || p.venta_id
        const numeroCuota = p.numero_cuota === null || p.numero_cuota === undefined ? 'Inicial' : p.numero_cuota
        const concepto = `Pago ${numeroPrestamo || ''}`.trim()
        const observaciones = cliente?.nombre_completo
          ? `Cliente: ${cliente.nombre_completo} | Cuota ${numeroCuota}`
          : `Cuota ${numeroCuota}`
        return {
          id: `pago-${p.id}`,
          caja_id: cajaId,
          sucursal_id: sucursalId ?? '',
          usuario_id: p.usuario_que_cobro || 'sistema',
          tipo: 'Entrada',
          monto: p.monto || 0,
          concepto,
          observaciones,
          fecha_hora: fechaPago,
          usuario: perfilCobrador
            ? { id: perfilCobrador.user_id, nombre_completo: perfilCobrador.nombre_completo, email: perfilCobrador.email }
            : undefined,
        }
      })
    } catch (error) {
      console.error('Error obteniendo pagos del día como movimientos:', error)
      return []
    }
  },

  /**
   * Registra un movimiento de caja (entrada o salida)
   */
  async registrarMovimiento(
    cajaId: string,
    tipo: 'Entrada' | 'Salida',
    monto: number,
    concepto: string,
    observaciones?: string
  ): Promise<MovimientoCaja> {
    try {
      const sucursalId = await perfilesService.getSucursalActual()
      if (!sucursalId) {
        throw new Error('No hay sucursal asignada')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Verificar que la caja esté abierta
      const caja = await supabase
        .from('cajas')
        .select('*')
        .eq('id', cajaId)
        .single() as { data: { estado?: string } | null; error: { message?: string } | null }

      if (caja.error) throw caja.error
      if (caja.data?.estado !== 'Abierta') {
        throw new Error('No se pueden registrar movimientos en una caja cerrada')
      }

      const perfil = await perfilesService.getPerfilActual()
      const empresaId: string | null = perfil?.empresa_id ?? perfil?.compania_id ?? null
      const appIdValue = getAppId()
      const appId = appIdValue != null && appIdValue !== '' ? appIdValue : 'electro'

      const insertPayload: Record<string, unknown> = {
        caja_id: cajaId,
        sucursal_id: sucursalId,
        usuario_id: user.id,
        tipo,
        monto,
        concepto,
        observaciones: observaciones || null,
      }
      if (empresaId) {
        insertPayload.empresa_id = empresaId
        insertPayload.compania_id = empresaId
      }
      insertPayload.app_id = appId

      let { data, error } = await (supabase as any)
        .from('movimientos_caja')
        .insert(insertPayload)
        .select()
        .single()

      if (error && (error.message?.includes('column') || (error as any).code === '42703')) {
        delete (insertPayload as any).empresa_id
        delete (insertPayload as any).compania_id
        delete (insertPayload as any).app_id
        const retry = await (supabase as any).from('movimientos_caja').insert(insertPayload).select().single()
        data = retry.data
        error = retry.error
      }
      if (error) throw error

      // Registrar actividad
      const { actividadService } = await import('./actividad')
      const tipoTexto = tipo === 'Entrada' ? 'entrada' : 'salida'
      await actividadService.registrarActividad(
        `Registró ${tipoTexto} de $${monto.toLocaleString()}`,
        `Concepto: ${concepto}`,
        'movimiento_caja',
        data.id
      )

      return data
    } catch (error) {
      console.error('Error registrando movimiento de caja:', error)
      throw error
    }
  },

  /**
   * ADMIN: Obtiene movimientos de caja con filtros
   */
  async getMovimientosAdmin(params: {
    sucursalId?: string
    fechaInicio?: string
    fechaFin?: string
    usuario?: string
    limit?: number
  }): Promise<MovimientoCaja[]> {
    const { sucursalId, fechaInicio, fechaFin, usuario, limit = 500 } = params

    const buildRange = () => {
      const inicio = fechaInicio ? new Date(fechaInicio) : new Date()
      inicio.setHours(0, 0, 0, 0)
      const fin = fechaFin ? new Date(fechaFin) : new Date()
      fin.setHours(23, 59, 59, 999)
      return {
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
      }
    }

    const { inicio, fin } = buildRange()

    const runQuery = async (client: typeof supabase, useCreatedAt: boolean) => {
      let query = client
        .from('movimientos_caja')
        .select('*')
        .gte(useCreatedAt ? 'created_at' : 'fecha_hora', inicio)
        .lte(useCreatedAt ? 'created_at' : 'fecha_hora', fin)
        .order(useCreatedAt ? 'created_at' : 'fecha_hora', { ascending: false })
        .limit(limit)

      if (sucursalId) {
        query = query.eq('sucursal_id', sucursalId)
      }

      const { data, error } = await query
      return { data, error }
    }

    let { data, error } = await runQuery(supabase, false)
    if (error && error.message?.includes('column') && error.message?.includes('app_id')) {
      const fallback = await runQuery(supabaseRaw, false)
      data = fallback.data
      error = fallback.error
    }

    if (error) {
      throw error
    }

    let movimientos = data || []
    if (movimientos.length === 0) {
      const fallback = await runQuery(supabase, true)
      movimientos = fallback.data || []
    }
    if (movimientos.length === 0) return []

    const sucursalIds = [...new Set(movimientos.map((m: any) => m.sucursal_id).filter(Boolean))]
    const userIds = [...new Set(movimientos.map((m: any) => m.usuario_id).filter(Boolean))]

    const fetchSucursales = async (client: typeof supabase) => {
      let query = client.from('sucursales').select('id,nombre')
      if (sucursalIds.length > 0) {
        query = query.in('id', sucursalIds)
      }
      const { data: sucursalesData, error: sucursalesError } = await query
      return { data: sucursalesData, error: sucursalesError }
    }

    const fetchPerfiles = async (client: typeof supabase) => {
      let query = client.from('perfiles').select('user_id,nombre_completo,email')
      if (userIds.length > 0) {
        query = query.in('user_id', userIds)
      }
      const { data: perfilesData, error: perfilesError } = await query
      return { data: perfilesData, error: perfilesError }
    }

    let { data: sucursalesData, error: sucursalesError } = await fetchSucursales(supabase)
    if (sucursalesError && sucursalesError.message?.includes('column') && sucursalesError.message.includes('app_id')) {
      const fallback = await fetchSucursales(supabaseRaw)
      sucursalesData = fallback.data
    }

    let { data: perfilesData, error: perfilesError } = await fetchPerfiles(supabase)
    if (perfilesError && perfilesError.message?.includes('column') && perfilesError.message.includes('app_id')) {
      const fallback = await fetchPerfiles(supabaseRaw)
      perfilesData = fallback.data
    }

    const sucursalesMap = new Map((sucursalesData || []).map((s: any) => [s.id, s.nombre]))
    const perfilesMap = new Map((perfilesData || []).map((p: any) => [p.user_id, p]))

    let result = movimientos.map((mov: any) => ({
      ...mov,
      usuario: perfilesMap.get(mov.usuario_id) || undefined,
      sucursal_nombre: sucursalesMap.get(mov.sucursal_id),
    }))

    return result
  },

  /**
   * Obtiene movimientos con resumen de totales por periodos (dia/semana/mes/anio)
   */
  async getMovimientosResumen(params: {
    sucursalId?: string
    fechaInicio?: string
    fechaFin?: string
    limit?: number
  }): Promise<{ movimientos: MovimientoCajaResumen[]; totales: ResumenTotalesCaja }> {
    const { sucursalId: sucursalIdParam, fechaInicio, fechaFin, limit = 500 } = params
    try {
      const sucursalId = sucursalIdParam || await perfilesService.getSucursalActual()
      if (!sucursalId) {
        throw new Error('No hay sucursal asignada')
      }

      const perfil = await perfilesService.getPerfilActual()
      const empresaId = getCompaniaActual() || perfil?.empresa_id || perfil?.compania_id || null

      const start = fechaInicio ? new Date(`${fechaInicio}T00:00:00`) : new Date()
      if (!fechaInicio) {
        start.setDate(start.getDate() - 30)
      }
      start.setHours(0, 0, 0, 0)

      const end = fechaFin ? new Date(`${fechaFin}T23:59:59`) : new Date()
      end.setHours(23, 59, 59, 999)

      const sumTotales = (data: any[]): { ingresos: number; salidas: number; neto: number } => {
        const ingresos = data
          .filter((row) => row.tipo === 'Entrada')
          .reduce((sum, row) => sum + (row.monto || 0), 0)
        const salidas = data
          .filter((row) => row.tipo === 'Salida')
          .reduce((sum, row) => sum + (row.monto || 0), 0)
        return { ingresos, salidas, neto: ingresos - salidas }
      }

      const filtrarPagos = (pagos: any[]) => {
        let pagosFiltrados = pagos || []
        if (empresaId) {
          pagosFiltrados = pagosFiltrados.filter(
            (pago: any) => pago.empresa_id === empresaId || pago.compania_id === empresaId
          )
        }
        if (sucursalId) {
          pagosFiltrados = pagosFiltrados.filter((pago: any) => {
            const sucursalCobro = pago.sucursal_donde_se_cobro
            const sucursalPago = pago.sucursal_id
            return (
              sucursalCobro === sucursalId ||
              sucursalPago === sucursalId ||
              (!sucursalCobro && !sucursalPago)
            )
          })
        }
        return pagosFiltrados
      }

      const fetchPagosEnRango = async (rangeStart: Date, rangeEnd: Date) => {
        const baseSelect =
          'id,venta_id,monto,fecha_hora,fecha_pago,created_at,numero_cuota,sucursal_donde_se_cobro,sucursal_id,empresa_id,compania_id,usuario_que_cobro'
        let { data, error } = await supabase
          .from('pagos')
          .select(baseSelect)
          .gte('fecha_pago', rangeStart.toISOString())
          .lte('fecha_pago', rangeEnd.toISOString())

        if (error && error.message?.includes('column') && error.message.includes('usuario_que_cobro')) {
          const fallback = await supabase
            .from('pagos')
            .select('id,venta_id,monto,fecha_hora,fecha_pago,created_at,numero_cuota,sucursal_donde_se_cobro,sucursal_id,empresa_id,compania_id')
            .gte('fecha_pago', rangeStart.toISOString())
            .lte('fecha_pago', rangeEnd.toISOString())
          data = fallback.data as any
          error = fallback.error
        }

        if (error) throw error
        return filtrarPagos(data || [])
      }

      const fetchTotales = async (rangeStart: Date, rangeEnd: Date) => {
        const { data, error } = await supabase
          .from('movimientos_caja')
          .select('tipo,monto')
          .eq('sucursal_id', sucursalId)
          .gte('fecha_hora', rangeStart.toISOString())
          .lte('fecha_hora', rangeEnd.toISOString())

        if (error) throw error
        const movimientosTotales = sumTotales(data || [])
        const pagos = await fetchPagosEnRango(rangeStart, rangeEnd)
        const totalPagos = (pagos || []).reduce((sum: number, pago: any) => sum + (pago.monto || 0), 0)
        const ingresos = movimientosTotales.ingresos + totalPagos
        return {
          ingresos,
          salidas: movimientosTotales.salidas,
          neto: ingresos - movimientosTotales.salidas,
        }
      }

      const now = new Date()
      const startDay = new Date(now)
      startDay.setHours(0, 0, 0, 0)
      const endDay = new Date(now)
      endDay.setHours(23, 59, 59, 999)

      const startWeek = new Date(now)
      startWeek.setDate(startWeek.getDate() - startWeek.getDay())
      startWeek.setHours(0, 0, 0, 0)
      const endWeek = new Date(endDay)

      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      startMonth.setHours(0, 0, 0, 0)
      const endMonth = new Date(endDay)

      const startYear = new Date(now.getFullYear(), 0, 1)
      startYear.setHours(0, 0, 0, 0)
      const endYear = new Date(endDay)

      const [totDia, totSemana, totMes, totAnio] = await Promise.all([
        fetchTotales(startDay, endDay),
        fetchTotales(startWeek, endWeek),
        fetchTotales(startMonth, endMonth),
        fetchTotales(startYear, endYear),
      ])

      const totales: ResumenTotalesCaja = {
        dia: totDia,
        semana: totSemana,
        mes: totMes,
        anio: totAnio,
      }

      const buildQuery = (client: typeof supabase, useView: boolean) => {
        let query = (client as any)
          .from(useView ? 'movimientos_caja_resumen' : 'movimientos_caja')
          .select('*')
          .eq('sucursal_id', sucursalId)
          .gte('fecha_hora', start.toISOString())
          .lte('fecha_hora', end.toISOString())
          .order('fecha_hora', { ascending: false })
          .limit(limit)
        return query
      }

      let { data, error } = await buildQuery(supabase, true)
      if (error) {
        const fallback = await buildQuery(supabase, false)
        data = fallback.data
        error = fallback.error
      }

      if (error) {
        throw error
      }

      let movimientos: MovimientoCajaResumen[] = (data || []) as any
      const pagosEnRango = await fetchPagosEnRango(start, end)

      if (pagosEnRango.length > 0) {
        const ventaIds = [...new Set(pagosEnRango.map((p: any) => p.venta_id).filter(Boolean))]
        const { data: ventasData } = ventaIds.length
          ? await supabase
              .from('ventas')
              .select('id,cliente_id,numero_prestamo')
              .in('id', ventaIds)
          : { data: [] }
        const ventasMap = new Map((ventasData || []).map((v: any) => [v.id, v]))

        const clienteIds = [...new Set((ventasData || []).map((v: any) => v.cliente_id).filter(Boolean))]
        const { data: clientesData } = clienteIds.length
          ? await supabase
              .from('clientes')
              .select('id,nombre_completo,email')
              .in('id', clienteIds)
          : { data: [] }
        const clientesMap = new Map((clientesData || []).map((c: any) => [c.id, c]))

        const cobradorIds = [...new Set(pagosEnRango.map((p: any) => p.usuario_que_cobro).filter(Boolean))]
        let perfilesMap = new Map<string, any>()
        if (cobradorIds.length > 0) {
          let perfilesQuery = supabase
            .from('perfiles')
            .select('user_id,nombre_completo,email')
            .in('user_id', cobradorIds)
          let { data: perfilesData, error: perfilesError } = await perfilesQuery
          if (perfilesError && perfilesError.message?.includes('column') && perfilesError.message.includes('app_id')) {
            const fallback = await supabaseRaw
              .from('perfiles')
              .select('user_id,nombre_completo,email')
              .in('user_id', cobradorIds)
            perfilesData = fallback.data
          }
          perfilesMap = new Map((perfilesData || []).map((p: any) => [p.user_id, p]))
        }

        const pagosMovimientos: MovimientoCajaResumen[] = pagosEnRango.map((p: any) => {
          const venta = ventasMap.get(p.venta_id)
          const cliente = venta ? clientesMap.get(venta.cliente_id) : undefined
          const perfilCobrador = p.usuario_que_cobro ? perfilesMap.get(p.usuario_que_cobro) : undefined
          const fechaPago = p.fecha_hora || p.fecha_pago || p.created_at
          const numeroPrestamo = venta?.numero_prestamo || p.venta_id
          const numeroCuota = p.numero_cuota === null || p.numero_cuota === undefined ? 'Inicial' : p.numero_cuota
          return {
            id: `pago-${p.id}`,
            caja_id: '',
            sucursal_id: sucursalId,
            usuario_id: p.usuario_que_cobro || 'sistema',
            tipo: 'Entrada',
            monto: p.monto || 0,
            concepto: `Pago ${numeroPrestamo || ''}`.trim(),
            observaciones: cliente?.nombre_completo
              ? `Cliente: ${cliente.nombre_completo} | Cuota ${numeroCuota}`
              : `Cuota ${numeroCuota}`,
            fecha_hora: fechaPago,
            usuario: perfilCobrador
              ? { id: perfilCobrador.user_id, nombre_completo: perfilCobrador.nombre_completo, email: perfilCobrador.email }
              : undefined,
            usuario_nombre: perfilCobrador?.nombre_completo,
            usuario_email: perfilCobrador?.email,
          }
        })

        movimientos = [...movimientos, ...pagosMovimientos]
      }

      movimientos.sort((a: any, b: any) => {
        const fechaA = new Date(a.fecha_hora || a.created_at || 0).getTime()
        const fechaB = new Date(b.fecha_hora || b.created_at || 0).getTime()
        return fechaB - fechaA
      })

      const toDayKey = (date: Date) => date.toISOString().split('T')[0]
      const toWeekKey = (date: Date) => {
        const weekStart = new Date(date)
        const day = weekStart.getDay()
        const diff = (day + 6) % 7
        weekStart.setDate(weekStart.getDate() - diff)
        weekStart.setHours(0, 0, 0, 0)
        return weekStart.toISOString().split('T')[0]
      }
      const toMonthKey = (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const toYearKey = (date: Date) => `${date.getFullYear()}`

      const ingresosDia = new Map<string, number>()
      const ingresosSemana = new Map<string, number>()
      const ingresosMes = new Map<string, number>()
      const ingresosAnio = new Map<string, number>()

      const getFechaMovimiento = (mov: any) => {
        if (mov.fecha_hora) return new Date(mov.fecha_hora)
        if (mov.created_at) return new Date(mov.created_at)
        return new Date()
      }

      movimientos.forEach((mov) => {
        const fecha = getFechaMovimiento(mov)
        if (mov.tipo !== 'Entrada') return
        const dayKey = toDayKey(fecha)
        const weekKey = toWeekKey(fecha)
        const monthKey = toMonthKey(fecha)
        const yearKey = toYearKey(fecha)
        ingresosDia.set(dayKey, (ingresosDia.get(dayKey) || 0) + (mov.monto || 0))
        ingresosSemana.set(weekKey, (ingresosSemana.get(weekKey) || 0) + (mov.monto || 0))
        ingresosMes.set(monthKey, (ingresosMes.get(monthKey) || 0) + (mov.monto || 0))
        ingresosAnio.set(yearKey, (ingresosAnio.get(yearKey) || 0) + (mov.monto || 0))
      })

      if (movimientos.length > 0) {
        const userIds = [...new Set(movimientos.map((m) => m.usuario_id).filter(Boolean))]
        if (userIds.length > 0) {
          let perfilesQuery = supabase.from('perfiles').select('user_id,nombre_completo,email')
          perfilesQuery = perfilesQuery.in('user_id', userIds)
          let { data: perfilesData, error: perfilesError } = await perfilesQuery
          if (perfilesError && perfilesError.message?.includes('column') && perfilesError.message.includes('app_id')) {
            const fallback = await supabaseRaw
              .from('perfiles')
              .select('user_id,nombre_completo,email')
              .in('user_id', userIds)
            perfilesData = fallback.data
          }
          const perfilesMap = new Map((perfilesData || []).map((p: any) => [p.user_id, p]))
          movimientos = movimientos.map((mov: any) => ({
            ...mov,
            usuario: perfilesMap.get(mov.usuario_id),
            usuario_nombre: mov.usuario_nombre || perfilesMap.get(mov.usuario_id)?.nombre_completo,
            usuario_email: mov.usuario_email || perfilesMap.get(mov.usuario_id)?.email,
            ingresos_dia: mov.ingresos_dia ?? ingresosDia.get(toDayKey(getFechaMovimiento(mov))) ?? 0,
            ingresos_semana: mov.ingresos_semana ?? ingresosSemana.get(toWeekKey(getFechaMovimiento(mov))) ?? 0,
            ingresos_mes: mov.ingresos_mes ?? ingresosMes.get(toMonthKey(getFechaMovimiento(mov))) ?? 0,
            ingresos_anio: mov.ingresos_anio ?? ingresosAnio.get(toYearKey(getFechaMovimiento(mov))) ?? 0,
          }))
        }
      } else {
        movimientos = movimientos.map((mov: any) => ({
          ...mov,
          ingresos_dia: mov.ingresos_dia ?? ingresosDia.get(toDayKey(getFechaMovimiento(mov))) ?? 0,
          ingresos_semana: mov.ingresos_semana ?? ingresosSemana.get(toWeekKey(getFechaMovimiento(mov))) ?? 0,
          ingresos_mes: mov.ingresos_mes ?? ingresosMes.get(toMonthKey(getFechaMovimiento(mov))) ?? 0,
          ingresos_anio: mov.ingresos_anio ?? ingresosAnio.get(toYearKey(getFechaMovimiento(mov))) ?? 0,
        }))
      }

      return { movimientos, totales }
    } catch (error) {
      console.error('Error obteniendo movimientos con resumen:', error)
      throw error
    }
  },

  /**
   * Obtiene el resumen de ingresos del día (pagos de clientes cobrados).
   * Incluye todos los pagos de la empresa/sucursal del día (fecha_pago o fecha_hora).
   */
  async getIngresosDelDia(fecha?: string, sucursalIdParam?: string): Promise<number> {
    try {
      const sucursalId = sucursalIdParam ?? (await perfilesService.getSucursalActual()) ?? null
      const fechaStr = fecha ? (fecha.includes('T') ? fecha.slice(0, 10) : fecha) : toLocalDateString(new Date())
      const perfil = await perfilesService.getPerfilActual()
      const empresaId = getCompaniaActual() || perfil?.empresa_id || perfil?.compania_id || null

      // Rango del día: usar fecha YYYY-MM-DD para evitar problemas con DATE vs TIMESTAMPTZ
      const startDay = `${fechaStr}T00:00:00`
      const endDay = `${fechaStr}T23:59:59.999`

      let query = supabase
        .from('pagos')
        .select('monto, fecha_hora, fecha_pago, created_at, sucursal_donde_se_cobro, sucursal_id, empresa_id, compania_id')
        .gte('fecha_pago', startDay)
        .lte('fecha_pago', endDay)

      let { data, error } = await query
      if (error && (error.message?.includes('column') || (error as any).code === '42703')) {
        const fallback = await supabase
          .from('pagos')
          .select('monto, fecha_hora, fecha_pago, created_at, sucursal_donde_se_cobro, sucursal_id, empresa_id, compania_id')
        data = fallback.data as typeof data
        error = fallback.error
        if (!error && data) {
          data = (data as any[]).filter((p: any) => {
            const f = p.fecha_pago || p.fecha_hora || p.created_at
            if (!f) return false
            const d = new Date(f).toISOString().slice(0, 10)
            return d === fechaStr
          })
        }
      }
      if (error) {
        console.error('Error obteniendo ingresos del día:', error)
        return 0
      }

      let pagosFiltrados = data || []
      if (empresaId) {
        pagosFiltrados = pagosFiltrados.filter((pago: any) =>
          pago.empresa_id === empresaId || pago.compania_id === empresaId
        )
      }
      if (sucursalId) {
        pagosFiltrados = pagosFiltrados.filter((pago: any) => {
          const sucursalCobro = pago.sucursal_donde_se_cobro
          const sucursalPago = pago.sucursal_id
          return (
            sucursalCobro === sucursalId ||
            sucursalPago === sucursalId ||
            (!sucursalCobro && !sucursalPago)
          )
        })
      }

      return pagosFiltrados.reduce((sum: number, pago: any) => sum + (pago.monto || 0), 0)
    } catch (error) {
      console.error('Error calculando ingresos del día:', error)
      return 0
    }
  },

  /**
   * Obtiene el resumen de salidas del día (movimientos tipo Salida)
   */
  async getSalidasDelDia(cajaId: string): Promise<number> {
    try {
      const movimientos = await this.getMovimientosCaja(cajaId)
      const salidas = movimientos
        .filter(m => m.tipo === 'Salida')
        .reduce((sum, m) => sum + m.monto, 0)
      return salidas
    } catch (error) {
      console.error('Error calculando salidas del día:', error)
      return 0
    }
  },

  /**
   * Obtiene el resumen de salidas de un período específico por sucursal
   */
  async getSalidasDelPeriodo(sucursalId: string, fecha?: string): Promise<number> {
    try {
      const fechaBusqueda = fecha || new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('movimientos_caja')
        .select('monto')
        .eq('sucursal_id', sucursalId)
        .eq('tipo', 'Salida')
        .gte('fecha_hora', `${fechaBusqueda}T00:00:00`)
        .lt('fecha_hora', `${fechaBusqueda}T23:59:59`) as { data: { monto?: number }[] | null; error: unknown }

      if (error) {
        console.error('Error obteniendo salidas del período:', error)
        return 0
      }

      const total = data?.reduce((sum, movimiento) => sum + (movimiento.monto || 0), 0) || 0
      return total
    } catch (error) {
      console.error('Error calculando salidas del período:', error)
      return 0
    }
  },

  /**
   * Obtiene ingresos y salidas del período para una sucursal (optimizado - una sola consulta)
   */
  async getIngresosYSalidasDelPeriodo(
    sucursalId: string, 
    fechaInicio: string, 
    fechaFin: string
  ): Promise<{ ingresos: number; salidas: number }> {
    try {
      // Obtener empresa_id para filtrar por empresa (seguridad)
      const perfil = await perfilesService.getPerfilActual()
      const empresaId = perfil?.empresa_id

      console.log('📊 [cajasService.getIngresosYSalidasDelPeriodo] Calculando totales:', {
        sucursalId,
        fechaInicio,
        fechaFin,
        empresaId
      })

      // Calcular ingresos (pagos) del período
      const fechaInicioISO = `${fechaInicio}T00:00:00`
      const fechaFinISO = `${fechaFin}T23:59:59`
      
      type PagoRow = { monto?: number; fecha_hora?: string; created_at?: string; fecha_pago?: string; empresa_id?: string; compania_id?: string; sucursal_donde_se_cobro?: string; sucursal_id?: string }
      // Obtener pagos del período (por empresa; sucursal se filtra en memoria para no perder pagos sin sucursal_donde_se_cobro)
      let queryIngresos = supabase
        .from('pagos')
        .select('monto, fecha_hora, created_at, fecha_pago, empresa_id, compania_id, sucursal_donde_se_cobro, sucursal_id')
        .gte('fecha_pago', fechaInicioISO)
        .lte('fecha_pago', fechaFinISO)

      const { data: ingresosData, error: ingresosError } = await queryIngresos as { data: PagoRow[] | null; error: unknown }

      const filtrarPorFecha = (list: PagoRow[]) => {
        return list.filter((pago: any) => {
          const fechaPago = pago.fecha_hora || pago.created_at || pago.fecha_pago
          if (!fechaPago) return false
          const fechaPagoDate = new Date(fechaPago)
          return fechaPagoDate >= new Date(fechaInicioISO) && fechaPagoDate <= new Date(fechaFinISO)
        })
      }
      const filtrarPorSucursal = (list: any[]) => {
        return list.filter((pago: any) => {
          const sc = pago.sucursal_donde_se_cobro
          const si = pago.sucursal_id
          return sc === sucursalId || si === sucursalId || (!sc && !si)
        })
      }

      let totalIngresos = 0
      if (ingresosError) {
        console.error('❌ [cajasService.getIngresosYSalidasDelPeriodo] Error obteniendo ingresos:', ingresosError)
        const { data: fallbackData } = await supabase
          .from('pagos')
          .select('monto, fecha_hora, created_at, fecha_pago, empresa_id, compania_id, sucursal_donde_se_cobro, sucursal_id') as { data: PagoRow[] | null }
        let list = filtrarPorFecha(fallbackData || [])
        if (empresaId) list = list.filter((p: any) => p.empresa_id === empresaId || p.compania_id === empresaId)
        list = filtrarPorSucursal(list)
        totalIngresos = list.reduce((sum, p) => sum + (p.monto || 0), 0)
      } else {
        let list = filtrarPorFecha(ingresosData || [])
        if (empresaId) list = list.filter((p: any) => p.empresa_id === empresaId || p.compania_id === empresaId)
        list = filtrarPorSucursal(list)
        totalIngresos = list.reduce((sum, p) => sum + (p.monto || 0), 0)
      }

      const { data: salidasData, error: salidasError } = await supabase
        .from('movimientos_caja')
        .select('monto, fecha_hora')
        .eq('sucursal_id', sucursalId)
        .eq('tipo', 'Salida')
        .gte('fecha_hora', fechaInicioISO)
        .lte('fecha_hora', fechaFinISO) as { data: { monto?: number }[] | null; error: unknown }

      if (salidasError) {
        console.error('❌ [cajasService.getIngresosYSalidasDelPeriodo] Error obteniendo salidas:', salidasError)
      }
      const totalSalidas = salidasData?.reduce((sum, m) => sum + (m.monto || 0), 0) || 0

      return {
        ingresos: totalIngresos,
        salidas: totalSalidas,
      }
    } catch (error) {
      console.error('❌ [cajasService.getIngresosYSalidasDelPeriodo] Error calculando ingresos y salidas:', error)
      return { ingresos: 0, salidas: 0 }
    }
  },

  /**
   * ADMIN: Obtiene el estado de todas las cajas de todas las sucursales de la empresa del usuario
   */
  async getAllCajasEstado(diasAtras: number = 1): Promise<Caja[]> {
    try {
      // Obtener empresa_id del usuario actual para filtrar por empresa
      const perfil = await perfilesService.getPerfilActual()
      const empresaId = getCompaniaActual() || perfil?.empresa_id || perfil?.compania_id || null
      
      const appId = getAppId()
      if (!empresaId && !appId) {
        console.warn('⚠️ [cajasService.getAllCajasEstado] No se encontró empresa/app. Retornando array vacío por seguridad.')
        return []
      }

      // Obtener todas las sucursales de la empresa del usuario
      const fetchSucursales = async (field: 'empresa_id' | 'compania_id') => {
        if (!empresaId) return { data: null as { id: string }[] | null, error: { message: 'No empresa' } }
        let query = supabase
          .from('sucursales')
          .select('id')
          .eq(field, empresaId)
        query = withAppIdFilter(query, 'sucursales')
        return await query
      }

      const { data: sucursales, error: sucursalesError } = await fetchSucursales('empresa_id')
      let sucursalesFinal = sucursales
      let sucursalesErrFinal = sucursalesError
      if (sucursalesErrFinal?.message?.includes('column') && sucursalesErrFinal.message.includes('empresa_id')) {
        const fallback = await fetchSucursales('compania_id')
        sucursalesFinal = fallback.data
        sucursalesErrFinal = fallback.error
      }

      if (sucursalesErrFinal) {
        console.error('Error obteniendo sucursales:', sucursalesErrFinal)
        throw sucursalesErrFinal
      }

      // Si no hay sucursales, retornar array vacío
      const sucursalIds = (sucursalesFinal || []).map((s: any) => s.id)

      const fechaLimite = new Date()
      fechaLimite.setDate(fechaLimite.getDate() - diasAtras)
      const fechaLimiteStr = fechaLimite.toISOString().split('T')[0]

      // Filtrar cajas solo por sucursal_id (la tabla cajas no tiene empresa_id/compania_id)
      if (sucursalIds.length === 0) {
        return []
      }

      const desde = `${fechaLimiteStr}T00:00:00`
      let cajasQuery = supabase
        .from('cajas')
        .select('*')
        .in('sucursal_id', sucursalIds)
        .gte('created_at', desde)
        .order('created_at', { ascending: false })

      cajasQuery = withAppIdFilter(cajasQuery, 'cajas')
      const { data, error } = await cajasQuery as { data: { sucursal_id?: string; sucursal?: unknown; [key: string]: unknown }[] | null; error: unknown }

      if (error) throw error

      // Cargar sucursales por separado si es necesario
      if (data && data.length > 0) {
        const sucursalIds = [...new Set(data.map(c => c.sucursal_id).filter((id): id is string => Boolean(id)))]
        if (sucursalIds.length > 0) {
          try {
            let sucursalesDataQuery = supabase
              .from('sucursales')
              .select('*')
              .in('id', sucursalIds)
            sucursalesDataQuery = withAppIdFilter(sucursalesDataQuery, 'sucursales')
            const { data: sucursalesData } = await sucursalesDataQuery as { data: { id: string; [key: string]: unknown }[] | null }
            
            if (sucursalesData) {
              const sucursalesMap = new Map(sucursalesData.map(s => [s.id, s]))
              data.forEach(caja => {
                if (caja.sucursal_id && sucursalesMap.has(caja.sucursal_id)) {
                  caja.sucursal = sucursalesMap.get(caja.sucursal_id)
                }
              })
            }
          } catch (sucursalError) {
            console.warn('No se pudieron cargar las sucursales:', sucursalError)
          }
        }
      }

      return (data || []) as unknown as Caja[]
    } catch (error: any) {
      console.error('Error obteniendo todas las cajas:', error)
      throw error
    }
  },
}

