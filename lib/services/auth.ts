import { supabase } from '../supabase'
import { getAppId } from '../utils/appId'
import { ejecutarLimpiezaSesion } from '../utils/swCleanup'

export interface User {
  id: string
  email?: string
  nombre?: string
}

export const authService = {
  validarAccesoApp(user: any) {
    const appId = getAppId()
    if (!appId || !user) return true

    const allowed = user.user_metadata?.app_allowed
    // Si app_allowed no está definido, permitir acceso (usuarios creados manualmente, super_admin, etc.)
    if (!allowed) {
      return true
    }

    const allowedList = Array.isArray(allowed)
      ? allowed.map((v) => String(v).toUpperCase())
      : String(allowed)
          .split(',')
          .map((v) => v.trim().toUpperCase())
          .filter(Boolean)

    if (allowedList.length !== 1 || allowedList[0] !== appId.toUpperCase()) {
      return false
    }

    const userAppId = user.user_metadata?.app_id ?? user.app_metadata?.app_id
    if (userAppId && userAppId !== appId) {
      return false
    }

    return true
  },
  setAppSessionCookie(appId: string | null) {
    if (typeof document === 'undefined') return
    const name = 'jasi_app_id'
    if (!appId) {
      document.cookie = `${name}=; path=/; max-age=0; samesite=lax`
      return
    }
    document.cookie = `${name}=${encodeURIComponent(appId)}; path=/; samesite=lax`
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error

    const appId = getAppId()
    if (appId && !this.validarAccesoApp(data.user)) {
      await supabase.auth.signOut()
      this.setAppSessionCookie(null)
      throw new Error('Acceso no autorizado para esta plataforma')
    }
    if (appId) {
      this.setAppSessionCookie(appId)
    }

    return data
  },

  async signUp(
    email: string, 
    password: string, 
    metadata?: {
      nombre?: string
      apellido?: string
      direccion?: string
      compania?: string
      rnc?: string
      cedula?: string
      telefono?: string
      rol?: 'Admin' | 'Vendedor'
    }
  ) {
    // Calcular fechas del trial (7 días desde hoy)
    const trialStartDate = new Date()
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 7) // 7 días de trial
    
    const appId = getAppId()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          nombre: metadata?.nombre,
          apellido: metadata?.apellido,
          direccion: metadata?.direccion,
          compania: metadata?.compania,
          rnc: metadata?.rnc,
          cedula: metadata?.cedula,
          telefono: metadata?.telefono,
          rol: metadata?.rol,
          app_id: appId,
          app_allowed: appId ? appId.toUpperCase() : undefined,
          // Asignar trial automáticamente
          planType: 'TRIAL',
          isActive: true,
          trialActive: true,
          trialStartDate: trialStartDate.toISOString().split('T')[0],
          trialEndDate: trialEndDate.toISOString().split('T')[0],
        },
      },
    })
    
    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    this.setAppSessionCookie(null)
    if (typeof window !== 'undefined') {
      const { invalidatePerfilCache } = await import('./perfiles')
      invalidatePerfilCache()
      ejecutarLimpiezaSesion()
    }
  },

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      // Si el error es de sesión faltante, devolver null
      if (error) {
        if (error.message?.includes('session missing') || error.message?.includes('Auth session missing')) {
          return null
        }
        throw error
      }
      const appId = getAppId()
      if (appId && !this.validarAccesoApp(user)) {
        await supabase.auth.signOut()
        this.setAppSessionCookie(null)
        return null
      }
      if (appId) {
        this.setAppSessionCookie(appId)
      }
      return user
    } catch (error: any) {
      // Si es un error de sesión faltante, devolver null
      if (error?.message?.includes('session missing') || error?.message?.includes('Auth session missing')) {
        return null
      }
      throw error
    }
  },

  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      // Si hay error pero es solo que no hay sesión, devolver null en lugar de lanzar error
      if (error) {
        // Si el error es "Auth session missing", es normal cuando no hay sesión
        if (error.message?.includes('session missing') || error.message?.includes('Auth session missing')) {
          return null
        }
        throw error
      }
      const appId = getAppId()
      if (appId && session?.user && !this.validarAccesoApp(session.user)) {
        await supabase.auth.signOut()
        this.setAppSessionCookie(null)
        return null
      }
      if (appId && session?.user) {
        this.setAppSessionCookie(appId)
      }
      return session
    } catch (error: any) {
      // Si es un error de sesión faltante, devolver null en lugar de lanzar
      if (error?.message?.includes('session missing') || error?.message?.includes('Auth session missing')) {
        return null
      }
      // Para otros errores, lanzar normalmente
      throw error
    }
  },

  onAuthStateChange(callback: (user: any) => void) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null)
    })
    return data
  },

  /**
   * Cambia la contraseña del usuario autenticado
   */
  async cambiarContrasena(contrasenaActual: string, nuevaContrasena: string) {
    // Primero verificar la contraseña actual haciendo un sign in
    const user = await this.getCurrentUser()
    if (!user || !user.email) {
      throw new Error('No hay usuario autenticado')
    }

    // Verificar contraseña actual
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: contrasenaActual,
    })

    if (signInError) {
      throw new Error('La contraseña actual es incorrecta')
    }

    // Cambiar la contraseña
    const { error: updateError } = await supabase.auth.updateUser({
      password: nuevaContrasena,
    })

    if (updateError) throw updateError
  },

  /**
   * Envía un correo de recuperación de contraseña
   */
  async recuperarContrasena(email: string) {
    // Usar URL pública si está configurada, si no usar el origin actual
    const configuredOrigin =
      process.env.NEXT_PUBLIC_PASSWORD_RESET_URL || process.env.NEXT_PUBLIC_SITE_URL
    const origin = configuredOrigin && configuredOrigin.trim()
      ? configuredOrigin.replace(/\/+$/, '')
      : 'https://electro.jasicorporations.com'
    const redirectTo = `${origin}/actualizar-contrasena`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) throw error
  },
}

