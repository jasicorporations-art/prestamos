import { supabase } from '../supabase'
import type { Perfil, Sucursal } from '@/types'
import { getCompaniaActual, getCompaniaActualOrFromPerfil } from '../utils/compania'
import { getAppId, withAppIdData, withAppIdFilter } from '../utils/appId'
import { orEmpresaCompania } from '../utils/postgrest'

function isColumnRelatedError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? '')
  return /column|empresa_id|compania_id|invalid.*uuid|syntax.*uuid/i.test(msg)
}

// Cache de perfil por sesión para evitar fetches repetidos post-login
let perfilCache: { userId: string; perfil: Perfil } | null = null

export function invalidatePerfilCache() {
  perfilCache = null
}

export const perfilesService = {
  /**
   * Indica si el usuario actual es super_admin (puede ver todo sin filtro de compañía)
   */
  async isSuperAdmin(): Promise<boolean> {
    const p = await this.getPerfilActual()
    return (p?.rol?.toLowerCase?.() ?? '') === 'super_admin'
  },

  /**
   * Obtiene el perfil del usuario actual.
   * Usa cache en memoria para evitar fetches repetidos tras login.
   */
  async getPerfilActual(): Promise<Perfil | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        perfilCache = null
        return null
      }

      if (perfilCache?.userId === user.id) {
        return perfilCache.perfil
      }

      // IMPORTANTE: No incluir sucursal:sucursales(*) aquí. El join dispara RLS de sucursales,
      // que usa (SELECT FROM perfiles) → recursión infinita en políticas de perfiles.
      let perfilQuery = supabase
        .from('perfiles')
        .select('*')
        .eq('user_id', user.id)
      perfilQuery = withAppIdFilter(perfilQuery, 'perfiles')
      const { data, error } = await perfilQuery.single() as { data: { rol?: string; app_id?: string | null; id?: string; empresa_id?: string; activo?: boolean; [key: string]: unknown } | null; error: { code?: string; message?: string } | null }

      if (error) {
        console.error('❌ Error obteniendo perfil:', error)
        // Si no existe el perfil (PGRST116 = no rows returned)
        if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('not found')) {
          const appId = getAppId()
          if (appId) {
            // Intentar recuperar un perfil sin app_id para asignarlo automáticamente
            const { data: perfilSinAppId, error: errorSinAppId } = await supabase
              .from('perfiles')
              .select('*')
              .eq('user_id', user.id)
              .single() as { data: { rol?: string; app_id?: string | null; [key: string]: unknown } | null; error: unknown }

            if (!errorSinAppId && perfilSinAppId) {
              // super_admin siempre tiene acceso; perfiles sin app_id o con app_id coincidente también
              const autorizado = perfilSinAppId.rol === 'super_admin' || perfilSinAppId.app_id == null || perfilSinAppId.app_id === appId
              if (!autorizado) {
                console.warn('⚠️ El perfil no está autorizado para esta plataforma.')
                return null
              }
              perfilCache = { userId: user.id, perfil: perfilSinAppId as unknown as Perfil }
              return perfilSinAppId as unknown as Perfil
            }
          }

          // Si no existe perfil, intentar crearlo automáticamente para el creador
          try {
            const appId = getAppId()
            const metadata = user.user_metadata || {}
            const empresaNombre = typeof metadata.compania === 'string' ? metadata.compania.trim() : ''
            if (!empresaNombre) {
              console.warn('⚠️ No se puede crear perfil automático sin empresa en metadata.')
              return null
            }

            let empresaId = empresaNombre
            try {
              const { data: empresaData, error: empresaError } = await supabase
                .from('empresas')
                .select('id')
                .eq('nombre', empresaNombre)
                .single() as { data: { id?: string } | null; error: unknown }
              if (!empresaError && empresaData?.id) {
                empresaId = empresaData.id
              }
            } catch (empresaLookupError) {
              console.warn('No se pudo obtener empresa_id, usando nombre como fallback:', empresaLookupError)
            }

            let perfilesEmpresaQuery = supabase
              .from('perfiles')
              .select('id')
              .eq('empresa_id', empresaId)
            if (appId) {
              perfilesEmpresaQuery = withAppIdFilter(perfilesEmpresaQuery, 'perfiles')
            }
            const { data: perfilesEmpresa } = await perfilesEmpresaQuery
            const esPrimerUsuario = !perfilesEmpresa || perfilesEmpresa.length === 0

            const nombreCompleto = `${metadata.nombre || ''} ${metadata.apellido || ''}`.trim() || user.email || 'Usuario'
            const nuevoPerfil = {
              user_id: user.id,
              nombre_completo: nombreCompleto,
              rol: esPrimerUsuario ? 'Admin' : 'Vendedor',
              empresa_id: empresaId,
              activo: true,
            }

            const { data: perfilCreado, error: crearError } = await (supabase as any)
              .from('perfiles')
              .insert(withAppIdData(nuevoPerfil, 'perfiles'))
              .select('*')
              .single()

            if (!crearError && perfilCreado) {
              perfilCache = { userId: user.id, perfil: perfilCreado as Perfil }
              return perfilCreado
            }

            if (crearError) {
              console.warn('⚠️ No se pudo crear perfil automático:', crearError)
            }
          } catch (autoPerfilError) {
            console.warn('⚠️ Error creando perfil automático:', autoPerfilError)
          }

          console.warn('⚠️ No se encontró perfil para el usuario. El usuario necesita un perfil creado.')
          return null
        }
        // Error 406 (Not Acceptable) - posible problema con RLS o formato
        if (error.code === '406' || error.message?.includes('406')) {
          console.error('❌ Error 406: Problema con permisos RLS o formato de consulta')
          console.error('Detalles:', JSON.stringify(error, null, 2))
          return null
        }
        // Otros errores
        throw error
      }

      if (data) {
        perfilCache = { userId: user.id, perfil: data as unknown as Perfil }
        const appId = getAppId()
        // super_admin y perfiles con app_id null tienen acceso a todas las plataformas
        if (appId && data.rol !== 'super_admin' && 'app_id' in data && data.app_id != null) {
          if (data.app_id !== appId) {
            perfilCache = null
            console.warn('⚠️ El perfil pertenece a otra plataforma. Acceso denegado.')
            return null
          }
        }
        console.log('✅ Perfil encontrado:', {
          id: data.id,
          rol: data.rol,
          empresa_id: data.empresa_id,
          activo: data.activo
        })
      }

      return data as unknown as Perfil | null
    } catch (error: any) {
      console.error('❌ Error crítico obteniendo perfil actual:', error)
      console.error('Código:', error?.code)
      console.error('Mensaje:', error?.message)
      return null
    }
  },

  /**
   * Obtiene el ID de la sucursal del usuario actual
   */
  async getSucursalActual(): Promise<string | null> {
    const perfil = await this.getPerfilActual()
    return perfil?.sucursal_id || null
  },

  /**
   * Obtiene el ID de la ruta asignada al usuario actual (para Mi Ruta de Hoy)
   */
  async getRutaActual(): Promise<string | null> {
    const perfil = await this.getPerfilActual()
    return perfil?.ruta_id || null
  },

  /**
   * Obtiene el rol del usuario actual
   */
  async getRolActual(): Promise<'Admin' | 'Vendedor' | 'super_admin' | null> {
    const perfil = await this.getPerfilActual()
    return perfil?.rol || null
  },

  /**
   * Verifica si el usuario actual es Admin o Super Admin (acceso completo a funciones de admin).
   */
  async esAdmin(): Promise<boolean> {
    try {
      const rol = await this.getRolActual()
      console.log('🔍 Rol actual del usuario:', rol)
      const tieneAccesoAdmin = rol === 'Admin' || rol === 'super_admin'
      console.log('🔍 ¿Tiene acceso admin?:', tieneAccesoAdmin)
      return tieneAccesoAdmin
    } catch (error) {
      console.error('Error verificando si es Admin:', error)
      // Si no se puede verificar, retornar false
      return false
    }
  },

  /**
   * Obtiene el nombre completo del usuario actual
   */
  async getNombreCompleto(): Promise<string> {
    const perfil = await this.getPerfilActual()
    if (perfil?.nombre_completo) {
      return perfil.nombre_completo
    }

    // Intentar obtener el nombre desde auth.users metadata
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.nombre || user?.user_metadata?.apellido) {
        return `${user.user_metadata.nombre || ''} ${user.user_metadata.apellido || ''}`.trim()
      }
      return user?.email || 'Usuario'
    } catch {
      return 'Usuario'
    }
  },

  /**
   * Obtiene el nombre de la sucursal del usuario actual
   */
  async getNombreSucursal(): Promise<string | null> {
    const perfil = await this.getPerfilActual()
    if (!perfil?.sucursal_id) return null
    if (perfil?.sucursal) {
      return (perfil.sucursal as Sucursal).nombre
    }
    const { data: suc } = await supabase.from('sucursales').select('nombre').eq('id', perfil.sucursal_id).single() as { data: { nombre?: string } | null }
    return suc?.nombre ?? null
  },

  /**
   * Obtiene todas las sucursales de la empresa actual
   */
  async getSucursales(): Promise<Sucursal[]> {
    const empresa = getCompaniaActual() || await getCompaniaActualOrFromPerfil()
    if (!empresa) {
      return []
    }

    let sucursalesQuery = supabase
      .from('sucursales')
      .select('*')
      .eq('activa', true)
      .order('nombre', { ascending: true })

    sucursalesQuery = sucursalesQuery.or(orEmpresaCompania(String(empresa)))
    sucursalesQuery = withAppIdFilter(sucursalesQuery, 'sucursales')
    let { data, error } = await sucursalesQuery

    if (error && isColumnRelatedError(error)) {
      sucursalesQuery = supabase
        .from('sucursales')
        .select('*')
        .eq('activa', true)
        .eq('empresa_id', String(empresa))
        .order('nombre', { ascending: true })
      sucursalesQuery = withAppIdFilter(sucursalesQuery, 'sucursales')
      const fallback = await sucursalesQuery
      data = fallback.data
      error = fallback.error
    }

    if (error) {
      console.warn('⚠️ [perfilesService.getSucursales] No se pudieron cargar sucursales:', error)
      return []
    }
    return data || []
  },

  /**
   * Verifica si el usuario ha completado el tour guiado
   */
  async haCompletadoTour(): Promise<boolean> {
    try {
      const perfil = await this.getPerfilActual()
      return perfil?.tour_completado || false
    } catch (error) {
      console.error('Error verificando tour completado:', error)
      return false
    }
  },

  /**
   * Marca el tour como completado para el usuario actual
   */
  async marcarTourCompletado(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No hay usuario autenticado')
      }

      let updateQuery = (supabase as any)
        .from('perfiles')
        .update({ tour_completado: true })
        .eq('user_id', user.id)
      updateQuery = withAppIdFilter(updateQuery, 'perfiles')
      const { error } = await updateQuery

      if (error) {
        console.error('Error marcando tour como completado:', error)
        throw error
      }
    } catch (error) {
      console.error('Error crítico marcando tour como completado:', error)
      throw error
    }
  },

  /**
   * Verifica si el usuario tiene WhatsApp Premium activo.
   * Si no lo tiene en su perfil, comprueba si algún usuario de la misma empresa lo tiene activo
   * (herencia por empresa: todos pueden enviar recibos si uno tiene el módulo activo).
   */
  async tieneWhatsAppPremium(): Promise<boolean> {
    try {
      const perfil = await this.getPerfilActual()
      if (!perfil) return false

      const hoy = new Date().toISOString().split('T')[0]

      if (perfil.has_whatsapp_premium && (!perfil.premium_until || perfil.premium_until >= hoy)) {
        return true
      }

      const empresaId = perfil.empresa_id || (perfil as { compania_id?: string }).compania_id || await getCompaniaActualOrFromPerfil()
      if (!empresaId) return false

      // Herencia por compañía: cualquier perfil de la misma empresa (empresa_id o compania_id) con premium activo
      const { data: algunoConPremium } = await (supabase as any)
        .from('perfiles')
        .select('id')
        .or(`empresa_id.eq.${empresaId},compania_id.eq.${empresaId}`)
        .eq('has_whatsapp_premium', true)
        .or(`premium_until.is.null,premium_until.gte.${hoy}`)
        .limit(1)
        .maybeSingle()

      if (algunoConPremium) return true

      return false
    } catch (error) {
      console.error('Error verificando WhatsApp Premium:', error)
      return false
    }
  },

  /**
   * Reinicia el tour (marca como no completado) para el usuario actual
   */
  async reiniciarTour(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No hay usuario autenticado')
      }

      let updateQuery = (supabase as any)
        .from('perfiles')
        .update({ tour_completado: false })
        .eq('user_id', user.id)
      updateQuery = withAppIdFilter(updateQuery, 'perfiles')
      const { error } = await updateQuery

      if (error) {
        console.error('Error reiniciando tour:', error)
        throw error
      }
    } catch (error) {
      console.error('Error crítico reiniciando tour:', error)
      throw error
    }
  },
}

