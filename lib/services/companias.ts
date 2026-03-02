import { supabase } from '../supabase'

export interface Compania {
  nombre: string
  usuarios_count?: number
}

export const companiasService = {
  /**
   * Obtiene todas las compañías únicas de los usuarios registrados
   */
  async getAll(): Promise<Compania[]> {
    try {
      // Obtener todos los usuarios y extraer sus compañías
      const { data: { users }, error } = await supabase.auth.admin.listUsers()
      
      if (error) {
        // Si no tenemos permisos de admin, intentar obtener desde user_metadata
        // Esto requiere que los usuarios tengan su compañía en user_metadata
        console.warn('No se pueden obtener usuarios como admin, usando método alternativo')
        return []
      }

      // Extraer compañías únicas de user_metadata
      const companiasMap = new Map<string, number>()
      
      users?.forEach(user => {
        const compania = user.user_metadata?.compania
        if (compania && typeof compania === 'string') {
          const count = companiasMap.get(compania) || 0
          companiasMap.set(compania, count + 1)
        }
      })

      // Convertir a array
      const companias: Compania[] = Array.from(companiasMap.entries()).map(([nombre, count]) => ({
        nombre,
        usuarios_count: count,
      }))

      // Ordenar alfabéticamente
      return companias.sort((a, b) => a.nombre.localeCompare(b.nombre))
    } catch (error) {
      console.error('Error obteniendo compañías:', error)
      // Si falla, devolver lista vacía o intentar método alternativo
      return []
    }
  },

  /**
   * Obtiene las compañías disponibles desde una tabla dedicada (método alternativo)
   * Este método requiere crear una tabla de compañías en Supabase
   */
  async getAllFromTable(): Promise<Compania[]> {
    try {
      const { data, error } = await supabase
        .from('companias')
        .select('nombre')
        .order('nombre', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error obteniendo compañías desde tabla:', error)
      return []
    }
  },

  /**
   * Obtiene las compañías únicas desde los usuarios actuales (método más simple)
   * Este método funciona consultando directamente los metadatos de usuarios
   */
  async getCompaniasFromUsers(): Promise<string[]> {
    try {
      // Obtener la compañía del usuario actual para validación
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return []
      }

      // Para obtener todas las compañías, necesitamos usar una función de Supabase
      // o crear una tabla de compañías. Por ahora, retornamos la compañía del usuario actual
      const compania = user.user_metadata?.compania
      
      if (compania) {
        return [compania]
      }

      return []
    } catch (error) {
      console.error('Error obteniendo compañías de usuarios:', error)
      return []
    }
  },
}



