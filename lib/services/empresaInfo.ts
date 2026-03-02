import { supabase } from '../supabase'
import { getCompaniaActual } from '../utils/compania'
import { authService } from './auth'

/**
 * Obtiene la información de la empresa del usuario actual
 */
export const empresaInfoService = {
  /**
   * Obtiene el RNC de la empresa del usuario actual
   * Busca primero en user_metadata, luego en la tabla empresas
   */
  async getRNC(): Promise<string | null> {
    try {
      // 1. Intentar obtener desde user_metadata
      const user = await authService.getCurrentUser()
      if (user?.user_metadata?.rnc) {
        return user.user_metadata.rnc
      }

      // 2. Intentar obtener desde la tabla empresas usando el nombre de la empresa
      const compania = getCompaniaActual()
      if (compania) {
        try {
          const { data: empresa, error } = await supabase
            .from('empresas')
            .select('rnc')
            .eq('nombre', compania)
            .single() as { data: { rnc?: string } | null; error: unknown }

          if (!error && empresa?.rnc) {
            return empresa.rnc
          }
        } catch (error) {
          console.warn('Error obteniendo RNC desde tabla empresas:', error)
        }
      }

      return null
    } catch (error) {
      console.error('Error obteniendo RNC:', error)
      return null
    }
  },

  /**
   * Obtiene el nombre de la empresa del usuario actual
   */
  async getNombreEmpresa(): Promise<string | null> {
    try {
      const user = await authService.getCurrentUser()
      if (user?.user_metadata?.compania) {
        return user.user_metadata.compania
      }

      const compania = getCompaniaActual()
      return compania || null
    } catch (error) {
      console.error('Error obteniendo nombre de empresa:', error)
      return null
    }
  },

  /**
   * Obtiene la dirección de la empresa del usuario actual
   */
  async getDireccionEmpresa(): Promise<string | null> {
    try {
      const user = await authService.getCurrentUser()
      if (user?.user_metadata?.direccion) {
        return user.user_metadata.direccion
      }

      // Intentar desde tabla empresas
      const compania = getCompaniaActual()
      if (compania) {
        try {
          const { data: empresa, error } = await supabase
            .from('empresas')
            .select('direccion')
            .eq('nombre', compania)
            .single() as { data: { direccion?: string } | null; error: unknown }

          if (!error && empresa?.direccion) {
            return empresa.direccion
          }
        } catch (error) {
          console.warn('Error obteniendo dirección desde tabla empresas:', error)
        }
      }

      return null
    } catch (error) {
      console.error('Error obteniendo dirección de empresa:', error)
      return null
    }
  },

  /**
   * Obtiene el teléfono de la empresa del usuario actual
   */
  async getTelefonoEmpresa(): Promise<string | null> {
    try {
      const user = await authService.getCurrentUser()
      if (user?.user_metadata?.telefono) {
        return user.user_metadata.telefono
      }

      // Intentar desde tabla empresas
      const compania = getCompaniaActual()
      if (compania) {
        try {
          const { data: empresa, error } = await supabase
            .from('empresas')
            .select('telefono')
            .eq('nombre', compania)
            .single() as { data: { telefono?: string } | null; error: unknown }

          if (!error && empresa?.telefono) {
            return empresa.telefono
          }
        } catch (error) {
          console.warn('Error obteniendo teléfono desde tabla empresas:', error)
        }
      }

      return null
    } catch (error) {
      console.error('Error obteniendo teléfono de empresa:', error)
      return null
    }
  },
}


