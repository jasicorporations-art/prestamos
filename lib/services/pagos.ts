import { supabase } from '../supabase'
import { ventasService } from './ventas'
import type { Pago } from '@/types'
import { getCompaniaActual, getCompaniaActualOrFromPerfil } from '../utils/compania'
import { withAppIdFilter } from '../utils/appId'

export const pagosService = {
  async getAll(limit?: number): Promise<Pago[]> {
    const compania = getCompaniaActual() || await getCompaniaActualOrFromPerfil()
    let query = supabase
      .from('pagos')
      .select(`
        *,
        venta:ventas(
          *,
          motor:motores(*),
          cliente:clientes(*)
        )
      `)
    
    // Filtrar por empresa_id (pagos no tiene app_id - está en APP_ID_EXCLUDED_TABLES)
    if (compania) {
      query = query.eq('empresa_id', compania)
    }
    query = withAppIdFilter(query, 'pagos')
    
    // Agregar límite si se especifica (por defecto 500 para evitar cargas masivas)
    if (!limit) {
      limit = 500
    }
    query = query.limit(limit)
    
    // Ordenar por created_at y fecha_pago (fecha_hora puede no existir en schema mínimo)
    const { data, error } = await query
      .order('created_at', { ascending: false, nullsFirst: false })
      .order('fecha_pago', { ascending: false })
    
    // Si hay error (columna inexistente, 400, etc.), intentar sin filtro empresa_id
    if (error) {
      console.warn('Error con filtro de empresa, intentando sin filtro:', error)
      let allData: any[] | null = null
      let allError: any = null

      // Intento 1: sin filtro, con relaciones
      let fallback = await supabase
        .from('pagos')
        .select(`*, venta:ventas(*, motor:motores(*), cliente:clientes(*))`)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fallback.error) {
        // Intento 2: solo campos básicos (schema mínimo)
        console.warn('Fallback con relaciones falló, intentando select básico:', fallback.error)
        fallback = await supabase
          .from('pagos')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit)
      }

      allData = fallback.data
      allError = fallback.error
      if (allError) throw allError
      
      // Filtrar manualmente por empresa si hay compania
      if (compania && allData) {
        const filtered = allData.filter((pago: any) =>
          pago.empresa_id === compania || pago.compania_id === compania
        ) || []
        
        // Ordenar también en el cliente para asegurar el orden correcto
        return filtered.sort((a: any, b: any) => {
          const fechaHoraA = a.fecha_hora ? new Date(a.fecha_hora).getTime() : 0
          const fechaHoraB = b.fecha_hora ? new Date(b.fecha_hora).getTime() : 0
          if (fechaHoraA !== fechaHoraB && fechaHoraA > 0 && fechaHoraB > 0) {
            return fechaHoraB - fechaHoraA
          }
          const createdA = a.created_at ? new Date(a.created_at).getTime() : 0
          const createdB = b.created_at ? new Date(b.created_at).getTime() : 0
          if (createdB !== createdA) {
            return createdB - createdA
          }
          const fechaA = new Date(a.fecha_pago).getTime()
          const fechaB = new Date(b.fecha_pago).getTime()
          return fechaB - fechaA
        })
      }
      
      // Ordenar también en el cliente
      return (allData || []).sort((a: any, b: any) => {
        const fechaHoraA = a.fecha_hora ? new Date(a.fecha_hora).getTime() : 0
        const fechaHoraB = b.fecha_hora ? new Date(b.fecha_hora).getTime() : 0
        if (fechaHoraA !== fechaHoraB && fechaHoraA > 0 && fechaHoraB > 0) {
          return fechaHoraB - fechaHoraA
        }
        const createdA = a.created_at ? new Date(a.created_at).getTime() : 0
        const createdB = b.created_at ? new Date(b.created_at).getTime() : 0
        if (createdB !== createdA) {
          return createdB - createdA
        }
        const fechaA = new Date(a.fecha_pago).getTime()
        const fechaB = new Date(b.fecha_pago).getTime()
        return fechaB - fechaA
      })
    }
    
    if (error) throw error
    
    // Filtrar manualmente por si acaso (doble verificación)
    let result = data || []
    if (compania && data) {
      result = data.filter((pago: any) => 
        pago.empresa_id === compania || pago.compania_id === compania
      ) || []
    }
    
    // Ordenar también en el cliente para asegurar el orden correcto
    return result.sort((a: any, b: any) => {
      const fechaHoraA = a.fecha_hora ? new Date(a.fecha_hora).getTime() : 0
      const fechaHoraB = b.fecha_hora ? new Date(b.fecha_hora).getTime() : 0
      if (fechaHoraA !== fechaHoraB && fechaHoraA > 0 && fechaHoraB > 0) {
        return fechaHoraB - fechaHoraA
      }
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0
      if (createdB !== createdA) {
        return createdB - createdA
      }
      const fechaA = new Date(a.fecha_pago).getTime()
      const fechaB = new Date(b.fecha_pago).getTime()
      return fechaB - fechaA
    })
  },

  async getById(id: string): Promise<Pago | null> {
    const compania = getCompaniaActual() || await getCompaniaActualOrFromPerfil()
    const { perfilesService } = await import('./perfiles')
    const esSuperAdmin = await perfilesService.isSuperAdmin()
    if (!compania && !esSuperAdmin) {
      throw new Error('No hay compañía seleccionada')
    }

    let query = supabase
      .from('pagos')
      .select(`
        *,
        venta:ventas(
          *,
          motor:motores(*),
          cliente:clientes(*)
        )
      `)
      .eq('id', id)
    if (compania) {
      query = query.eq('empresa_id', compania)
    }
    query = withAppIdFilter(query, 'pagos')
    const { data, error } = await query.single() as { data: { empresa_id?: string; compania_id?: string; [key: string]: unknown } | null; error: { message?: string } | null }
    
    if (error) {
      // Si la columna compania_id no existe, intentar sin filtrar pero con advertencia
      if (error.message?.includes('column') && error.message?.includes('compania_id')) {
        console.warn('Columna compania_id no existe, cargando pago sin filtro de compañía')
        const { data: allData, error: allError } = await supabase
          .from('pagos')
          .select(`
            *,
            venta:ventas(
              *,
              motor:motores(*),
              cliente:clientes(*)
            )
          `)
          .eq('id', id)
          .single() as { data: { empresa_id?: string; compania_id?: string; [key: string]: unknown } | null; error: unknown }
        
        if (allError) throw allError
        return allData as unknown as Pago | null
      }
      throw error
    }
    
    // Si no se encontró el pago o no pertenece a la compañía, retornar null (salvo super_admin)
    if (!esSuperAdmin && compania && (!data || (data.empresa_id !== compania && data.compania_id !== compania))) {
      return null
    }

    return data as unknown as Pago | null
  },

  /**
   * Obtiene los cobros del día para el mapa de rutas.
   * Filtra por created_at. Incluye latitud_cobro, longitud_cobro.
   */
  async getCobrosDelDia(fecha?: Date): Promise<Pago[]> {
    const compania = getCompaniaActual()
    const d = fecha || new Date()
    const inicio = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString()
    const fin = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString()

    const selectStr = `
      id, venta_id, monto, numero_cuota, latitud_cobro, longitud_cobro, fecha_pago, created_at,
      venta:ventas(
        id,
        ruta_id,
        cliente:clientes(nombre_completo),
        motor:motores(marca, modelo, numero_chasis)
      )
    `

    let query = supabase
      .from('pagos')
      .select(selectStr)
      .gte('created_at', inicio)
      .lte('created_at', fin)

    try {
      if (compania) {
        query = query.or(`empresa_id.eq.${compania},compania_id.eq.${compania}`)
      }
    } catch {
      // ignorar si no existe la columna
    }

    let { data, error } = await query.order('created_at', { ascending: false })

    if (error && (error.message?.includes('column') || error.message?.includes('empresa_id') || error.message?.includes('compania_id'))) {
      const fallback = await supabase
        .from('pagos')
        .select(selectStr)
        .gte('created_at', inicio)
        .lte('created_at', fin)
        .order('created_at', { ascending: false })
      data = fallback.data
      error = fallback.error
    }
    if (error) throw error
    return (data || []) as unknown as Pago[]
  },

  async getByVenta(ventaId: string, limit?: number): Promise<Pago[]> {
    let query = supabase
      .from('pagos')
      .select('id,numero_cuota,monto,venta_id,created_at,fecha_pago') // fecha_hora puede no existir en schema mínimo
      .eq('venta_id', ventaId)
      .order('created_at', { ascending: false, nullsFirst: false })
      .order('fecha_pago', { ascending: false })
    
    // Agregar límite si se especifica
    if (limit) {
      query = query.limit(limit)
    }
    
    const { data, error } = await query as { data: { created_at?: string; fecha_pago?: string; fecha_hora?: string; [key: string]: unknown }[] | null; error: unknown }
    
    if (error) throw error
    
    // Ordenar en el cliente (fecha_hora puede no existir en schema mínimo)
    const sorted = (data || []).sort((a, b) => {
      const fechaHoraA = a.fecha_hora ? new Date(a.fecha_hora).getTime() : 0
      const fechaHoraB = b.fecha_hora ? new Date(b.fecha_hora).getTime() : 0
      if (fechaHoraA !== fechaHoraB && fechaHoraA > 0 && fechaHoraB > 0) {
        return fechaHoraB - fechaHoraA // Descendente (más reciente primero)
      }
      
      // Prioridad 2: created_at
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0
      if (createdB !== createdA) {
        return createdB - createdA // Descendente (más reciente primero)
      }
      
      // Prioridad 3: fecha_pago
      const fechaA = new Date(a.fecha_pago || 0).getTime()
      const fechaB = new Date(b.fecha_pago || 0).getTime()
      return fechaB - fechaA // Descendente (más reciente primero)
    })
    
    return sorted as unknown as Pago[]
  },

  /**
   * Retorna los IDs de ventas que tienen al menos un pago registrado hoy (por created_at).
   */
  async getVentasConPagoHoy(ventaIds: string[]): Promise<Set<string>> {
    if (ventaIds.length === 0) return new Set()

    const hoy = new Date()
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0).toISOString()
    const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString()

    const { data, error } = await supabase
      .from('pagos')
      .select('venta_id')
      .in('venta_id', ventaIds)
      .gte('created_at', inicio)
      .lte('created_at', fin)

    if (error) throw error
    return new Set((data || []).map((p: { venta_id: string }) => p.venta_id))
  },

  /**
   * Suma del monto cobrado hoy para las ventas indicadas.
   */
  async getMontoCobradoHoyPorVentas(ventaIds: string[]): Promise<number> {
    if (ventaIds.length === 0) return 0

    const hoy = new Date()
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0).toISOString()
    const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString()

    const { data, error } = await supabase
      .from('pagos')
      .select('monto')
      .in('venta_id', ventaIds)
      .gte('created_at', inicio)
      .lte('created_at', fin)

    if (error) throw error
    return (data || []).reduce((sum: number, p: { monto: number }) => sum + (Number(p.monto) || 0), 0)
  },

  async getSiguienteNumeroCuota(ventaId: string): Promise<number> {
    // Obtener todos los pagos de la venta con número de cuota
    const { data, error } = await supabase
      .from('pagos')
      .select('numero_cuota')
      .eq('venta_id', ventaId)
      .not('numero_cuota', 'is', null)
      .order('numero_cuota', { ascending: true }) as { data: { numero_cuota?: number | null }[] | null; error: unknown }
    
    if (error) throw error
    
    // Si no hay pagos, la primera cuota es 1
    if (!data || data.length === 0) {
      return 1
    }
    
    // Encontrar el siguiente número de cuota disponible
    const numerosCuotas = data
      .map(p => p.numero_cuota)
      .filter((n): n is number => n !== null && n !== undefined)
      .sort((a, b) => a - b)
    
    // Buscar el primer número faltante en la secuencia
    for (let i = 1; i <= numerosCuotas.length + 1; i++) {
      if (!numerosCuotas.includes(i)) {
        return i
      }
    }
    
    // Si todos los números están ocupados, devolver el siguiente
    return numerosCuotas.length + 1
  },

  async create(pago: Omit<Pago, 'id' | 'created_at' | 'venta'>): Promise<Pago> {
    // Verificar que la caja esté abierta para la sucursal actual
    const { cajasService } = await import('./cajas')
    const cajaAbierta = await cajasService.estaCajaAbierta()
    if (!cajaAbierta) {
      throw new Error('No se pueden registrar pagos porque la caja está cerrada. Abra la caja primero.')
    }

    console.log('🔵 [pagosService.create] Iniciando creación de pago:', {
      venta_id: pago.venta_id,
      monto: pago.monto,
      numero_cuota: pago.numero_cuota
    })
    
    // Obtener la venta actual
    const venta = await ventasService.getById(pago.venta_id)
    if (!venta) {
      console.error('❌ [pagosService.create] Venta no encontrada:', pago.venta_id)
      throw new Error('Venta no encontrada')
    }
    
    console.log('🔵 [pagosService.create] Venta encontrada:', {
      id: venta.id,
      saldo_pendiente: venta.saldo_pendiente,
      cantidad_cuotas: venta.cantidad_cuotas
    })
    
    // Determinar el número de cuota PRIMERO para saber si es un pago inicial
    // Si viene explícitamente como null, es un pago inicial y NO se le asigna número de cuota
    // Si viene como undefined, se asigna automáticamente el siguiente número disponible
    // Si viene definido, se usa ese número
    let numeroCuota: number | null = null
    
    // Verificar si es un pago completo (el monto es igual o mayor al saldo pendiente)
    const esPagoCompleto = pago.monto >= venta.saldo_pendiente
    
    if (pago.numero_cuota === null) {
      // Si es null explícitamente, es un pago inicial (down payment) y NO se le asigna número
      numeroCuota = null
      console.log('🔵 [pagosService.create] Es pago inicial (numero_cuota === null)')
    } else if (pago.numero_cuota !== undefined) {
      // Si viene definido explícitamente, usarlo
      numeroCuota = pago.numero_cuota
      console.log('🔵 [pagosService.create] Número de cuota especificado:', numeroCuota)
    } else {
      // Si es undefined (no se proporcionó), asignar automáticamente el siguiente disponible
      numeroCuota = await this.getSiguienteNumeroCuota(pago.venta_id)
      console.log('🔵 [pagosService.create] Número de cuota asignado automáticamente:', numeroCuota)
    }
    
    // IMPORTANTE: Si es un pago inicial (numero_cuota === null), NO se actualiza el saldo pendiente
    // porque el saldo ya fue calculado correctamente al crear la venta (montoTotal - pagoInicial)
    const esPagoInicial = numeroCuota === null
    
    if (esPagoCompleto) {
      console.log('🔵 [pagosService.create] Es pago completo - saldará todo el préstamo')
    }
    
    // Calcular cargos por mora pendientes para validar el monto
    const { calcularTotalCargosMora } = await import('./mora')
    const cargosMoraPendientes = await calcularTotalCargosMora(venta.id)
    const montoMaximoPermitido = venta.saldo_pendiente + cargosMoraPendientes

    // Permitir pagos parciales: cualquier monto entre 0.01 y (saldo + mora) es válido.
    // No se exige monto mínimo de cuota+mora; el cobrador puede registrar abonos parciales sin autorización.
    if (pago.monto < 0.01) {
      throw new Error('El monto debe ser mayor a 0')
    }

    // Calcular nuevo saldo solo si NO es un pago inicial
    let nuevoSaldo = venta.saldo_pendiente
    if (!esPagoInicial) {
      // El pago se divide: primero cubre la mora (no reduce saldo), el resto reduce el saldo (principal)
      // Ejemplo: pago 14,000 (cuota 8,000 + mora 6,000) → 6,000 a mora, 8,000 al saldo
      const montoAplicadoAMora = Math.min(pago.monto, cargosMoraPendientes)
      const montoRestanteParaSaldo = Math.max(0, pago.monto - montoAplicadoAMora)
      const montoAplicadoASaldo = Math.min(montoRestanteParaSaldo, venta.saldo_pendiente)
      
      nuevoSaldo = venta.saldo_pendiente - montoAplicadoASaldo
      
      console.log('🔵 [pagosService.create] Calculando nuevo saldo:', {
        saldo_actual: venta.saldo_pendiente,
        monto_pago: pago.monto,
        cargos_mora: cargosMoraPendientes,
        monto_aplicado_saldo: montoAplicadoASaldo,
        nuevo_saldo: nuevoSaldo,
        esPagoCompleto
      })
      
      // Validar que el monto no exceda el máximo permitido (saldo + mora)
      if (pago.monto > montoMaximoPermitido + 0.01) {
        console.error('❌ [pagosService.create] El monto excede el máximo permitido (saldo + mora)')
        throw new Error(`El monto del pago ($${pago.monto.toLocaleString()}) excede el máximo permitido de $${montoMaximoPermitido.toLocaleString()} (saldo pendiente + cargos por mora)`)
      }
      
      // Permitir que el nuevo saldo sea 0 o ligeramente negativo por redondeo (hasta -0.01)
      // Esto es necesario para pagos completos que pueden tener pequeñas diferencias por redondeo
      if (nuevoSaldo < -0.01) {
        console.error('❌ [pagosService.create] El monto excede el saldo pendiente significativamente')
        throw new Error(`El monto del pago ($${pago.monto.toLocaleString()}) excede el saldo pendiente ($${venta.saldo_pendiente.toLocaleString()})`)
      }
      
      // Si el nuevo saldo es negativo por redondeo, ajustarlo a 0
      if (nuevoSaldo < 0) {
        console.log('⚠️ [pagosService.create] Ajustando saldo negativo por redondeo a 0')
        nuevoSaldo = 0
      }
    } else {
      console.log('🔵 [pagosService.create] Es pago inicial, no se actualiza saldo')
    }
    
    // Obtener todos los pagos existentes para calcular cuotas pagadas (solo numero_cuota 1,2,3...; excluir pago inicial null)
    const pagosExistentes = await this.getByVenta(pago.venta_id)
    const cuotasPagadasSet = new Set(
      pagosExistentes
        .map(p => p.numero_cuota)
        .filter((n): n is number => n !== null && n !== undefined)
    )
    const cuotasPagadas = cuotasPagadasSet.size
    
    // Calcular cuántas cuotas quedan pendientes (sin contar este pago)
    const cuotasPendientesAntes = venta.cantidad_cuotas - cuotasPagadas
    
    // Calcular el valor de una cuota actual (basado en saldo y cuotas restantes)
    const valorCuotaActual = cuotasPendientesAntes > 0 
      ? venta.saldo_pendiente / cuotasPendientesAntes 
      : venta.saldo_pendiente
    
    // NOTA: Cuando el cliente paga más de una cuota, NO se reduce el número de cuotas.
    // En su lugar, se mantiene el número de cuotas restantes y se reduce el monto de cada cuota
    // porque está pagando parte del capital. El sistema automáticamente calculará el nuevo
    // valor por cuota basándose en: nuevo_saldo / cuotas_restantes
    
    // Obtener compañía actual, sucursal y usuario
    // IMPORTANTE: Obtener empresa_id del perfil del usuario, no de localStorage
    const { perfilesService } = await import('./perfiles')
    const perfil = await perfilesService.getPerfilActual()
    const { data: { user } } = await supabase.auth.getUser()
    const sucursalId = await perfilesService.getSucursalActual()
    const fechaHora = new Date().toISOString()
    
    // Obtener empresa_id del perfil (más confiable que localStorage)
    const empresaId =
      perfil?.empresa_id ||
      perfil?.compania_id ||
      venta.empresa_id ||
      venta.compania_id ||
      getCompaniaActual()
    if (!empresaId) {
      console.error('❌ [pagosService.create] No se pudo obtener empresa_id del perfil ni de localStorage')
      throw new Error('No se pudo determinar la empresa. Por favor, verifica tu perfil de usuario.')
    }
    
    console.log('🔵 [pagosService.create] Datos del usuario:', {
      empresa_id: empresaId,
      sucursal_id: sucursalId,
      usuario_id: user?.id,
      perfil_empresa_id: perfil?.empresa_id,
      localStorage_compania: getCompaniaActual()
    })
    
    // Crear el pago con todas las relaciones necesarias y metadatos
    const pagoData: any = {
      ...pago,
      numero_cuota: numeroCuota,
      fecha_pago: pago.fecha_pago || fechaHora,
      fecha_hora: fechaHora,
    }
    // Marcar abono parcial si se pasa explícitamente (retrocompatibilidad)
    const autorizadoExplicito = !!(pago as any).autorizado_por_admin
    if (autorizadoExplicito) {
      pagoData.es_abono_parcial = true
      pagoData.autorizado_por_admin = true
    }
    
    // Agregar empresa_id y metadatos opcionales (algunas columnas pueden no existir en el esquema)
    pagoData.empresa_id = empresaId
    pagoData.compania_id = empresaId
    pagoData.sucursal_id = sucursalId || null
    pagoData.usuario_que_cobro = user?.id || null
    pagoData.sucursal_donde_se_cobro = sucursalId || null
    pagoData.fecha_hora = fechaHora

    console.log('🔵 [pagosService.create] Insertando pago en base de datos:', {
      venta_id: pagoData.venta_id,
      monto: pagoData.monto,
      numero_cuota: pagoData.numero_cuota,
      empresa_id: pagoData.empresa_id,
      compania_id: pagoData.compania_id,
      sucursal_id: pagoData.sucursal_id,
      usuario_que_cobro: pagoData.usuario_que_cobro,
      sucursal_donde_se_cobro: pagoData.sucursal_donde_se_cobro,
      fecha_pago: pagoData.fecha_pago,
      fecha_hora: pagoData.fecha_hora
    })
    
    // Verificar que tenemos todos los datos necesarios
    if (!pagoData.empresa_id) {
      console.error('❌ [pagosService.create] empresa_id es null o undefined')
      throw new Error('No se pudo determinar la empresa. Por favor, verifica tu perfil de usuario.')
    }
    
    if (!pagoData.sucursal_id) {
      console.warn('⚠️ [pagosService.create] sucursal_id es null - el usuario podría no tener sucursal asignada')
    }
    
    const { data, error } = await (supabase as any)
      .from('pagos')
      .insert(pagoData)
      .select(`
        *,
        venta:ventas(
          *,
          motor:motores(*),
          cliente:clientes(*)
        )
      `)
      .single()
    
    if (error) {
      console.error('❌ [pagosService.create] Error insertando pago:', error)
      console.error('❌ [pagosService.create] Error detalles:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        pagoData: {
          venta_id: pagoData.venta_id,
          monto: pagoData.monto,
          empresa_id: pagoData.empresa_id,
          sucursal_id: pagoData.sucursal_id
        }
      })

      const isBadRequestOrColumn = (error as any).code === 'PGRST204' || (error as any).status === 400 ||
        String(error.message || '').includes('column') || String(error.message || '').includes('schema cache') || String(error.message || '').includes('could not find')

      if (isBadRequestOrColumn) {
        const minimalPayload = {
          venta_id: pagoData.venta_id,
          monto: pagoData.monto,
          numero_cuota: pagoData.numero_cuota,
          fecha_pago: pagoData.fecha_pago,
          empresa_id: pagoData.empresa_id,
          ...(pagoData.es_abono_parcial != null && { es_abono_parcial: pagoData.es_abono_parcial }),
          ...(pagoData.autorizado_por_admin != null && { autorizado_por_admin: pagoData.autorizado_por_admin }),
        }
        console.warn('⚠️ [pagosService.create] Reintentando con payload mínimo (solo columnas base):', Object.keys(minimalPayload))
        const { data: retryData, error: retryError } = await (supabase as any)
          .from('pagos')
          .insert(minimalPayload)
          .select(`
            *,
            venta:ventas(
              *,
              motor:motores(*),
              cliente:clientes(*)
            )
          `)
          .single()
        
        if (retryError) {
          console.error('❌ [pagosService.create] Error en reintento:', retryError)
          // NO registrar actividad si el pago falla
          throw retryError
        }
        
        console.log('✅ [pagosService.create] Pago insertado en reintento:', retryData?.id)
        
        // Actualizar saldo pendiente de la venta (no fallar si ventas devuelve 400)
        if (!esPagoInicial) {
          try {
            const nuevoSaldoRedondeado = Math.round(nuevoSaldo * 100) / 100
            await ventasService.updateSaldo(pago.venta_id, nuevoSaldoRedondeado)
          } catch (saldoError) {
            console.warn('⚠️ [pagosService.create] Error actualizando saldo de venta (pago ya guardado):', saldoError)
          }
        }
        
        // Si las relaciones no vinieron, intentar obtener el pago completo (no fallar si getById da 400)
        if (!retryData.venta || !(retryData.venta as any).motor || !(retryData.venta as any).cliente) {
          try {
            const pagoCompleto = await this.getById(retryData.id)
            if (pagoCompleto) {
              try {
                const { actividadService } = await import('./actividad')
                const nombreCliente = (pagoCompleto.venta?.cliente?.nombre_completo) || 'Cliente'
                await actividadService.registrarActividad(
                  'Registró un pago',
                  `$${pago.monto.toLocaleString()} - ${nombreCliente}`,
                  'pago',
                  pagoCompleto.id
                )
              } catch (actError) {
                console.error('⚠️ [pagosService.create] Error registrando actividad (no crítico):', actError)
              }
              return pagoCompleto
            }
          } catch (getError) {
            console.warn('⚠️ [pagosService.create] No se pudo obtener pago con relaciones (pago ya guardado):', getError)
          }
          return retryData as Pago
        }
        
        // Registrar actividad SOLO después de confirmar que el pago se creó exitosamente
        try {
          const { actividadService } = await import('./actividad')
          const nombreCliente = (retryData.venta?.cliente?.nombre_completo) || 'Cliente'
          await actividadService.registrarActividad(
            'Registró un pago',
            `$${pago.monto.toLocaleString()} - ${nombreCliente}`,
            'pago',
            retryData.id
          )
        } catch (actError) {
          console.error('⚠️ [pagosService.create] Error registrando actividad (no crítico):', actError)
        }
        
        return retryData
      }
      
      // Si no es un error de columna, lanzar el error normalmente
      // NO registrar actividad si el pago falla
      throw error
    }
    
    // Si no hay error, continuar con el flujo normal
    console.log('✅ [pagosService.create] Pago insertado exitosamente:', {
      id: data?.id,
      venta_id: data?.venta_id,
      monto: data?.monto,
      empresa_id: data?.empresa_id,
      sucursal_id: data?.sucursal_id
    })
    
    // Verificar que el pago se insertó correctamente antes de continuar
    if (!data || !data.id) {
      console.error('❌ [pagosService.create] El pago no se insertó correctamente (data es null o no tiene id)')
      throw new Error('Error: El pago no se insertó correctamente en la base de datos')
    }
    
    console.log('✅ [pagosService.create] Pago verificado en base de datos:', {
      id: data.id,
      venta_id: data.venta_id,
      monto: data.monto,
      empresa_id: data.empresa_id,
      sucursal_id: data.sucursal_id
    })
    
    // Actualizar saldo pendiente de la venta SOLO si NO es un pago inicial
    if (!esPagoInicial) {
      try {
        const nuevoSaldoRedondeado = Math.round(nuevoSaldo * 100) / 100
        await ventasService.updateSaldo(pago.venta_id, nuevoSaldoRedondeado)
        console.log('✅ [pagosService.create] Saldo de venta actualizado:', nuevoSaldoRedondeado)
      } catch (saldoError) {
        console.error('❌ [pagosService.create] Error actualizando saldo de venta:', saldoError)
        // No lanzar error aquí para no perder el pago ya insertado
        // Pero registrar el problema
      }
    }
    
    // Si las relaciones no vinieron, obtener el pago completo nuevamente
    if (!data.venta || !(data.venta as any).motor || !(data.venta as any).cliente) {
      console.log('⚠️ [pagosService.create] Relaciones no completas, obteniendo pago completo...')
      const pagoCompleto = await this.getById(data.id)
      if (!pagoCompleto) {
        console.error('❌ [pagosService.create] No se pudo obtener el pago completo después de crearlo')
        throw new Error('Error al obtener el pago completo después de crearlo')
      }
      
      // Registrar actividad SOLO después de confirmar que todo está correcto
      try {
        const { actividadService } = await import('./actividad')
        const nombreCliente = (pagoCompleto.venta?.cliente?.nombre_completo) || 'Cliente'
        await actividadService.registrarActividad(
          'Registró un pago',
          `$${pago.monto.toLocaleString()} - ${nombreCliente}`,
          'pago',
          pagoCompleto.id
        )
        console.log('✅ [pagosService.create] Actividad registrada')
      } catch (actError) {
        console.error('⚠️ [pagosService.create] Error registrando actividad (no crítico):', actError)
        // No lanzar error, el pago ya está guardado
      }
      
      return pagoCompleto
    }
    
    // Registrar actividad SOLO después de confirmar que el pago se insertó correctamente
    try {
      const { actividadService } = await import('./actividad')
      const nombreCliente = (data.venta?.cliente?.nombre_completo) || 'Cliente'
      await actividadService.registrarActividad(
        'Registró un pago',
        `$${pago.monto.toLocaleString()} - ${nombreCliente}`,
        'pago',
        data.id
      )
      console.log('✅ [pagosService.create] Actividad registrada')
    } catch (actError) {
      console.error('⚠️ [pagosService.create] Error registrando actividad (no crítico):', actError)
      // No lanzar error, el pago ya está guardado
    }
    
    return data
  },

  async delete(id: string, ventaId: string): Promise<void> {
    // Obtener el pago (monto y numero_cuota para restaurar saldo)
    let pago: { monto: number; numero_cuota?: number | null } | null = null
    let pagoError: unknown = null
    const res = await supabase.from('pagos').select('monto, numero_cuota').eq('id', id).single() as { data: typeof pago; error: unknown }
    pago = res.data
    pagoError = res.error
    if (pagoError && (res as any).error?.message?.includes('column')) {
      const fallback = await supabase.from('pagos').select('monto').eq('id', id).single() as { data: { monto: number } | null; error: unknown }
      pago = fallback.data ? { ...fallback.data, numero_cuota: undefined } : null
      pagoError = fallback.error
    }
    if (pagoError) throw pagoError
    if (!pago) throw new Error('Pago no encontrado')

    // Eliminar el pago primero para no dejar saldo inconsistente si falla después
    const { error: deleteError } = await supabase.from('pagos').delete().eq('id', id)
    if (deleteError) throw deleteError

    // Restaurar saldo de la venta (no fallar si getById o updateSaldo dan error)
    const esPagoInicial = pago.numero_cuota === null
    if (!esPagoInicial) {
      try {
        const venta = await ventasService.getById(ventaId)
        if (venta != null) {
          const nuevoSaldo = Math.round((venta.saldo_pendiente + pago.monto) * 100) / 100
          await ventasService.updateSaldo(ventaId, nuevoSaldo)
        }
      } catch (e) {
        console.warn('⚠️ [pagosService.delete] No se pudo actualizar saldo de la venta (pago ya eliminado):', e)
      }
    }
  },
}







