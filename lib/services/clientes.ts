import { supabase, supabaseRaw, logSupabaseError } from '../supabase'
import type { Cliente } from '@/types'
import { getCompaniaActual, getCompaniaActualOrFromPerfil } from '../utils/compania'
import { getAppId, withAppIdData, withAppIdFilter } from '../utils/appId'
import { orEmpresaCompania } from '../utils/postgrest'

const CACHE_KEY = 'jasi_clientes_cache'
const CACHE_MAX_AGE_MS = 5 * 60 * 1000 // 5 minutos

function isColumnRelatedError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? '')
  return /column|empresa_id|compania_id/i.test(msg)
}

function getCacheKey(): string {
  const compania = getCompaniaActual()
  return `${CACHE_KEY}_${compania || 'none'}`
}

function rowToCliente(row: Record<string, unknown>): Cliente {
  return {
    ...row,
    nombre_garante: (row.nombre_garante as string) ?? '',
  } as Cliente
}

export const clientesService = {
  getCachedClientes(): Cliente[] | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(getCacheKey())
      if (!raw) return null
      const { data, ts } = JSON.parse(raw)
      if (Date.now() - ts > CACHE_MAX_AGE_MS) return null
      return data
    } catch {
      return null
    }
  },

  setCacheClientes(data: Cliente[]): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(getCacheKey(), JSON.stringify({ data, ts: Date.now() }))
    } catch {
      /* ignore */
    }
  },

  /**
   * Obtiene todos los clientes de la empresa (búsqueda global - sin filtrar por sucursal).
   * Sin compañía asignada no se consulta la BD (aislamiento por empresa).
   */
  async getAll(): Promise<Cliente[]> {
    let compania = getCompaniaActual() || await getCompaniaActualOrFromPerfil()
    if (!compania) {
      compania = await getCompaniaActualOrFromPerfil()
    }
    const { perfilesService } = await import('./perfiles')
    const esSuperAdmin = await perfilesService.isSuperAdmin()
    if (!compania && !esSuperAdmin) {
      return []
    }
    // Persistir para que CompaniaContext y próximas llamadas lo tengan
    if (compania && typeof window !== 'undefined') {
      localStorage.setItem('compania_actual', compania)
    }

    let query = supabase.from('clientes').select('*')

    if (compania) {
      query = query.eq('empresa_id', compania)
    }

    query = withAppIdFilter(query, 'clientes')
    let { data, error } = await query.order('created_at', { ascending: false })

    if (error && isColumnRelatedError(error)) {
      const fallbackQuery = withAppIdFilter(supabase.from('clientes').select('*'), 'clientes')
      const fallback = await fallbackQuery.order('created_at', { ascending: false })
      data = fallback.data
      error = fallback.error
    }

    if (error) {
      logSupabaseError('clientes', 'getAll', error)
      throw error
    }

    let rows = (data || []) as Record<string, unknown>[]
    if (compania) {
      rows = rows.filter((r) => r.empresa_id === compania || r.compania_id === compania)
    }
    const result = rows.map(rowToCliente)
    this.setCacheClientes(result)
    return result
  },

  /**
   * Obtiene un cliente por ID (búsqueda global - sin filtrar por sucursal)
   * Permite que cualquier sucursal pueda ver clientes creados en otras sucursales
   */
  async getById(id: string): Promise<Cliente | null> {
    const compania = getCompaniaActual() || await getCompaniaActualOrFromPerfil()
    const { perfilesService } = await import('./perfiles')
    const esSuperAdmin = await perfilesService.isSuperAdmin()
    if (!compania && !esSuperAdmin) {
      throw new Error('No hay compañía seleccionada')
    }

    // Buscar por empresa_id o compania_id (retrocompatibilidad)
    let query = supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
    
    if (compania) {
      query = query.eq('empresa_id', compania)
    }
    // super_admin sin compania: RLS permite todo, no añadir filtro

    query = withAppIdFilter(query, 'clientes')
    const { data, error } = await query.single() as { data: { empresa_id?: string; [key: string]: unknown } | null; error: { message?: string; code?: string } | null }
    
    if (error) {
      if (error.code === 'PGRST116') return null
      if (error.message?.includes('column')) {
        let fallbackQuery = supabase.from('clientes').select('*').eq('id', id)
        fallbackQuery = withAppIdFilter(fallbackQuery, 'clientes')
        const { data: allData, error: allError } = await fallbackQuery.single() as { data: { empresa_id?: string; compania_id?: string; [key: string]: unknown } | null; error: { code?: string } | null }
        if (allError) {
          if ((allError as { code?: string }).code === 'PGRST116') return null
          throw allError
        }
        if (compania && allData && allData.empresa_id !== compania && allData.compania_id !== compania) return null
        return allData as unknown as Cliente | null
      }
      throw error
    }
    if (!esSuperAdmin && compania && (!data || (data.empresa_id !== compania && (data as { compania_id?: string }).compania_id !== compania))) {
      return null
    }

    return data as unknown as Cliente | null
  },

  /**
   * Busca un cliente por cédula en la empresa actual.
   * Útil para importación cuando varias filas pueden tener el mismo cliente (varios préstamos).
   */
  async getByCedula(cedula: string): Promise<Cliente | null> {
    const compania = getCompaniaActual()
    if (!compania) return null
    let query = supabase
      .from('clientes')
      .select('*')
      .eq('cedula', cedula)
      .eq('empresa_id', compania)
      .limit(1)
    query = withAppIdFilter(query, 'clientes')
    const { data, error } = await query
    if (error || !data?.length) return null
    return data[0] as Cliente
  },

  async create(cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>): Promise<Cliente> {
    // Obtener empresa: primero del contexto (localStorage), si no del perfil del usuario (nombre de empresa → id al registrarse)
    let compania = getCompaniaActual()
    if (!compania) {
      compania = await getCompaniaActualOrFromPerfil()
      if (compania && typeof window !== 'undefined') {
        localStorage.setItem('compania_actual', compania)
      }
    }
    if (!compania) {
      throw new Error('No se pudo obtener la empresa. Cierra sesión, vuelve a entrar y si sigue el error, verifica que tu usuario tenga una empresa asignada (Admin > Usuarios).')
    }

    const { perfilesService } = await import('./perfiles')
    const sucursalId = await perfilesService.getSucursalActual()
    
    const clienteData: any = withAppIdData({ ...cliente }, 'clientes')
    
    // Esquema UUID: solo empresa_id (obligatorio)
    clienteData.empresa_id = compania
    clienteData.sucursal_id = sucursalId || null
    
    // Verificar si ya existe un cliente con esta cédula en esta empresa
    if (compania) {
      let existsQuery = supabase
        .from('clientes')
        .select('id')
        .eq('cedula', cliente.cedula)
        .eq('empresa_id', compania)
        .limit(1)
      existsQuery = withAppIdFilter(existsQuery, 'clientes')
      const { data: existeCliente, error: checkError } = await existsQuery
      
      if (checkError && !checkError.message?.includes('column')) {
        // Si hay error al verificar, continuar de todas formas (puede ser que la columna no exista)
        console.warn('Error verificando cédula duplicada:', checkError)
      } else if (existeCliente && existeCliente.length > 0) {
        throw new Error('Ya existe un cliente con esta cédula en su compañía')
      }
    }
    
    const intentarInsertar = async () => {
      return await (supabase as any)
        .from('clientes')
        .insert(clienteData)
        .select()
        .single()
    }

    let { data, error } = await intentarInsertar()
    
    // Si el error es por columna inexistente, reintentar sin campos opcionales
    if (error && error.message?.includes('column')) {
      const camposOpcionales = ['compania_id', 'app_id', 'direccion_garante', 'telefono_garante', 'email_garante', 'nombre_garante', 'email', 'fecha_compra', 'numero_prestamo_cliente', 'url_id_frontal', 'url_id_trasera', 'url_contrato', 'latitud_negocio', 'longitud_negocio']
      camposOpcionales.forEach((c) => delete (clienteData as any)[c])
      let { data: retryData, error: retryError } = await (supabase as any)
        .from('clientes')
        .insert(clienteData)
        .select()
        .single()
      // Si aún falla, intentar solo con columnas mínimas
      if (retryError && retryError.message?.includes('column')) {
        const minimo = {
          nombre_completo: clienteData.nombre_completo,
          cedula: clienteData.cedula,
          direccion: clienteData.direccion || 'Sin especificar',
          celular: clienteData.celular || null,
          empresa_id: clienteData.empresa_id,
          sucursal_id: clienteData.sucursal_id,
        }
        const res = await (supabase as any).from('clientes').insert(minimo).select().single()
        retryData = res.data
        retryError = res.error
      }
      if (retryError) throw retryError
      
      // Registrar actividad
      try {
        const { actividadService } = await import('./actividad')
        await actividadService.registrarActividad(
          'Creó un cliente',
          `Cliente: ${cliente.nombre_completo} (${cliente.cedula})`,
          'cliente',
          retryData.id
        )
      } catch (error) {
        console.error('Error registrando actividad:', error)
      }
      
      return retryData
    }
    
    // Si el error es de duplicado, intentar regenerar número de préstamo cuando no es cédula
    if (error && (error.message?.includes('duplicate key') || error.message?.includes('unique'))) {
      const errorMessage = error.message || ''
      const errorCode = (error as any).code || ''
      const esCedula =
        errorMessage.includes('cedula') ||
        errorMessage.includes('clientes_cedula_key') ||
        errorMessage.includes('idx_clientes_compania_cedula_unique')

      if (!esCedula && (errorCode === '23505' || errorMessage.includes('numero_prestamo_cliente'))) {
        // Reintentar con número nuevo
        const nuevoNumero = await this.getSiguienteNumeroPrestamoCliente()
        clienteData.numero_prestamo_cliente = nuevoNumero
        const retry = await intentarInsertar()
        if (retry.error) {
          throw retry.error
        }
        data = retry.data
        error = null
      } else if (esCedula) {
        if (
          errorMessage.includes('idx_clientes_compania_cedula_unique') ||
          errorMessage.includes('compania_id')
        ) {
          throw new Error('Ya existe un cliente con esta cédula en su compañía')
        }
        throw new Error('Ya existe un cliente con esta cédula')
      }
    }
    
    if (error) throw error
    
    // Registrar actividad
    if (data) {
      try {
        const { actividadService } = await import('./actividad')
        await actividadService.registrarActividad(
          'Creó un cliente',
          `Cliente: ${cliente.nombre_completo} (${cliente.cedula})`,
          'cliente',
          data.id
        )
      } catch (error) {
        console.error('Error registrando actividad:', error)
      }
    }
    
    return data
  },

  async update(id: string, cliente: Partial<Cliente>): Promise<Cliente> {
    const compania = getCompaniaActual()
    const runUpdate = async (payload: Record<string, unknown>) => {
      let query = (supabase as any)
        .from('clientes')
        .update(withAppIdData(payload, 'clientes'))
        .eq('id', id)
      if (compania) query = query.eq('empresa_id', compania)
      query = withAppIdFilter(query, 'clientes')
      return await query.select().single()
    }

    // Intentar con updated_at (recomendado)
    const updateData: any = { ...cliente, updated_at: new Date().toISOString() }
    const { data, error } = await runUpdate(updateData)

    if (!error) return data

    // Si falla por columna (ej. updated_at no existe), reintentar sin updated_at
    if (isColumnRelatedError(error)) {
      const { updated_at: _, ...sinUpdatedAt } = updateData
      const { data: data2, error: error2 } = await runUpdate(sinUpdatedAt)
      if (!error2) return data2
      throw error2
    }

    throw error
  },

  async delete(id: string): Promise<void> {
    // Obtener datos del cliente antes de eliminar para registrar en historial
    const cliente = await this.getById(id)
    const clienteNombre = cliente?.nombre_completo || 'Cliente'

    let deleteQuery = supabase
      .from('clientes')
      .delete()
      .eq('id', id)
    deleteQuery = withAppIdFilter(deleteQuery, 'clientes')
    const { error } = await deleteQuery

    if (error) {
      const errorMessage = error.message || 'Error desconocido al eliminar el cliente'
      const errorWithDetails = new Error(errorMessage)
      ;(errorWithDetails as any).code = error.code
      ;(errorWithDetails as any).details = error.details
      throw errorWithDetails
    }

    // Registrar en historial de actividad (Admin/Historial)
    try {
      const { actividadService } = await import('./actividad')
      await actividadService.registrarActividad(
        'Eliminó un cliente',
        `Cliente eliminado: ${clienteNombre} (${cliente?.cedula || 'N/A'})`,
        'cliente',
        id
      )
    } catch (actividadError) {
      console.warn('⚠️ [clientesService.delete] Error registrando actividad:', actividadError)
    }
  },

  /**
   * Genera el siguiente número de cliente en formato secuencial por empresa.
   * Formato exigido: CLI-0001, CLI-0002, CLI-0003... (4 dígitos, secuencial por empresa)
   */
  async getSiguienteNumeroPrestamoCliente(): Promise<string> {
    const compania = getCompaniaActual() || (await getCompaniaActualOrFromPerfil())
    const appId = getAppId()
    const appSuffix = appId ? appId.toUpperCase() : null

    const generarRespaldo = () => {
      const ts = Date.now().toString().slice(-8)
      const r = Math.floor(Math.random() * 90 + 10)
      return appSuffix ? `CLI-${appSuffix}-${ts}-${r}` : `CLI-${ts}-${r}`
    }

    try {
      if (!compania) {
        console.warn('[getSiguienteNumeroPrestamoCliente] Sin compañía, usando respaldo')
        return generarRespaldo()
      }

      const { data: rows, error } = await supabaseRaw
        .from('clientes')
        .select('numero_prestamo_cliente')
        .eq('empresa_id', compania)
        .not('numero_prestamo_cliente', 'is', null)

      if (error) {
        if (error.message?.includes('column') || error.message?.includes('numero_prestamo_cliente')) {
          console.warn('[getSiguienteNumeroPrestamoCliente] Columna inexistente, usando respaldo:', error.message)
          return generarRespaldo()
        }
        throw error
      }

      // Extraer números del formato CLI-XXXX o CLI-APP-XXXX (solo formato secuencial)
      const regex = /^CLI-(?:[A-Z]+-)?(\d+)$/i
      let maxNum = 0
      for (const r of rows || []) {
        const val = (r as { numero_prestamo_cliente?: string })?.numero_prestamo_cliente
        if (!val) continue
        const m = val.match(regex)
        if (m) {
          const n = parseInt(m[1], 10)
          if (!isNaN(n) && n > maxNum) maxNum = n
        }
      }

      const siguiente = maxNum + 1
      const numero = appSuffix
        ? `CLI-${appSuffix}-${String(siguiente).padStart(4, '0')}`
        : `CLI-${String(siguiente).padStart(4, '0')}`

      // Verificar que no exista (race condition)
      const { data: existe } = await supabaseRaw
        .from('clientes')
        .select('id')
        .eq('empresa_id', compania)
        .eq('numero_prestamo_cliente', numero)
        .limit(1)

      if (existe && existe.length > 0) {
        return appSuffix
          ? `CLI-${appSuffix}-${String(siguiente + 1).padStart(4, '0')}`
          : `CLI-${String(siguiente + 1).padStart(4, '0')}`
      }

      return numero
    } catch (err: any) {
      console.error('Error generando número de préstamo de cliente:', err)
      return generarRespaldo()
    }
  },

  /**
   * Elimina un cliente y todos sus préstamos y pagos asociados (solo Admin)
   * Nota: Si la restricción es CASCADE, las ventas se eliminan automáticamente.
   * Si es RESTRICT, primero eliminamos las ventas manualmente.
   */
  async eliminar(clienteId: string): Promise<void> {
    try {
      // Obtener información del cliente antes de eliminarlo para registrar actividad
      const cliente = await this.getById(clienteId)
      const clienteNombre = cliente?.nombre_completo || 'Cliente desconocido'

      // 1. Obtener todas las ventas (préstamos) asociadas al cliente
      const { ventasService } = await import('./ventas')
      const ventas = await ventasService.getByCliente(clienteId)

      const { supabase } = await import('../supabase')

      // 2. Si hay ventas, eliminarlas primero (y sus pagos)
      // Esto es necesario si la restricción es RESTRICT, y es seguro si es CASCADE
      for (const venta of ventas) {
        // Eliminar pagos de esta venta primero
        const { error: pagosError } = await supabase
          .from('pagos')
          .delete()
          .eq('venta_id', venta.id)

        if (pagosError) {
          console.warn(`⚠️ [clientesService.eliminar] Error eliminando pagos de venta ${venta.id}:`, pagosError)
          // Si hay error pero no es crítico, continuar
          if (!pagosError.message?.includes('does not exist') && !pagosError.message?.includes('column')) {
            // Error real, pero continuamos para intentar eliminar el resto
          }
        }

        // Eliminar la venta
        let ventaDeleteQuery = supabase
          .from('ventas')
          .delete()
          .eq('id', venta.id)
        ventaDeleteQuery = withAppIdFilter(ventaDeleteQuery, 'ventas')
        const { error: ventaError } = await ventaDeleteQuery

        if (ventaError) {
          // Si el error es por restricción, intentar eliminar el cliente de todas formas
          // (puede que la restricción sea CASCADE y se elimine automáticamente)
          if (ventaError.message?.includes('violates foreign key constraint') || 
              ventaError.message?.includes('restrict')) {
            console.warn(`⚠️ [clientesService.eliminar] Restricción detectada para venta ${venta.id}, intentando eliminar cliente de todas formas`)
            // Continuar con la eliminación del cliente
          } else {
            console.warn(`⚠️ [clientesService.eliminar] Error eliminando venta ${venta.id}:`, ventaError)
            // Continuar con la eliminación del cliente
          }
        }
      }

      // 3. Eliminar el cliente
      // Si la restricción es CASCADE, las ventas restantes se eliminarán automáticamente
      let clienteDeleteQuery = supabase
        .from('clientes')
        .delete()
        .eq('id', clienteId)
      clienteDeleteQuery = withAppIdFilter(clienteDeleteQuery, 'clientes')
      const { error: clienteError } = await clienteDeleteQuery

      if (clienteError) {
        // Si el error es por restricción, significa que aún hay ventas asociadas
        if (clienteError.message?.includes('violates foreign key constraint') || 
            clienteError.message?.includes('restrict')) {
          throw new Error('No se puede eliminar el cliente porque tiene préstamos asociados. Por favor, ejecuta el script SQL para cambiar la restricción a CASCADE.')
        }
        console.error('❌ [clientesService.eliminar] Error eliminando cliente:', clienteError)
        throw new Error(`Error al eliminar el cliente: ${clienteError.message}`)
      }

      // 4. Registrar actividad
      try {
        const { actividadService } = await import('./actividad')
        await actividadService.registrarActividad(
          `Eliminó un cliente`,
          `Cliente eliminado: ${clienteNombre} - Préstamos eliminados: ${ventas.length}`,
          'cliente',
          clienteId
        )
      } catch (actividadError) {
        console.warn('⚠️ [clientesService.eliminar] Error registrando actividad:', actividadError)
        // No lanzar error, la eliminación ya fue exitosa
      }

      console.log(`✅ [clientesService.eliminar] Cliente ${clienteId} eliminado correctamente`)
    } catch (error) {
      console.error('Error eliminando cliente:', error)
      throw error
    }
  },
}



