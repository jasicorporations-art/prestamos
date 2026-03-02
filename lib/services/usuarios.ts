import { supabase } from '../supabase'
import type { Perfil, Ruta, Sucursal } from '@/types'
import { getCompaniaActual, getCompaniaActualOrFromPerfil } from '../utils/compania'
import { subscriptionService } from './subscription'
import { perfilesService } from './perfiles'
import { LEGAL_VERSIONS } from '@/lib/config/legal'
import type { PlanType } from '@/lib/config/planes'
import { getAppId, withAppIdData, withAppIdFilter } from '../utils/appId'

export interface UsuarioConPerfil {
  id: string
  email: string
  user_id: string
  nombre_completo?: string
  rol: 'Admin' | 'Vendedor'
  sucursal_id?: string
  sucursal?: Sucursal
  ruta_id?: string
  ruta?: Ruta
  activo: boolean
  created_at?: string
  updated_at?: string
}

export const usuariosService = {
  /**
   * Obtiene todos los usuarios de la empresa actual con sus perfiles
   */
  async getAll(): Promise<UsuarioConPerfil[]> {
    const empresa = getCompaniaActual() || (await getCompaniaActualOrFromPerfil())
    if (!empresa) {
      return []
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('compania_actual', empresa)
    }

    try {
      // 1) Perfiles de la empresa actual (sin join sucursales: evita recursión RLS)
      let perfilesQuery = supabase
        .from('perfiles')
        .select('*, ruta:rutas!ruta_id(*)')
        .eq('empresa_id', empresa)
        .order('created_at', { ascending: false })
      perfilesQuery = withAppIdFilter(perfilesQuery, 'perfiles')
      let { data: perfilesEmpresa, error: perfilesError } = await perfilesQuery

      if (perfilesError) {
        const msg = String((perfilesError as { message?: string }).message || '')
        if (msg.includes('column') || msg.includes('relation') || msg.includes('rutas')) {
          const q = withAppIdFilter(
            supabase.from('perfiles').select('*').eq('empresa_id', empresa).order('created_at', { ascending: false }),
            'perfiles'
          )
          const fallback = await q
          perfilesEmpresa = fallback.data
          perfilesError = fallback.error
        }
        if (perfilesError) throw perfilesError
      }

      // 2) Incluir Admin y super_admin con empresa_id NULL o SISTEMA (para asignar sucursales)
      let perfilesAdminQuery = supabase
        .from('perfiles')
        .select('*, ruta:rutas!ruta_id(*)')
        .in('rol', ['Admin', 'super_admin'])
        .or('empresa_id.is.null,empresa_id.eq.SISTEMA')
        .order('created_at', { ascending: false })
      perfilesAdminQuery = withAppIdFilter(perfilesAdminQuery, 'perfiles')
      let { data: perfilesAdmin, error: adminError } = await perfilesAdminQuery

      if (adminError) {
        const adminMsg = String((adminError as { message?: string }).message || '')
        if (adminMsg.includes('column') || adminMsg.includes('relation') || adminMsg.includes('rutas') || adminMsg.includes('ruta_id')) {
          const qAdmin = withAppIdFilter(
            supabase.from('perfiles').select('*').in('rol', ['Admin', 'super_admin']).or('empresa_id.is.null,empresa_id.eq.SISTEMA').order('created_at', { ascending: false }),
            'perfiles'
          )
          const resAdmin = await qAdmin
          perfilesAdmin = resAdmin.data
          adminError = resAdmin.error
        }
        if (adminError) {
          console.warn('⚠️ [usuariosService.getAll] No se pudieron cargar admins globales:', adminError)
        }
      }

      // Fusionar y deduplicar por id (priorizar perfiles de la empresa)
      const idsEmpresa = new Set((perfilesEmpresa || []).map((p: any) => p.id))
      const perfilesAdminFiltrados = (perfilesAdmin || []).filter((p: any) => !idsEmpresa.has(p.id))
      const perfiles = [...(perfilesEmpresa || []), ...perfilesAdminFiltrados]

      // Cargar sucursales por separado (evita recursión RLS al no hacer join perfiles+sucursales)
      const sucursalIds = [...new Set(perfiles.map((p: any) => p.sucursal_id).filter((id): id is string => Boolean(id)))]
      const sucursalesMap = new Map<string, Sucursal>()
      if (sucursalIds.length > 0) {
        const { data: sucursales } = await supabase.from('sucursales').select('*').in('id', sucursalIds)
        ;(sucursales || []).forEach((s: Sucursal) => sucursalesMap.set(s.id, s))
      }

      // Obtener información de auth.users para cada perfil
      // Nota: Como no tenemos acceso admin desde el cliente, usamos la información del perfil
      // El email se puede obtener desde la tabla perfiles si se guarda, o desde user_metadata
      const usuariosConPerfiles: UsuarioConPerfil[] = []

      // Obtener el usuario actual para comparar
      let usuarioActualId: string | null = null
      try {
        const { data: { user } } = await supabase.auth.getUser()
        usuarioActualId = user?.id || null
      } catch {
        // Ignorar error
      }

      for (const perfil of perfiles) {
        let email = `usuario-${perfil.user_id.slice(0, 8)}`
        
        // Si es el usuario actual, intentar obtener su email
        if (usuarioActualId === perfil.user_id) {
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.email) {
              email = user.email
            }
          } catch {
            // Usar email por defecto
          }
        }

        usuariosConPerfiles.push({
          id: perfil.id,
          email: email,
          user_id: perfil.user_id,
          nombre_completo: perfil.nombre_completo || email.split('@')[0] || 'Usuario',
          rol: perfil.rol,
          sucursal_id: perfil.sucursal_id || undefined,
          sucursal: (perfil.sucursal_id ? sucursalesMap.get(perfil.sucursal_id) : undefined) as Sucursal | undefined,
          ruta_id: perfil.ruta_id || undefined,
          ruta: perfil.ruta as Ruta | undefined,
          activo: perfil.activo,
          created_at: perfil.created_at,
          updated_at: perfil.updated_at,
        })
      }

      return usuariosConPerfiles
    } catch (error) {
      console.error('Error obteniendo usuarios:', error)
      throw error
    }
  },

  /**
   * Actualiza el perfil de un usuario
   */
  async updatePerfil(
    perfilId: string,
    updates: {
      nombre_completo?: string | undefined
      rol?: 'Admin' | 'Vendedor'
      sucursal_id?: string | null | undefined
      ruta_id?: string | null | undefined
      activo?: boolean
      empresa_id?: string | null | undefined
    }
  ): Promise<void> {
    const updateData: any = {}
    // La tabla perfiles puede no tener columna updated_at; no enviarla para evitar error de schema cache

    // Solo agregar campos que están definidos
    if (updates.nombre_completo !== undefined) {
      updateData.nombre_completo = updates.nombre_completo || null
    }
    if (updates.rol !== undefined) {
      updateData.rol = updates.rol
    }
    if (updates.sucursal_id !== undefined) {
      updateData.sucursal_id = updates.sucursal_id || null
    }
    if (updates.empresa_id !== undefined) {
      updateData.empresa_id = updates.empresa_id || null
    }
    if (updates.ruta_id !== undefined) {
      (updateData as Record<string, unknown>).ruta_id = updates.ruta_id || null
    }
    if (updates.activo !== undefined) {
      updateData.activo = updates.activo
    }

    const tryUpdate = async (payload: Record<string, unknown>) => {
      let q = (supabase as any).from('perfiles').update(withAppIdData(payload, 'perfiles')).eq('id', perfilId)
      q = withAppIdFilter(q, 'perfiles')
      return await q
    }

    let { error } = await tryUpdate(updateData as Record<string, unknown>)
    if (error) {
      const msg = String(error.message || '')
      const isColumnError = msg.includes('ruta_id') || msg.includes('sucursal_id') || msg.includes('updated_at') || msg.includes('empresa_id') || msg.includes('schema cache') || msg.includes('Could not find') || (error as any).code === '42703' || (error as any).status === 400
      if (isColumnError) {
        const { ruta_id: _r, updated_at: _u, ...sinRuta } = updateData as Record<string, unknown>
        const { error: err2 } = await tryUpdate(sinRuta)
        if (err2) {
          const { sucursal_id: _s, ...sinSucursal } = sinRuta
          const { error: err3 } = await tryUpdate(sinSucursal)
        if (err3) {
          const { empresa_id: _e, ...sinEmpresa } = sinSucursal
          const { error: err4 } = await tryUpdate(sinEmpresa)
          if (err4) {
            const minimal = {
              ...(updates.nombre_completo !== undefined && { nombre_completo: updates.nombre_completo || null }),
              ...(updates.rol !== undefined && { rol: updates.rol }),
              ...(updates.activo !== undefined && { activo: updates.activo }),
            }
            if (Object.keys(minimal).length > 0) {
              const { error: err5 } = await tryUpdate(minimal)
              if (err5) throw err5
            } else {
              throw err4
            }
          }
        }
        return
      }
      }
      throw error
    }
  },

  /**
   * Crea o actualiza un perfil para un usuario (upsert por user_id).
   * Si ya existe un perfil para ese user_id, se actualiza con los datos indicados.
   */
  async crearPerfil(
    user_id: string,
    data: {
      nombre_completo?: string
      rol: 'Admin' | 'Vendedor'
      sucursal_id?: string | null
      ruta_id?: string | null
    }
  ): Promise<Perfil> {
    const empresa = getCompaniaActual() || (await getCompaniaActualOrFromPerfil())
    if (!empresa) {
      throw new Error('No hay empresa seleccionada')
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('compania_actual', empresa)
    }

    const perfilData = {
      user_id,
      nombre_completo: data.nombre_completo || null,
      rol: data.rol,
      sucursal_id: data.sucursal_id || null,
      ruta_id: data.ruta_id ?? null,
      empresa_id: empresa,
      activo: true,
    }

    let result = await (supabase as any)
      .from('perfiles')
      .upsert(withAppIdData(perfilData, 'perfiles'), { onConflict: 'user_id' })
      .select(`*, sucursal:sucursales(*)`)
      .single()

    if (result.error) {
      const msg = String(result.error.message || '')
      const isColumnError = msg.includes('ruta_id') || msg.includes('sucursal_id') || msg.includes('schema cache') || (result.error as any).code === '42703'
      if (isColumnError) {
        const { ruta_id: _r, ...sinRuta } = perfilData
        result = await (supabase as any)
          .from('perfiles')
          .upsert(withAppIdData(sinRuta, 'perfiles'), { onConflict: 'user_id' })
          .select('*')
          .single()
        if (result.error) {
          const { sucursal_id: _s, ...sinSucursal } = sinRuta
          result = await (supabase as any)
            .from('perfiles')
            .upsert(withAppIdData(sinSucursal, 'perfiles'), { onConflict: 'user_id' })
            .select('*')
            .single()
        }
      }
    }
    if (result.error) throw result.error
    return result.data
  },

  /**
   * Crea un nuevo usuario para la empresa actual (solo Admin)
   * Crea tanto el usuario en auth.users como el perfil en perfiles
   * El nuevo usuario hereda el plan del admin que lo crea
   */
  async crearUsuario(
    data: {
      email: string
      password: string
      nombre_completo?: string
      rol: 'Admin' | 'Vendedor'
      sucursal_id?: string | null
      ruta_id?: string | null
    }
  ): Promise<{ user: any; perfil: Perfil }> {
    const empresa = getCompaniaActual() || (await getCompaniaActualOrFromPerfil())
    if (!empresa) {
      throw new Error('No hay empresa seleccionada')
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('compania_actual', empresa)
    }

    // 1. Obtener el plan del admin actual para heredarlo al nuevo usuario
    let planAdmin: PlanType = 'TRIAL' // Plan por defecto
    try {
      const planActual = await subscriptionService.getCurrentPlan()
      if (planActual) {
        planAdmin = planActual
        console.log(`✅ [usuariosService.crearUsuario] Plan del admin: ${planAdmin} - Se asignará al nuevo usuario`)
      } else {
        console.warn('⚠️ [usuariosService.crearUsuario] No se pudo obtener el plan del admin, usando TRIAL por defecto')
      }
    } catch (error) {
      console.error('❌ [usuariosService.crearUsuario] Error obteniendo plan del admin:', error)
      // Continuar con plan por defecto
    }

    // 2. Crear usuario en Supabase Auth
    // Nota: Desde el cliente no podemos usar admin API directamente
    // Usaremos signUp normal y luego actualizaremos el perfil
    // Para producción, esto debería hacerse desde un endpoint de servidor
    
    // Preparar metadata con el plan heredado del admin
    const appId = getAppId()
    const userMetadata: any = {
      nombre: data.nombre_completo?.split(' ')[0] || '',
      apellido: data.nombre_completo?.split(' ').slice(1).join(' ') || '',
      compania: empresa,
      planType: planAdmin,
      isActive: true,
      app_id: appId,
      app_allowed: appId ? appId.toUpperCase() : undefined,
      rol: data.rol, // Pasar rol para que el trigger lo use (evita que quede Admin por defecto)
    }

    // Si el plan es INFINITO, agregar metadata adicional
    if (planAdmin === 'INFINITO') {
      userMetadata.isLifetime = true
      // Establecer fecha de expiración muy lejana (100 años)
      const expirationDate = new Date()
      expirationDate.setFullYear(expirationDate.getFullYear() + 100)
      userMetadata.expires_at = expirationDate.toISOString()
    }

    // Si el plan es TRIAL, agregar fechas de trial
    if (planAdmin === 'TRIAL') {
      const trialStartDate = new Date()
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 7) // 7 días de trial
      userMetadata.trialActive = true
      userMetadata.trialStartDate = trialStartDate.toISOString().split('T')[0]
      userMetadata.trialEndDate = trialEndDate.toISOString().split('T')[0]
    }

    // Intentar crear usuario con signUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: userMetadata,
      },
    })

    if (authError) throw authError
    if (!authData.user) {
      throw new Error('No se pudo crear el usuario')
    }

    console.log(`✅ [usuariosService.crearUsuario] Usuario creado con plan: ${planAdmin}`)

    // 2. Crear o actualizar perfil en la tabla perfiles (upsert por user_id)
    // Si ya existe un perfil para este user_id (p. ej. por trigger de Auth), lo actualizamos con los datos completos
    const acceptedAt = new Date().toISOString()
    const perfilBase = {
      user_id: authData.user.id,
      nombre_completo: data.nombre_completo || null,
      rol: data.rol,
      sucursal_id: data.sucursal_id || null,
      ruta_id: data.ruta_id || null,
      empresa_id: empresa,
      activo: true,
    }

    // Heredar WhatsApp Premium si el admin o algún usuario de la empresa lo tiene activo
    const whatsappPremiumHeredado: { has_whatsapp_premium?: boolean; premium_until?: string } = {}
    try {
      const hoy = new Date().toISOString().split('T')[0]
      let premiumUntil: string | null = null

      const perfilAdmin = await perfilesService.getPerfilActual()
      if (perfilAdmin?.has_whatsapp_premium && perfilAdmin.premium_until && perfilAdmin.premium_until >= hoy) {
        premiumUntil = perfilAdmin.premium_until
      }

      // Herencia por compañía: buscar en cualquier perfil de la empresa (empresa_id o compania_id)
      if (!premiumUntil && empresa) {
        const { data: perfilesConWhatsApp } = await (supabase as any)
          .from('perfiles')
          .select('premium_until')
          .or(`empresa_id.eq.${empresa},compania_id.eq.${empresa}`)
          .eq('has_whatsapp_premium', true)
          .not('premium_until', 'is', null)
          .gte('premium_until', hoy)
          .order('premium_until', { ascending: false })
          .limit(1)
        const mejor = Array.isArray(perfilesConWhatsApp) && perfilesConWhatsApp[0] ? perfilesConWhatsApp[0] : null
        if (mejor?.premium_until) premiumUntil = mejor.premium_until
      }

      if (premiumUntil) {
        whatsappPremiumHeredado.has_whatsapp_premium = true
        whatsappPremiumHeredado.premium_until = premiumUntil
        console.log(`✅ [usuariosService.crearUsuario] Heredando WhatsApp Premium hasta ${premiumUntil}`)
      }
    } catch (err) {
      console.warn('⚠️ [usuariosService.crearUsuario] No se pudo verificar WhatsApp Premium:', err)
    }

    const perfilConLegal = {
      ...perfilBase,
      ...whatsappPremiumHeredado,
      terminos_aceptados: true,
      terminos_version: LEGAL_VERSIONS.terminos,
      fecha_aceptacion: acceptedAt,
      ip_registro: null,
      privacidad_aceptada: true,
      privacidad_version: LEGAL_VERSIONS.privacidad,
      privacidad_fecha_aceptacion: acceptedAt,
      privacidad_ip: null,
    }

    let perfil: Perfil | null = null
    let perfilError: any = null
    ;({ data: perfil, error: perfilError } = await (supabase as any)
      .from('perfiles')
      .upsert(withAppIdData(perfilConLegal, 'perfiles'), { onConflict: 'user_id' })
      .select(
        `
        *,
        sucursal:sucursales(*)
      `
      )
      .single())

    if (perfilError) {
      const errorMessage = String(perfilError.message || '')
      const errorCode = (perfilError as any).code || ''
      const isColumnError = errorCode === '42703' || errorMessage.includes('does not exist') || errorMessage.includes('schema cache') || errorMessage.includes("Could not find the 'ruta_id'") || errorMessage.includes("Could not find the 'sucursal_id'")
      if (isColumnError) {
        const { ruta_id: _r, ...perfilSinRuta } = perfilBase
        const fallbackConSucursal = {
          ...perfilSinRuta,
          ...whatsappPremiumHeredado,
          terminos_aceptados: true,
          terminos_version: LEGAL_VERSIONS.terminos,
          fecha_aceptacion: acceptedAt,
          ip_registro: null,
          privacidad_aceptada: true,
          privacidad_version: LEGAL_VERSIONS.privacidad,
          privacidad_fecha_aceptacion: acceptedAt,
          privacidad_ip: null,
        }
        ;({ data: perfil, error: perfilError } = await (supabase as any)
          .from('perfiles')
          .upsert(withAppIdData(fallbackConSucursal, 'perfiles'), { onConflict: 'user_id' })
          .select('*')
          .single())
        if (perfilError) {
          const { sucursal_id: _s, ...perfilSinSucursal } = perfilSinRuta
          const fallbackSinSucursal = {
            ...perfilSinSucursal,
            ...whatsappPremiumHeredado,
            terminos_aceptados: true,
            terminos_version: LEGAL_VERSIONS.terminos,
            fecha_aceptacion: acceptedAt,
            ip_registro: null,
            privacidad_aceptada: true,
            privacidad_version: LEGAL_VERSIONS.privacidad,
            privacidad_fecha_aceptacion: acceptedAt,
            privacidad_ip: null,
          }
          ;({ data: perfil, error: perfilError } = await (supabase as any)
            .from('perfiles')
            .upsert(withAppIdData(fallbackSinSucursal, 'perfiles'), { onConflict: 'user_id' })
            .select('*')
            .single())
        }
      }
    }

    if (perfilError) {
      console.error('Error creando/actualizando perfil:', perfilError)
      throw new Error(`Usuario creado pero no se pudo crear el perfil: ${perfilError.message}`)
    }

    return {
      user: authData.user,
      perfil: perfil!,
    }
  },

  /**
   * Elimina un usuario (solo Admin)
   * Elimina el perfil de la tabla perfiles
   * Nota: No podemos eliminar usuarios de auth.users desde el cliente,
   * pero podemos eliminar el perfil y desactivar el acceso
   */
  async eliminarUsuario(perfilId: string, user_id: string): Promise<void> {
    try {
      // 1. Eliminar el perfil de la tabla perfiles
      let deleteQuery = supabase
        .from('perfiles')
        .delete()
        .eq('id', perfilId)
      deleteQuery = withAppIdFilter(deleteQuery, 'perfiles')
      const { error: perfilError } = await deleteQuery

      if (perfilError) {
        console.error('Error eliminando perfil:', perfilError)
        throw new Error(`Error al eliminar el perfil: ${perfilError.message}`)
      }

      console.log(`✅ [usuariosService.eliminarUsuario] Perfil ${perfilId} eliminado correctamente`)
      
      // Nota: El usuario en auth.users seguirá existiendo, pero sin perfil no podrá acceder
      // Para eliminar completamente el usuario de auth.users, se necesitaría usar Admin API desde un endpoint de servidor
    } catch (error) {
      console.error('Error eliminando usuario:', error)
      throw error
    }
  },
}

