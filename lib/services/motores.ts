import { supabase } from '../supabase'
import type { Motor } from '@/types'
import { getCompaniaActual, getCompaniaActualOrFromPerfil } from '../utils/compania'
import { withAppIdData, withAppIdFilter } from '../utils/appId'

export const motoresService = {
  async getAll(): Promise<Motor[]> {
    const compania = getCompaniaActual() || await getCompaniaActualOrFromPerfil()
    const { perfilesService } = await import('./perfiles')
    const esSuperAdmin = await perfilesService.isSuperAdmin()
    if (!compania && !esSuperAdmin) {
      return []
    }
    let query = supabase
      .from('motores')
      .select('*')
    if (compania) {
      query = query.eq('empresa_id', compania)
    }
    query = withAppIdFilter(query, 'motores')
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    let rows = data || []
    if (compania) {
      rows = rows.filter((m: { empresa_id?: string; compania_id?: string }) => m.empresa_id === compania || m.compania_id === compania)
    }
    return rows as Motor[]
  },

  async getById(id: string): Promise<Motor | null> {
    const compania = getCompaniaActual() || await getCompaniaActualOrFromPerfil()
    const { perfilesService } = await import('./perfiles')
    const esSuperAdmin = await perfilesService.isSuperAdmin()
    if (!compania && !esSuperAdmin) {
      throw new Error('No hay compañía seleccionada')
    }

    let motorQuery = supabase
      .from('motores')
      .select('*')
      .eq('id', id)
    if (compania) {
      motorQuery = motorQuery.eq('empresa_id', compania)
    }
    motorQuery = withAppIdFilter(motorQuery, 'motores')
    const { data, error } = await motorQuery.single() as { data: { empresa_id?: string; compania_id?: string; [key: string]: unknown } | null; error: { message?: string } | null }
    
    if (error) {
      if (error.message?.includes('column')) {
        let fallbackQuery = supabase.from('motores').select('*').eq('id', id)
        fallbackQuery = withAppIdFilter(fallbackQuery, 'motores')
        const { data: allData, error: allError } = await fallbackQuery.single() as { data: { empresa_id?: string; compania_id?: string; [key: string]: unknown } | null; error: unknown }
        if (allError) throw allError
        if (compania && allData && allData.empresa_id !== compania && allData.compania_id !== compania) return null
        return allData as unknown as Motor | null
      }
      throw error
    }
    
    // Si no se encontró el motor o no pertenece a la compañía, retornar null (salvo super_admin)
    if (!esSuperAdmin && compania && (!data || (data.empresa_id !== compania && data.compania_id !== compania))) {
      return null
    }

    return data as unknown as Motor | null
  },

  async getDisponibles(): Promise<Motor[]> {
    const compania = getCompaniaActual() || await getCompaniaActualOrFromPerfil()
    const { perfilesService } = await import('./perfiles')
    const esSuperAdmin = await perfilesService.isSuperAdmin()
    if (!compania && !esSuperAdmin) return []
    const estadosDisponibles = ['Nuevo', 'Reacondicionado', 'Usado', 'Disponible']
    let query = supabase
      .from('motores')
      .select('*')
      .in('estado', estadosDisponibles)
      .gt('cantidad', 0)
    if (compania) {
      query = query.eq('empresa_id', compania)
    }
    query = withAppIdFilter(query, 'motores')
    const { data, error } = await query.order('created_at', { ascending: false }) as { data: Motor[] | null; error: unknown }
    if (error) throw error
    let rows = data || []
    if (compania) {
      rows = rows.filter((m: { empresa_id?: string; compania_id?: string }) => m.empresa_id === compania || m.compania_id === compania)
    }
    return rows as Motor[]
  },

  async getSiguienteNumeroPrestamo(): Promise<string> {
    try {
      const randomDigits = (length: number) => {
        const bytes = new Uint8Array(length)
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
          crypto.getRandomValues(bytes)
          return Array.from(bytes, (b) => (b % 10).toString()).join('')
        }
        return Array.from({ length }, () => Math.floor(Math.random() * 10).toString()).join('')
      }

      const generarNumero = () => `PREST-${randomDigits(10)}`

      let intentos = 0
      const maxIntentos = 80

      while (intentos < maxIntentos) {
        const numeroGenerado = generarNumero()
        let existsQuery = supabase
          .from('motores')
          .select('id')
          .eq('numero_chasis', numeroGenerado)
          .limit(1)
        existsQuery = withAppIdFilter(existsQuery, 'motores')
        const { data: existeData, error: existeError } = await existsQuery

        if (existeError && !existeError.message?.includes('column')) {
          console.warn('Error verificando número, usando timestamp:', existeError)
          return `PREST-${Date.now().toString().slice(-8)}`
        }

        if (!existeData || existeData.length === 0) {
          return numeroGenerado
        }

        intentos++
      }

      const timestamp = Date.now()
      const numeroUnico = `PREST-${timestamp.toString().slice(-8)}`
      console.warn('No se encontró número único después de muchos intentos, usando timestamp:', numeroUnico)
      return numeroUnico
    } catch (error: any) {
      console.error('Error generando número de préstamo:', error)
      // En caso de cualquier error, usar timestamp único
      const timestamp = Date.now()
      return `PREST-${timestamp.toString().slice(-8)}`
    }
  },

  async create(motor: Omit<Motor, 'id' | 'created_at' | 'updated_at'>): Promise<Motor> {
    const compania = getCompaniaActual()
    const motorData: any = withAppIdData({
      ...motor,
      estado: motor.estado || 'Nuevo',
      cantidad: motor.cantidad ?? 1,
    }, 'motores')
    
    if (compania) {
      motorData.empresa_id = compania
    }
    // Esquema UUID: motores no usa app_id; eliminar por si se añadió
    delete (motorData as any).app_id
    
    const { data, error } = await (supabase as any)
      .from('motores')
      .insert(motorData)
      .select()
      .single()
    
    if (error && error.message?.includes('column')) {
      delete (motorData as any).compania_id
      delete (motorData as any).app_id
      const { data: retryData, error: retryError } = await (supabase as any)
        .from('motores')
        .insert(motorData)
        .select()
        .single()
      if (!retryError) return retryData as Motor
      // Retry falló, intentar otros fixes
      if (error.message?.includes('cantidad')) {
        console.warn('Columna cantidad no encontrada, intentando sin cantidad (usará default)')
        delete motorData.cantidad
        const { data: retryData, error: retryError } = await (supabase as any)
          .from('motores')
          .insert(motorData)
          .select()
          .single()
        if (retryError) {
          console.error('Error al insertar motor:', retryError)
          throw new Error(`Error al guardar el motor: ${retryError.message}. Por favor, verifica que la columna 'cantidad' existe en la tabla 'motores'.`)
        }
        return retryData as Motor
      }
      if (error.message?.includes('numero_chasis_real')) {
        console.warn('Columna numero_chasis_real no encontrada. Por favor ejecuta el script SQL: supabase/agregar-campo-numero-chasis-real.sql')
        delete motorData.numero_chasis_real
        const { data: retryData, error: retryError } = await (supabase as any)
          .from('motores')
          .insert(motorData)
          .select()
          .single()
        
        if (retryError) {
          console.error('Error al insertar motor:', retryError)
          throw new Error(`Error al guardar el motor: ${retryError.message}. Por favor, ejecuta el script SQL para agregar la columna numero_chasis_real: supabase/agregar-campo-numero-chasis-real.sql`)
        }
        // Mostrar advertencia pero continuar
        console.warn('⚠️ El número de chasis no se guardó porque la columna numero_chasis_real no existe. Ejecuta el script SQL para habilitar esta funcionalidad.')
        return retryData as Motor
      }

      // Si el error es sobre columnas opcionales, intentar sin ellas (compatibilidad hacia atrás)
      const camposOpcionales = [
        'categoria',
        'tipo_articulo',
        'capacidad',
        'dimension_altura',
        'dimension_ancho',
        'dimension_profundidad',
        'eficiencia_energetica',
      ]
      const campoInvalido = camposOpcionales.find((campo) => error.message?.includes(campo))
      if (campoInvalido) {
        console.warn(`Columna ${campoInvalido} no encontrada. Continúo sin guardar ese dato.`)
        camposOpcionales.forEach((campo) => {
          delete motorData[campo]
        })
        const { data: retryData, error: retryError } = await (supabase as any)
          .from('motores')
          .insert(motorData)
          .select()
          .single()
        
        if (retryError) throw retryError
        return retryData as Motor
      }
    }

    if (error) {
      console.error('Error al insertar motor:', error)
      throw error
    }
    return data as Motor
  },

  async update(id: string, motor: Partial<Motor>): Promise<Motor> {
    const updateData = {
      ...motor,
      updated_at: new Date().toISOString(),
    }

    let updateQuery = (supabase as any)
      .from('motores')
      .update(withAppIdData(updateData))
      .eq('id', id)
    updateQuery = withAppIdFilter(updateQuery)
    const { data, error } = await updateQuery.select().single()
    
    if (error) {
      const camposOpcionales = [
        'categoria',
        'tipo_articulo',
        'capacidad',
        'dimension_altura',
        'dimension_ancho',
        'dimension_profundidad',
        'eficiencia_energetica',
      ]
      const campoInvalido = camposOpcionales.find((campo) => error.message?.includes(campo))
      if (campoInvalido) {
        console.warn(`Columna ${campoInvalido} no encontrada. Reintentando sin campos opcionales.`)
        camposOpcionales.forEach((campo) => {
          delete (updateData as any)[campo]
        })
        let fallbackQuery = (supabase as any)
          .from('motores')
          .update(withAppIdData(updateData))
          .eq('id', id)
        fallbackQuery = withAppIdFilter(fallbackQuery, 'motores')
        const { data: retryData, error: retryError } = await fallbackQuery.select().single()
        
        if (retryError) throw retryError
        return retryData as Motor
      }
    }
    
    if (error) throw error
    return data as Motor
  },

  async delete(id: string): Promise<void> {
    // Primero verificar si hay ventas asociadas
    const { data: ventas, error: ventasError } = await supabase
      .from('ventas')
      .select('id')
      .eq('motor_id', id)
      .limit(1) as { data: { id: string }[] | null; error: { message?: string } | null }
    
    if (ventasError && !ventasError.message?.includes('column')) {
      throw ventasError
    }
    
    // Si hay ventas asociadas, no permitir eliminar
    if (ventas && ventas.length > 0) {
      throw new Error('No se puede eliminar este préstamo porque tiene préstamos emitidos asociados. Primero debe eliminar o cancelar los préstamos emitidos.')
    }
    
    // Si no hay ventas, proceder con la eliminación
    const { error } = await (supabase as any)
      .from('motores')
      .delete()
      .eq('id', id)
    
    if (error) {
      // Si el error es por restricción de clave foránea, dar un mensaje más claro
      if (error.message?.includes('foreign key') || error.message?.includes('violates foreign key')) {
        throw new Error('No se puede eliminar este préstamo porque tiene préstamos emitidos asociados. Primero debe eliminar o cancelar los préstamos emitidos.')
      }
      throw error
    }
  },
}



