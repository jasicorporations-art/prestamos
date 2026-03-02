import { supabase } from '../supabase'

export interface CodigoRegistro {
  id: string
  codigo: string
  usado: boolean
  usado_por_email?: string
  usado_en?: string
  creado_en: string
  notas?: string
}

export const codigosRegistroService = {
  /**
   * Validar si un código de registro existe y está disponible (no usado)
   */
  async validarCodigo(codigo: string): Promise<{ valido: boolean; mensaje?: string }> {
    try {
      const codigoLimpio = codigo.trim()
      console.log('Validando código:', codigoLimpio)
      
      // Primero intentar buscar el código exacto
      const { data, error } = await supabase
        .from('codigos_registro')
        .select('codigo, usado, usado_por_email')
        .eq('codigo', codigoLimpio)
        .single() as { data: { codigo?: string; usado?: boolean; usado_por_email?: string } | null; error: { message?: string; code?: string } | null }

      console.log('Resultado de la consulta:', { data, error })

      if (error) {
        // Si la tabla no existe
        if (error.message?.includes('relation') && error.message?.includes('does not exist') ||
            error.message?.includes('does not exist') && error.message?.includes('codigos_registro')) {
          return {
            valido: false,
            mensaje: 'La tabla de códigos de registro no existe en la base de datos. Por favor, ejecuta los scripts SQL en Supabase: crear-tabla-codigos-registro.sql y generar-codigos-registro-iniciales.sql',
          }
        }
        
        // Si el código no existe (PGRST116 es el código de "no rows returned")
        if (error.code === 'PGRST116' || error.message?.includes('No rows') || error.message?.includes('JSON object requested, multiple')) {
          // Intentar buscar sin .single() para ver si hay códigos similares
          const { data: todosCodigos } = await supabase
            .from('codigos_registro')
            .select('codigo, usado')
            .ilike('codigo', `%${codigoLimpio}%`)
            .limit(10) as { data: { codigo: string }[] | null }
          
          console.log('Códigos similares encontrados:', todosCodigos)
          
          return {
            valido: false,
            mensaje: `El código "${codigoLimpio}" no existe en la base de datos.\n\nPor favor, verifique:\n1. Que el código esté escrito exactamente igual (distingue mayúsculas y minúsculas)\n2. Que no haya espacios al inicio o final\n3. Que el código esté en la base de datos\n\nCódigos disponibles similares: ${todosCodigos?.map(c => c.codigo).join(', ') || 'ninguno'}`,
          }
        }
        
        console.error('Error validando código:', error)
        return {
          valido: false,
          mensaje: `Error al validar el código: ${error.message || error.code || 'Error desconocido'}. Por favor, verifica tu conexión e intente nuevamente.`,
        }
      }

      if (!data) {
        return {
          valido: false,
          mensaje: `El código "${codigoLimpio}" no existe. Por favor, verifique el código e intente nuevamente.`,
        }
      }

      if (data.usado) {
        return {
          valido: false,
          mensaje: `Este código de registro ya fue usado por ${data.usado_por_email || 'otro usuario'}. Cada código solo puede usarse una vez. Necesitas un código nuevo para crear otra cuenta.`,
        }
      }

      console.log('Código válido:', data)
      return { valido: true }
    } catch (error: any) {
      console.error('Error validando código de registro:', error)
      
      // Si la tabla no existe, dar mensaje claro
      if (error.message?.includes('relation') && error.message?.includes('does not exist') ||
          error.message?.includes('does not exist') && error.message?.includes('codigos_registro')) {
        return {
          valido: false,
          mensaje: 'ERROR: La tabla de códigos de registro no existe en Supabase. Por favor, ejecuta estos scripts SQL en Supabase:\n\n1. crear-tabla-codigos-registro.sql\n2. generar-codigos-registro-iniciales.sql\n\nVer la guía: EJECUTAR_SCRIPTS_CODIGOS_REGISTRO.md',
        }
      }
      
      return {
        valido: false,
        mensaje: `Error al validar el código de registro: ${error.message || 'Error desconocido'}. Por favor, verifica tu conexión e intente nuevamente.`,
      }
    }
  },

  /**
   * Marcar un código como usado después de crear la cuenta exitosamente
   */
  async marcarComoUsado(codigo: string, email: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('codigos_registro')
        .update({
          usado: true,
          usado_por_email: email,
          usado_en: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('codigo', codigo.trim())
        .eq('usado', false) // Solo actualizar si aún no está usado

      if (error) {
        // Si la tabla no existe, no hacer nada (compatibilidad hacia atrás)
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          console.warn('Tabla codigos_registro no existe, omitiendo marcado como usado')
          return
        }
        throw error
      }
    } catch (error: any) {
      console.error('Error marcando código como usado:', error)
      // No lanzar error para no interrumpir el proceso de registro
      // Solo registrar el error
    }
  },

  /**
   * Obtener todos los códigos disponibles (no usados)
   */
  async getCodigosDisponibles(): Promise<CodigoRegistro[]> {
    try {
      const { data, error } = await supabase
        .from('codigos_registro')
        .select('*')
        .eq('usado', false)
        .order('creado_en', { ascending: false })

      if (error) {
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          return []
        }
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error obteniendo códigos disponibles:', error)
      return []
    }
  },

  /**
   * Obtener todos los códigos usados
   */
  async getCodigosUsados(): Promise<CodigoRegistro[]> {
    try {
      const { data, error } = await supabase
        .from('codigos_registro')
        .select('*')
        .eq('usado', true)
        .order('usado_en', { ascending: false })

      if (error) {
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          return []
        }
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error obteniendo códigos usados:', error)
      return []
    }
  },

  /**
   * Crear un nuevo código de registro
   */
  async crearCodigo(codigo: string, notas?: string): Promise<CodigoRegistro> {
    const { data, error } = await (supabase as any)
      .from('codigos_registro')
      .insert({
        codigo: codigo.trim(),
        usado: false,
        notas: notas || null,
      })
      .select()
      .single()

    if (error) throw error
    return data as CodigoRegistro
  },
}

