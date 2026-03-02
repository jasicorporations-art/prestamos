import { supabase } from '../supabase'

/**
 * Servicio para gestionar empresas y verificar unicidad
 */

export interface EmpresaInfo {
  nombre: string
  userId: string
  email: string
}

export const empresasService = {
  /**
   * Verifica si una empresa ya está registrada
   * Busca en la tabla de empresas si existe una con ese nombre (case-insensitive)
   */
  async verificarEmpresaDisponible(nombreEmpresa: string): Promise<{ disponible: boolean; mensaje?: string }> {
    try {
      // Normalizar el nombre de empresa (trim)
      const nombreNormalizado = nombreEmpresa.trim()
      
      if (!nombreNormalizado || nombreNormalizado.length === 0) {
        return {
          disponible: false,
          mensaje: 'El nombre de la empresa no puede estar vacío',
        }
      }

      // Primero intentar usar la función RPC (método más completo)
      try {
        const { data: rpcResult, error: rpcError } = await (supabase as any).rpc('verificar_empresa_disponible', {
          nombre_empresa: nombreNormalizado
        })
        
        if (!rpcError && rpcResult !== null && rpcResult !== undefined) {
          // rpcResult es TRUE si está disponible, FALSE si ya existe
          if (rpcResult === false) {
            return {
              disponible: false,
              mensaje: 'Esta empresa ya está registrada por otro usuario. Por favor, usa un nombre diferente.',
            }
          }
          // Si es true, está disponible
          return {
            disponible: true,
          }
        }
      } catch (rpcError: any) {
        // Si la función RPC no existe, continuar con método alternativo
        console.warn('Función RPC no disponible, usando método alternativo:', rpcError)
      }

      // Método alternativo: Buscar directamente en la tabla de empresas
      try {
        const { data: empresas, error } = await supabase
          .from('empresas')
          .select('nombre, user_id, email')
          .ilike('nombre', nombreNormalizado) // Case-insensitive search
        
        if (!error && empresas && empresas.length > 0) {
          return {
            disponible: false,
            mensaje: 'Esta empresa ya está registrada por otro usuario. Por favor, usa un nombre diferente.',
          }
        }
        
        // Si la tabla existe y no hay error, la empresa está disponible
        if (!error) {
          return {
            disponible: true,
          }
        }
        
        // Si hay error, la tabla no existe o no hay permisos
        // NO permitir el registro por seguridad
        const errorMessage = error.message || ''
        const errorCode = (error as any).code || ''
        const statusCode = (error as any).status || 0
        
        if (
          errorMessage.includes('does not exist') || 
          errorMessage.includes('relation') || 
          errorMessage.includes('permission denied') ||
          errorMessage.includes('not found') ||
          errorCode === 'PGRST116' ||
          errorCode === '42P01' ||
          statusCode === 404 ||
          statusCode === 401
        ) {
          console.error('Tabla empresas no existe o sin permisos. Se requiere configuración.')
          return {
            disponible: false,
            mensaje: 'El sistema de validación de empresas no está configurado. Por favor, contacta al administrador o ejecuta los scripts SQL necesarios.',
          }
        }
      } catch (error: any) {
        // Si hay error al acceder a la tabla, NO permitir registro
        console.error('Error verificando en tabla empresas:', error)
        return {
          disponible: false,
          mensaje: 'Error al verificar la disponibilidad de la empresa. Por favor, intenta nuevamente o contacta al administrador.',
        }
      }

      // Si llegamos aquí sin retornar, NO permitir el registro por seguridad
      console.error('No se puede verificar la disponibilidad de la empresa. Se requiere ejecutar los scripts SQL.')
      return {
        disponible: false,
        mensaje: 'El sistema de validación de empresas no está configurado correctamente. Por favor, contacta al administrador.',
      }
    } catch (error) {
      console.error('Error verificando disponibilidad de empresa:', error)
      return {
        disponible: false,
        mensaje: 'Error al verificar la disponibilidad de la empresa. Por favor, intenta nuevamente.',
      }
    }
  },

  /**
   * Registra una nueva empresa asociada a un usuario.
   * El trigger auto-onboarding crea automáticamente la sucursal principal.
   */
  async registrarEmpresa(
    nombreEmpresa: string,
    userId: string,
    email: string,
    rnc?: string,
    direccion?: string,
    telefono?: string
  ): Promise<string | undefined> {
    try {
      const nombreNormalizado = nombreEmpresa.trim()
      
      if (!nombreNormalizado || nombreNormalizado.length === 0) {
        throw new Error('El nombre de la empresa no puede estar vacío')
      }
      
      // Intentar insertar en tabla de empresas si existe
      try {
        const dataToInsert: any = {
          nombre: nombreNormalizado,
          user_id: userId,
          email: email,
        }
        
        // Agregar RNC si está disponible (la tabla puede no tener esta columna)
        if (rnc) {
          dataToInsert.rnc = rnc.trim()
        }
        
        // Dirección y teléfono para auto-onboarding (sucursal principal)
        if (direccion != null && direccion !== '') {
          dataToInsert.direccion = direccion.trim()
        }
        if (telefono != null && telefono !== '') {
          dataToInsert.telefono = telefono.trim()
        }
        
        const { data: inserted, error } = await (supabase as any)
          .from('empresas')
          .insert(dataToInsert)
          .select('id')
          .single()
        
        if (error) {
          const errorMessage = error.message || ''
          const errorCode = (error as any).code || ''
          const statusCode = (error as any).status || 0
          
          // Si es error de duplicado, es crítico - la empresa ya existe
          if (errorMessage.includes('duplicate') || errorMessage.includes('unique') || errorCode === '23505') {
            throw new Error('Esta empresa ya está registrada por otro usuario')
          }
          
          // Si la tabla no existe o hay error de permisos, lanzar error
          // No podemos permitir el registro sin validación
          if (
            errorMessage.includes('does not exist') || 
            errorMessage.includes('relation') || 
            errorMessage.includes('permission denied') ||
            errorMessage.includes('not found') ||
            errorCode === 'PGRST116' ||
            errorCode === '42P01' ||
            statusCode === 404 ||
            statusCode === 401
          ) {
            console.error('Tabla empresas no existe o sin permisos. El registro requiere configuración:', errorMessage)
            throw new Error('El sistema de registro de empresas no está configurado. Por favor, contacta al administrador.')
          }
          
          // Para otros errores, también lanzar error para no permitir registro sin validación
          console.error('Error registrando empresa en tabla:', error)
          throw new Error('Error al registrar la empresa. Por favor, intenta nuevamente o contacta al administrador.')
        }
        if (!inserted?.id) {
          throw new Error('No se pudo obtener el ID de la empresa creada.')
        }
        return inserted.id
      } catch (error: any) {
        // Re-lanzar el error (ya fue manejado arriba)
        throw error
      }
    } catch (error) {
      console.error('Error registrando empresa:', error)
      // Si es error de duplicado, lanzarlo
      if (error instanceof Error && error.message.includes('ya está registrada')) {
        throw error
      }
      // Para otros errores, no lanzar (el nombre ya está en user_metadata)
    }
  },
}

