import { supabase, supabaseRaw } from '../supabase'
import type { Venta } from '@/types'
import { getCompaniaActual, getCompaniaActualOrFromPerfil } from '../utils/compania'
import { withAppIdData, withAppIdFilter } from '../utils/appId'
import { orEmpresaCompania } from '../utils/postgrest'
import { calcularAmortizacionFrancesa } from './amortizacion'

function isColumnRelatedError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? '')
  return /column|empresa_id|compania_id/i.test(msg)
}

export const ventasService = {
  async actualizarNumeroPrestamoCliente(venta: { cliente_id?: string | null; numero_prestamo?: string | null }): Promise<void> {
    if (!venta?.cliente_id || !venta?.numero_prestamo) {
      return
    }

    try {
      let updateQuery = supabase
        .from('clientes')
        .update(withAppIdData({
          numero_prestamo_cliente: venta.numero_prestamo,
          updated_at: new Date().toISOString(),
        }))
        .eq('id', venta.cliente_id)
      updateQuery = withAppIdFilter(updateQuery, 'clientes')
      const { error } = await updateQuery

      if (error) {
        console.warn('⚠️ [ventasService.actualizarNumeroPrestamoCliente] No se pudo sincronizar el no. de préstamo:', error)
      }
    } catch (syncError) {
      console.warn('⚠️ [ventasService.actualizarNumeroPrestamoCliente] Error inesperado al sincronizar:', syncError)
    }
  },
  async generarCodigoPrestamo(nombre: string, apellido: string, cedula: string): Promise<string> {
    const limpiarLetras = (valor: string) =>
      (valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase()

    const nombreLimpio = limpiarLetras(nombre)
    const apellidoLimpio = limpiarLetras(apellido)
    const prefijoNombre = (nombreLimpio + 'XX').slice(0, 2)
    const prefijoApellido = (apellidoLimpio + 'XX').slice(0, 2)
    const cedulaDigitos = (cedula || '').replace(/\D/g, '') || '0000'

    const generarNumeroAleatorio = () => String(Math.floor(Math.random() * 900) + 100)

    let intentos = 0
    const maxIntentos = 100

    while (intentos < maxIntentos) {
      const aleatorio = generarNumeroAleatorio()
      const codigo = `${prefijoNombre}${prefijoApellido}${cedulaDigitos}-${aleatorio}`

      const { data, error } = await supabaseRaw
        .from('ventas')
        .select('id')
        .eq('numero_prestamo', codigo)
        .limit(1)

      if (error) {
        console.warn('Error verificando numero_prestamo, usando código generado:', error)
        return codigo
      }

      if (!data || data.length === 0) {
        return codigo
      }

      intentos++
    }

    const fallback = `${prefijoNombre}${prefijoApellido}${cedulaDigitos}-${Date.now().toString().slice(-3)}`
    console.warn('No se pudo generar código único, usando fallback:', fallback)
    return fallback
  },
  async getAll(): Promise<Venta[]> {
    let compania = getCompaniaActual() || await getCompaniaActualOrFromPerfil()
    if (!compania) {
      compania = await getCompaniaActualOrFromPerfil()
    }
    if (compania && typeof window !== 'undefined') {
      localStorage.setItem('compania_actual', compania)
    }

    const selectClause = `*, motor:motores(*), cliente:clientes(*)`
    let query = supabase.from('ventas').select(selectClause)

    if (compania) {
      query = query.eq('empresa_id', compania)
    }

    query = withAppIdFilter(query, 'ventas')
    let { data, error } = await query.order('fecha_venta', { ascending: false })

    if (error) throw error

    return data || []
  },

  async getById(id: string): Promise<Venta | null> {
    const compania = getCompaniaActual() || await getCompaniaActualOrFromPerfil()
    const { perfilesService } = await import('./perfiles')
    const esSuperAdmin = await perfilesService.isSuperAdmin()
    if (!compania && !esSuperAdmin) {
      throw new Error('No hay compañía seleccionada')
    }

    let ventaQuery = supabase
      .from('ventas')
      .select(`
        *,
        motor:motores(*),
        cliente:clientes(*)
      `)
      .eq('id', id)
    if (compania) {
      ventaQuery = ventaQuery.eq('empresa_id', compania)
    }
    ventaQuery = withAppIdFilter(ventaQuery, 'ventas')
    const { data, error } = await ventaQuery.single()
    
    if (error) throw error
    
    if (!esSuperAdmin && compania && (!data || data.empresa_id !== compania)) {
      return null
    }

    return data
  },

  /**
   * Obtiene TODOS los créditos de un cliente (multi-sucursal)
   * Permite ver créditos creados en cualquier sucursal de la empresa
   */
  async getByCliente(clienteId: string): Promise<Venta[]> {
    if (!clienteId) {
      throw new Error('ID de cliente no proporcionado')
    }

    const compania = getCompaniaActual()
    let query = supabase
      .from('ventas')
      .select(`
        *,
        motor:motores(*),
        cliente:clientes(*)
      `)
      .eq('cliente_id', clienteId)
    
    if (compania) {
      query = query.eq('empresa_id', compania)
    }
    
    const { data, error } = await query.order('fecha_venta', { ascending: false })
    
    if (error) {
      // Mejorar el mensaje de error para producción
      const errorMessage = error.message || 'Error desconocido al consultar ventas'
      const enhancedError = new Error(`Error al verificar ventas del cliente: ${errorMessage}`)
      ;(enhancedError as any).code = error.code
      ;(enhancedError as any).details = error.details
      throw enhancedError
    }
    
    if (compania && data) {
      return data.filter((venta: any) => venta.empresa_id === compania) || []
    }
    
    return data || []
  },

  /**
   * Obtiene los créditos activos de un cliente (con saldo pendiente > 0)
   * Útil para verificar si un cliente ya tiene créditos activos
   */
  async getCreditosActivosByCliente(clienteId: string): Promise<Venta[]> {
    const creditos = await this.getByCliente(clienteId)
    return creditos.filter(credito => credito.saldo_pendiente > 0)
  },

  async create(
    venta: Omit<Venta, 'id' | 'created_at' | 'updated_at' | 'motor' | 'cliente'>,
    pagoInicial?: number
  ): Promise<Venta> {
    const compania = getCompaniaActual()
    const { perfilesService } = await import('./perfiles')
    const sucursalId = await perfilesService.getSucursalActual()
    const { clientesService } = await import('./clientes')
    
    const ventaData: any = withAppIdData({
      ...venta,
      fecha_venta: venta.fecha_venta || new Date().toISOString(),
    }, 'ventas')

    if (!ventaData.numero_prestamo && venta.cliente_id) {
      const cliente = await clientesService.getById(venta.cliente_id)
      if (cliente) {
        const partesNombre = (cliente.nombre_completo || '').trim().split(/\s+/).filter(Boolean)
        const nombre = partesNombre[0] || ''
        const apellido = partesNombre.length > 1 ? partesNombre[partesNombre.length - 1] : ''
        const cedula = cliente.cedula || ''
        ventaData.numero_prestamo = await this.generarCodigoPrestamo(nombre, apellido, cedula)
      }
    }
    
    if (compania) {
      ventaData.empresa_id = compania
    }
    ventaData.sucursal_id = sucursalId || null

    // Asignar Ruta A por defecto si la sucursal tiene rutas y no se especificó ruta_id
    if (!ventaData.ruta_id && sucursalId) {
      try {
        const { rutasService } = await import('./rutas')
        const rutas = await rutasService.getRutasBySucursal(sucursalId)
        if (rutas.length > 0) {
          ventaData.ruta_id = rutas[0].id
        }
      } catch {
        // Si falla, continuar sin ruta (opcional)
      }
    }

    // Flujo de aprobación: empleados crean con status 'pending'; Admin crea directo como 'active'
    try {
      const esAdmin = await perfilesService.esAdmin()
      ventaData.status = esAdmin ? 'active' : 'pending'
    } catch {
      ventaData.status = 'active'
    }

    const { data, error } = await (supabase as any)
      .from('ventas')
      .insert(ventaData)
      .select(`
        *,
        motor:motores(*),
        cliente:clientes(*)
      `)
      .single()
    
    // Si el error es por columna inexistente, reintentar sin campos opcionales
    if (error && error.message?.includes('column')) {
      const camposOpcionales = ['tipo_pago', 'descuento_contado', 'status', 'compania_id', 'plazo_meses', 'tipo_plazo', 'dia_pago_mensual', 'dia_pago_semanal', 'fecha_inicio_quincenal', 'porcentaje_interes', 'tipo_interes', 'metodo_interes', 'numero_prestamo', 'ruta_id', 'proxima_fecha_pago', 'tipo_garantia', 'descripcion_garantia', 'valor_estimado']
      camposOpcionales.forEach((c) => delete (ventaData as any)[c])
        let { data: retryData, error: retryError } = await (supabase as any)
          .from('ventas')
          .insert(ventaData)
          .select(`
            *,
            motor:motores(*),
            cliente:clientes(*)
          `)
          .single()

        if (retryError && retryError.message?.includes('compania_id')) {
          delete ventaData.compania_id
          const retryResult = await (supabase as any)
            .from('ventas')
            .insert(ventaData)
            .select(`
              *,
              motor:motores(*),
              cliente:clientes(*)
            `)
            .single()
          retryData = retryResult.data as any
          retryError = retryResult.error as any
        }

        if (retryError) throw retryError

        let prestamoQuery = supabase
          .from('motores')
          .select('cantidad, estado')
          .eq('id', venta.motor_id)
        prestamoQuery = withAppIdFilter(prestamoQuery)
        const { data: prestamoData, error: prestamoError } = await prestamoQuery.single() as { data: { cantidad?: number; estado?: string } | null; error: unknown }
        
        if (prestamoError) throw prestamoError
        
        const nuevaCantidad = Math.max(0, (prestamoData?.cantidad ?? 1) - 1)
        const nuevoEstado = nuevaCantidad === 0 ? 'Vendido' : prestamoData?.estado
        
        let motorUpdateQuery = (supabase as any)
          .from('motores')
          .update(withAppIdData({ 
            cantidad: nuevaCantidad,
            estado: nuevoEstado,
            updated_at: new Date().toISOString(),
          }))
          .eq('id', venta.motor_id)
        motorUpdateQuery = withAppIdFilter(motorUpdateQuery)
        await motorUpdateQuery
        
        if (pagoInicial && pagoInicial > 0 && retryData) {
          await this.registrarPagoInicial(retryData.id, pagoInicial)
        }

        if (retryData) {
          await this.actualizarNumeroPrestamoCliente({
            cliente_id: retryData.cliente_id,
            numero_prestamo: retryData.numero_prestamo,
          })
        }
        
        if (retryData) {
          await this.insertarCuotasDetalladas(retryData, pagoInicial)
        }

        return retryData
    }

    // Si el error es porque la columna no existe, intentar sin compania_id
    if (error && error.message?.includes('column') && error.message?.includes('compania_id')) {
      delete ventaData.compania_id
        const { data: retryData, error: retryError } = await (supabase as any)
          .from('ventas')
          .insert(ventaData)
          .select(`
            *,
            motor:motores(*),
            cliente:clientes(*)
          `)
          .single()
      
      if (retryError) throw retryError
      // Continuar con la lógica de actualizar cantidad del préstamo
      let prestamoQuery = supabase
        .from('motores')
        .select('cantidad, estado')
        .eq('id', venta.motor_id)
      prestamoQuery = withAppIdFilter(prestamoQuery)
      const { data: prestamoData, error: prestamoError } = await prestamoQuery.single() as { data: { cantidad?: number; estado?: string } | null; error: unknown }
      
      if (prestamoError) throw prestamoError
      
      const nuevaCantidad = Math.max(0, (prestamoData?.cantidad ?? 1) - 1)
      const nuevoEstado = nuevaCantidad === 0 ? 'Vendido' : prestamoData?.estado
      
      let motorUpdateQuery = (supabase as any)
        .from('motores')
        .update(withAppIdData({ 
          cantidad: nuevaCantidad,
          estado: nuevoEstado,
          updated_at: new Date().toISOString(),
        }))
        .eq('id', venta.motor_id)
      motorUpdateQuery = withAppIdFilter(motorUpdateQuery)
      await motorUpdateQuery
      
      // Registrar pago inicial si existe
      if (pagoInicial && pagoInicial > 0 && retryData) {
        await this.registrarPagoInicial(retryData.id, pagoInicial)
      }

      if (retryData) {
        await this.actualizarNumeroPrestamoCliente({
          cliente_id: retryData.cliente_id,
          numero_prestamo: retryData.numero_prestamo,
        })
      }

      if (retryData) {
        await this.insertarCuotasDetalladas(retryData, pagoInicial)
      }
      
      return retryData
    }
    
    if (error) throw error
    
    // Obtener el préstamo actual para verificar cantidad
    let prestamoQuery = supabase
      .from('motores')
      .select('cantidad, estado')
      .eq('id', venta.motor_id)
    prestamoQuery = withAppIdFilter(prestamoQuery)
    const { data: prestamoData, error: prestamoError } = await prestamoQuery.single() as { data: { cantidad?: number; estado?: string } | null; error: unknown }
    
    if (prestamoError) throw prestamoError
    
    // Descontar cantidad del préstamo
    const nuevaCantidad = Math.max(0, (prestamoData?.cantidad ?? 1) - 1)
    const nuevoEstado = nuevaCantidad === 0 ? 'Vendido' : prestamoData?.estado
    
    // Actualizar cantidad y estado del préstamo
    let motorUpdateQuery = (supabase as any)
      .from('motores')
      .update(withAppIdData({ 
        cantidad: nuevaCantidad,
        estado: nuevoEstado,
        updated_at: new Date().toISOString(),
      }))
      .eq('id', venta.motor_id)
    motorUpdateQuery = withAppIdFilter(motorUpdateQuery)
    await motorUpdateQuery
    
    // Registrar pago inicial si existe y es mayor a 0
    if (pagoInicial && pagoInicial > 0 && data) {
      await this.registrarPagoInicial(data.id, pagoInicial)
    }
    
    if (data) {
      await this.actualizarNumeroPrestamoCliente({
        cliente_id: data.cliente_id,
        numero_prestamo: data.numero_prestamo,
      })
    }

    if (data) {
      await this.insertarCuotasDetalladas(data, pagoInicial)
    }

    // Registrar actividad
    try {
      const { actividadService } = await import('./actividad')
      const { perfilesService } = await import('./perfiles')
      const nombreUsuario = await perfilesService.getNombreCompleto()
      await actividadService.registrarActividad(
        'Emitió un crédito',
        `Monto: $${venta.monto_total.toLocaleString()} - Cliente ID: ${venta.cliente_id}${pagoInicial && pagoInicial > 0 ? ` - Pago inicial: $${pagoInicial.toLocaleString()}` : ''}`,
        'venta',
        data.id
      )
    } catch (error) {
      console.error('Error registrando actividad:', error)
      // No fallar si el registro de actividad falla
    }
    
    return data
  },

  async insertarCuotasDetalladas(venta: Venta, pagoInicial?: number): Promise<void> {
    try {
      const plazoMeses = venta.plazo_meses || venta.cantidad_cuotas || 0
      if (!plazoMeses || plazoMeses <= 0) return

      let cobrarDomingos = false
      if (venta.sucursal_id) {
        const { data: suc } = await supabase.from('sucursales').select('cobrar_domingos').eq('id', venta.sucursal_id).single() as { data: { cobrar_domingos?: boolean } | null }
        cobrarDomingos = !!suc?.cobrar_domingos
      }

      // P = Monto base solicitado. Cargo (4.5%) se SUMA al capital ANTES de calcular la cuota
      const montoBase = Math.round(((venta as any).motor?.precio_venta ?? 0) * 100) / 100
      const cargoManejo = Math.round((montoBase * 0.045) * 100) / 100
      const capitalAmortizado = Math.round((montoBase + cargoManejo) * 100) / 100

      // Amortización: sobre_saldo = compuesto sobre balance; fijo = lineal
      const metodoInteres = (venta as any).metodo_interes || 'sobre_saldo'
      const cuotas = calcularAmortizacionFrancesa({
        monto_total: capitalAmortizado,
        tasa_interes_anual: venta.porcentaje_interes || 0,
        plazo_meses: plazoMeses,
        fecha_inicio: venta.fecha_venta,
        tipo_plazo: venta.tipo_plazo || 'mensual',
        dia_pago_mensual: venta.dia_pago_mensual || undefined,
        dia_pago_semanal: venta.dia_pago_semanal !== undefined ? venta.dia_pago_semanal : undefined,
        fecha_inicio_quincenal: venta.fecha_inicio_quincenal || undefined,
        cobrar_domingos: cobrarDomingos,
        metodo_interes: metodoInteres,
      })

      if (!cuotas.length) return

      const empresaId = (venta as any).empresa_id || null
      const rows = cuotas.map((cuota) => ({
        venta_id: venta.id,
        empresa_id: empresaId,
        numero_cuota: cuota.numero_cuota,
        fecha_pago: cuota.fecha_pago,
        cuota_fija: cuota.cuota_fija,
        monto_cuota: cuota.cuota_fija,
        interes_mes: cuota.interes_mes,
        abono_capital: cuota.abono_capital,
        saldo_pendiente: cuota.saldo_pendiente,
      }))

      const { error } = await (supabase as any)
        .from('cuotas_detalladas')
        .insert(withAppIdData(rows, 'cuotas_detalladas'))

      if (error) {
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('No existe la tabla cuotas_detalladas. Ejecuta supabase/crear-cuotas-detalladas.sql en Supabase.')
        }
        throw error
      }
    } catch (error) {
      console.error('Error insertando cuotas detalladas:', error)
      throw error
    }
  },

  /**
   * Registra automáticamente el pago inicial cuando se crea una venta
   * El pago inicial tiene numero_cuota = null (no cuenta como cuota)
   */
  async registrarPagoInicial(ventaId: string, monto: number): Promise<void> {
    try {
      const { pagosService } = await import('./pagos')
      
      await pagosService.create({
        venta_id: ventaId,
        monto: monto,
        numero_cuota: null, // Pago inicial no tiene número de cuota
        fecha_pago: new Date().toISOString(),
      })
      
      console.log('✅ Pago inicial registrado automáticamente:', { ventaId, monto })
    } catch (error) {
      // No lanzar error si falla el registro del pago inicial para no interrumpir la creación de la venta
      console.error('⚠️ Error registrando pago inicial (no crítico):', error)
    }
  },

  /**
   * Actualiza campos editables de una venta (solo Admin)
   */
  async update(ventaId: string, data: Partial<Pick<Venta, 'numero_prestamo' | 'fecha_venta' | 'tipo_plazo' | 'dia_pago_mensual' | 'dia_pago_semanal' | 'fecha_inicio_quincenal' | 'ruta_id' | 'orden_visita'>>): Promise<Venta> {
    const updateData: Record<string, unknown> = {
      ...data,
      updated_at: new Date().toISOString(),
    }
    let query = (supabase as any)
      .from('ventas')
      .update(withAppIdData(updateData))
      .eq('id', ventaId)
    query = withAppIdFilter(query, 'ventas')
    const { data: result, error } = await query.select(`
      *,
      motor:motores(*),
      cliente:clientes(*)
    `).single()

    if (error) throw error
    return result as Venta
  },

  async updateSaldo(ventaId: string, nuevoSaldo: number): Promise<void> {
    const payload = withAppIdData({
      saldo_pendiente: nuevoSaldo,
      updated_at: new Date().toISOString(),
    }, 'ventas')
    let updateQuery = (supabase as any)
      .from('ventas')
      .update(payload)
      .eq('id', ventaId)
    updateQuery = withAppIdFilter(updateQuery, 'ventas')
    let { error } = await updateQuery
    if (error && (error.message?.includes('column') || error.message?.includes('updated_at') || (error as any).code === '42703')) {
      const { error: err2 } = await (supabase as any)
        .from('ventas')
        .update({ saldo_pendiente: nuevoSaldo })
        .eq('id', ventaId)
      error = err2
    }
    if (error) throw error
  },

  /** Incrementa mora_abonada cuando el cliente paga parte de los cargos por mora */
  async incrementarMoraAbonada(ventaId: string, monto: number): Promise<void> {
    if (monto <= 0) return
    const { data: venta } = await supabase
      .from('ventas')
      .select('mora_abonada')
      .eq('id', ventaId)
      .single()
    const actual = Number((venta as any)?.mora_abonada ?? 0)
    const nuevo = Math.round((actual + monto) * 100) / 100
    const { error } = await (supabase as any)
      .from('ventas')
      .update({ mora_abonada: nuevo, updated_at: new Date().toISOString() })
      .eq('id', ventaId)
    if (error) throw error
  },

  async updateCantidadCuotas(ventaId: string, nuevaCantidadCuotas: number): Promise<void> {
    let updateQuery = (supabase as any)
      .from('ventas')
      .update(withAppIdData({
        cantidad_cuotas: nuevaCantidadCuotas,
        updated_at: new Date().toISOString(),
      }))
      .eq('id', ventaId)
    updateQuery = withAppIdFilter(updateQuery, 'ventas')
    const { error } = await updateQuery
    
    if (error) throw error
  },

  async getVentasDelMes(): Promise<Venta[]> {
    const compania = getCompaniaActual()
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)
    
    let query = supabase
      .from('ventas')
      .select(`
        *,
        motor:motores(*),
        cliente:clientes(*)
      `)
      .gte('fecha_venta', inicioMes.toISOString())
    
    // Intentar filtrar por compañía si existe
    if (compania) {
      try {
        query = query.eq('compania_id', compania)
      } catch (error) {
        // Si la columna no existe, continuar sin filtrar
      }
    }
    
    query = withAppIdFilter(query, 'ventas')
    const { data, error } = await query.order('fecha_venta', { ascending: false })
    
    // Si el error es porque la columna no existe, intentar sin el filtro
    if (error && error.message?.includes('column') && error.message?.includes('compania_id')) {
      let fallbackQuery = supabase
        .from('ventas')
        .select(`
          *,
          motor:motores(*),
          cliente:clientes(*)
        `)
        .gte('fecha_venta', inicioMes.toISOString())
        .order('fecha_venta', { ascending: false })
      fallbackQuery = withAppIdFilter(fallbackQuery, 'ventas')
      const { data: allData, error: allError } = await fallbackQuery
      
      if (allError) throw allError
      return allData || []
    }
    
    if (error) throw error
    return data || []
  },

  /**
   * Elimina una venta (préstamo) y todos sus pagos asociados (solo Admin)
   * Nota: Los pagos se eliminan automáticamente por CASCADE en la base de datos
   */
  async eliminar(ventaId: string): Promise<void> {
    try {
      // Obtener información de la venta antes de eliminarla para registrar actividad
      const venta = await this.getById(ventaId)
      const clienteNombre = venta?.cliente?.nombre_completo || 'Cliente desconocido'
      const motorInfo = venta?.motor ? `${venta.motor.marca || ''} ${venta.motor.modelo || ''}`.trim() : 'Motor desconocido'
      const montoTotal = venta?.monto_total || 0

      // 1. Eliminar todos los pagos asociados primero (aunque CASCADE lo hará automáticamente,
      // es mejor hacerlo explícitamente para registrar actividad)
      const { supabase } = await import('../supabase')
      const { error: pagosError } = await supabase
        .from('pagos')
        .delete()
        .eq('venta_id', ventaId)

      if (pagosError) {
        console.warn('⚠️ [ventasService.eliminar] Error eliminando pagos (puede que no existan):', pagosError)
        // No lanzar error, continuar con la eliminación de la venta
      }

      // 2. Eliminar la venta
      const { error: ventaError } = await supabase
        .from('ventas')
        .delete()
        .eq('id', ventaId)

      if (ventaError) {
        console.error('❌ [ventasService.eliminar] Error eliminando venta:', ventaError)
        throw new Error(`Error al eliminar el préstamo: ${ventaError.message}`)
      }

      // 3. Registrar actividad
      try {
        const { actividadService } = await import('./actividad')
        await actividadService.registrarActividad(
          `Eliminó un préstamo`,
          `Préstamo eliminado: ${motorInfo} - Cliente: ${clienteNombre} - Monto: $${montoTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`,
          'venta',
          ventaId
        )
      } catch (actividadError) {
        console.warn('⚠️ [ventasService.eliminar] Error registrando actividad:', actividadError)
        // No lanzar error, la eliminación ya fue exitosa
      }

      console.log(`✅ [ventasService.eliminar] Venta ${ventaId} eliminada correctamente`)
    } catch (error) {
      console.error('Error eliminando venta:', error)
      throw error
    }
  },
}


