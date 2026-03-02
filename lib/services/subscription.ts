import { supabase } from '../supabase'
import { authService } from './auth'
import { PLANES, type PlanType, getPlanLimits, isWithinLimit } from '../config/planes'
import { getCompaniaActual } from '../utils/compania'

export interface UsageStats {
  clientes: number
  prestamos: number
  /** Plan Plata: total histórico de clientes creados (no disminuye al borrar) */
  clientes_creados_total?: number
}

export interface PlanValidation {
  allowed: boolean
  message?: string
  usage?: UsageStats
  limits?: {
    clientes: number | 'ilimitado'
    prestamos: number | 'ilimitado'
  }
}

export const subscriptionService = {
  /**
   * Obtiene la empresa actual con fallback al perfil si falta en localStorage
   */
  async resolveCompaniaId(): Promise<string | null> {
    const companiaActual = getCompaniaActual()
    if (companiaActual) {
      return companiaActual
    }

    try {
      const { authService } = await import('./auth')
      const user = await authService.getCurrentUser()
      const metadataCompania = user?.user_metadata?.compania
      if (metadataCompania && typeof metadataCompania === 'string') {
        if (typeof window !== 'undefined') {
          localStorage.setItem('compania_actual', metadataCompania)
        }
        return metadataCompania
      }

      const { perfilesService } = await import('./perfiles')
      const perfil = await perfilesService.getPerfilActual()
      const empresaId = perfil?.empresa_id || perfil?.compania_id
      if (empresaId && empresaId !== 'SISTEMA') {
        if (typeof window !== 'undefined') {
          localStorage.setItem('compania_actual', empresaId)
        }
        return empresaId
      }
    } catch (error) {
      console.warn('No se pudo resolver empresa desde perfil o metadata:', error)
    }

    return null
  },
  /**
   * Obtiene el plan del usuario actual
   */
  async getCurrentPlan(): Promise<PlanType | null> {
    try {
      // getUser() siempre consulta el servidor y retorna metadata actualizada
      const { data: { session } } = await supabase.auth.getSession()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (session?.user) {
          const planType = (session.user.user_metadata?.planType as PlanType) || 'TRIAL'
          return planType
        }
        return null
      }
      const planType = (user.user_metadata?.planType as PlanType) || 'TRIAL'
      return planType
    } catch (error) {
      console.error('Error obteniendo plan actual:', error)
      return 'TRIAL'
    }
  },

  /**
   * Verifica si el usuario tiene suscripción activa
   */
  async isActive(): Promise<boolean> {
    try {
      // Bypass: si es TRIAL, retornar true de inmediato (evita fechas/metadata vacía)
      const plan = await this.getCurrentPlan()
      if (plan === 'TRIAL') return true

      const user = await authService.getCurrentUser()
      if (!user) {
        console.warn('No hay usuario autenticado para verificar suscripción')
        return false
      }
      
      const planType = (user.user_metadata?.planType as string) || 'TRIAL'
      
      if (planType === 'TRIAL') {
        const trialEndDate = user.user_metadata?.trialEndDate
        if (trialEndDate) {
          const [y, m, d] = String(trialEndDate).split('-').map(Number)
          const expirationEndOfDay = new Date(y, (m || 1) - 1, (d || 1) + 1, 0, 0, 0, 0)
          const now = new Date()
          if (expirationEndOfDay <= now) return false
          return true
        }
        // Sin trialEndDate o metadata vacía: retornar true para no bloquear usuarios nuevos
        return true
      }
      
      // Si es plan INFINITO (vitalicio), verificar expires_at
      if (user.user_metadata?.isLifetime === true || planType === 'INFINITO') {
        const expiresAt = user.user_metadata?.expires_at
        if (expiresAt) {
          const expirationDate = new Date(expiresAt)
          const now = new Date()
          // Si la fecha de expiración es en el futuro, está activo
          return expirationDate > now
        }
        // Si no hay expires_at pero es lifetime, considerar activo
        return true
      }
      
      // Por defecto, si no hay campo isActive, considerar activo
      // Esto es importante para usuarios que se registraron antes de implementar suscripciones
      const isActive = user.user_metadata?.isActive !== false
      
      // Si isActive no está definido, asumir que está activo (compatibilidad hacia atrás)
      if (user.user_metadata?.isActive === undefined) {
        return true
      }
      
      return isActive
    } catch (error) {
      console.error('Error verificando estado de suscripción:', error)
      return false
    }
  },
  
  /**
   * Verifica si el usuario está en período de prueba
   */
  async isTrial(): Promise<boolean> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return false
      
      const planType = user.user_metadata?.planType as string
      return planType === 'TRIAL'
    } catch (error) {
      console.error('Error verificando trial:', error)
      return false
    }
  },
  
  /**
   * Indica si el usuario en plan TRIAL ya utilizó su cupo de crear un usuario (aunque lo haya borrado).
   * Usado para limitar: en trial solo se puede crear 1 usuario (vendedor) y no más.
   */
  async getTrialUsuarioCreado(): Promise<boolean> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return false
      return user.user_metadata?.trialUsuarioCreado === true
    } catch (error) {
      console.error('Error verificando trialUsuarioCreado:', error)
      return false
    }
  },

  /**
   * Marca que el usuario en plan TRIAL ya utilizó su cupo de crear un usuario (no puede crear más).
   */
  async setTrialUsuarioCreadoUsed(): Promise<void> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return
      const { error } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, trialUsuarioCreado: true },
      })
      if (error) throw error
    } catch (error) {
      console.error('Error marcando trialUsuarioCreado:', error)
      throw error
    }
  },

  /** Límite de financiamientos en plan TRIAL (aunque borren, no pueden crear más de este número). */
  TRIAL_MAX_FINANCIAMIENTOS: 3,

  /**
   * Cuántos financiamientos ha emitido el usuario en plan TRIAL (contador que no se reduce al borrar).
   */
  async getTrialFinanciamientosCreados(): Promise<number> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return 0
      const n = user.user_metadata?.trialFinanciamientosCreados
      return typeof n === 'number' && n >= 0 ? n : 0
    } catch (error) {
      console.error('Error leyendo trialFinanciamientosCreados:', error)
      return 0
    }
  },

  /**
   * Incrementa el contador de financiamientos creados en trial (se llama tras crear una venta).
   */
  async incrementTrialFinanciamientoCreado(): Promise<void> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return
      const current = typeof user.user_metadata?.trialFinanciamientosCreados === 'number'
        ? user.user_metadata.trialFinanciamientosCreados
        : 0
      const { error } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, trialFinanciamientosCreados: current + 1 },
      })
      if (error) throw error
    } catch (error) {
      console.error('Error incrementando trialFinanciamientosCreados:', error)
      throw error
    }
  },

  /**
   * Obtiene información del trial del usuario
   */
  async getTrialInfo(): Promise<{ isTrial: boolean; daysRemaining: number; trialEndDate: Date | null }> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) {
        return { isTrial: false, daysRemaining: 0, trialEndDate: null }
      }
      
      const planType = user.user_metadata?.planType as string
      if (planType !== 'TRIAL') {
        return { isTrial: false, daysRemaining: 0, trialEndDate: null }
      }
      
      const trialEndDateStr = user.user_metadata?.trialEndDate
      if (!trialEndDateStr) {
        // Sin fecha: retrocompatibilidad - asumir 7 días restantes para no redirigir
        return { isTrial: true, daysRemaining: 7, trialEndDate: null }
      }
      
      const trialEndDate = new Date(trialEndDateStr)
      const now = new Date()
      const diffTime = trialEndDate.getTime() - now.getTime()
      const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      
      return {
        isTrial: true,
        daysRemaining,
        trialEndDate,
      }
    } catch (error) {
      console.error('Error obteniendo información del trial:', error)
      return { isTrial: false, daysRemaining: 0, trialEndDate: null }
    }
  },

  /**
   * Obtiene las estadísticas de uso del usuario actual.
   * Si la empresa no se puede resolver o las tablas no tienen las columnas esperadas,
   * retorna ceros para no bloquear al usuario.
   */
  async getUsageStats(): Promise<UsageStats> {
    const safeDefault: UsageStats = { clientes: 0, prestamos: 0 }

    try {
      const compania = await this.resolveCompaniaId()

      // Plan Plata: obtener clientes_creados_total (histórico) vía RPC o select directo
      // No llamar RPC si compania es SISTEMA (super_admin) o si no existe
      let clientesCreadosTotal: number | undefined
      if (compania && compania !== 'SISTEMA') {
        try {
          const { data, error } = await (supabase as any).rpc('get_clientes_creados_total', { p_empresa_id: compania })
          if (!error && data != null) {
            clientesCreadosTotal = Number(data)
          }
        } catch {
          try {
            const { data: emp } = await supabase.from('empresas').select('clientes_creados_total').or(`id.eq.${compania},nombre.eq.${compania}`).single() as { data: { clientes_creados_total?: number } | null }
            if (emp?.clientes_creados_total != null) clientesCreadosTotal = Number(emp.clientes_creados_total)
          } catch {
            /* ignorar */
          }
        }
      }
      const isMissingColumn = (err: any) => {
        const msg = typeof err?.message === 'string' ? err.message : ''
        return err?.code === '42703' || err?.code === 'PGRST204' || err?.code === 'PGRST116' ||
          msg.includes('column') || msg.includes('schema cache') || err?.status === 400
      }

      const countByField = async (table: 'clientes' | 'motores', field: 'compania_id' | 'empresa_id') => {
        if (!compania) return null
        const baseQuery = supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        const scopedQuery = baseQuery.eq(field, compania)
        const query = table === 'motores' ? (scopedQuery as any).eq('estado', 'Disponible') : scopedQuery
        const { count, error } = await query
        if (error) {
          if (isMissingColumn(error)) return null
          throw error
        }
        return count ?? 0
      }

      // Clientes: intentar por empresa_id primero (la tabla suele tener empresa_id); fallback compania_id
      let clientesCount: number | null = null
      if (compania) {
        clientesCount = await countByField('clientes', 'empresa_id')
        if (clientesCount === null) clientesCount = await countByField('clientes', 'compania_id')
      }
      if (clientesCount === null) {
        const { count, error } = await supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true })
        if (error && isMissingColumn(error)) return safeDefault
        if (error) throw error
        clientesCount = count ?? 0
      }

      // Motores (préstamos): intentar por empresa_id primero; fallback compania_id
      let prestamosCount: number | null = null
      if (compania) {
        prestamosCount = await countByField('motores', 'empresa_id')
        if (prestamosCount === null) prestamosCount = await countByField('motores', 'compania_id')
      }
      if (prestamosCount === null) {
        let { count, error } = await supabase
          .from('motores')
          .select('*', { count: 'exact', head: true })
          .eq('estado', 'Disponible')
        if (error && isMissingColumn(error)) {
          // Tabla sin columna estado: contar todos los motores
          const fallback = await supabase
            .from('motores')
            .select('*', { count: 'exact', head: true })
          if (fallback.error) return safeDefault
          prestamosCount = fallback.count ?? 0
        } else if (error) {
          throw error
        } else {
          prestamosCount = count ?? 0
        }
      }

      return {
        clientes: clientesCount ?? 0,
        prestamos: prestamosCount ?? 0,
        clientes_creados_total: clientesCreadosTotal,
      }
    } catch (error) {
      console.warn('Error obteniendo estadísticas de uso para límites; se asume uso 0:', error)
      return safeDefault
    }
  },

  /**
   * Valida si el usuario puede crear un nuevo cliente
   */
  async canCreateCliente(): Promise<PlanValidation> {
    try {
      const isActive = await this.isActive()
      if (!isActive) {
        return {
          allowed: false,
          message: 'Tu suscripción no está activa. Por favor, renueva tu suscripción.',
        }
      }

      const planType = await this.getCurrentPlan()
      if (!planType) {
        return {
          allowed: false,
          message: 'No se pudo determinar tu plan. Por favor, contacta al soporte.',
        }
      }

      const limits = getPlanLimits(planType)
      const usage = await this.getUsageStats()

      // Plan Plata: usar clientes_creados_total (histórico, no disminuye al borrar)
      const clientesParaLimite = planType === 'PLATA' && usage.clientes_creados_total != null
        ? usage.clientes_creados_total
        : usage.clientes

      if (!isWithinLimit(clientesParaLimite, limits.clientes)) {
        const msgAmable = planType === 'PLATA'
          ? `¡Tu negocio está creciendo! Has creado ${clientesParaLimite} clientes en total (límite histórico: ${limits.clientes}). Aunque borres clientes, no podrás crear más hasta que actualices tu plan. Te invitamos cordialmente a cambiarlo.`
          : `¡Tu negocio está creciendo! Ya tienes ${usage.clientes} clientes (límite: ${limits.clientes}). Te invitamos a actualizar tu plan para seguir expandiendo.`
        return {
          allowed: false,
          message: msgAmable,
          usage: { ...usage, clientes: clientesParaLimite },
          limits: {
            clientes: limits.clientes,
            prestamos: limits.prestamos,
          },
        }
      }

      return {
        allowed: true,
        usage,
        limits: {
          clientes: limits.clientes,
          prestamos: limits.prestamos,
        },
      }
    } catch (error) {
      console.error('Error validando creación de cliente:', error)
      const err = error as any
      const msg = err?.message ?? err?.error_description ?? (typeof error === 'string' ? error : 'N/A')
      const errorDetails = msg && msg !== 'N/A' ? ` (${msg})` : ''
      return {
        allowed: false,
        message: `Error al validar límites. Por favor, intenta nuevamente.${errorDetails}`,
      }
    }
  },

  /**
   * Valida si el usuario puede crear un nuevo préstamo
   */
  async canCreatePrestamo(): Promise<PlanValidation> {
    try {
      const isActive = await this.isActive()
      if (!isActive) {
        return {
          allowed: false,
          message: 'Tu suscripción no está activa. Por favor, renueva tu suscripción.',
        }
      }

      const planType = await this.getCurrentPlan()
      if (!planType) {
        return {
          allowed: false,
          message: 'No se pudo determinar tu plan. Por favor, contacta al soporte.',
        }
      }

      const limits = getPlanLimits(planType)
      const usage = await this.getUsageStats()

      if (!isWithinLimit(usage.prestamos, limits.prestamos)) {
        return {
          allowed: false,
          message: `¡Tu negocio está creciendo! Ya tienes ${usage.prestamos} préstamos activos (límite: ${limits.prestamos}). Te invitamos a actualizar tu plan para seguir expandiendo.`,
          usage,
          limits: {
            clientes: limits.clientes,
            prestamos: limits.prestamos,
          },
        }
      }

      return {
        allowed: true,
        usage,
        limits: {
          clientes: limits.clientes,
          prestamos: limits.prestamos,
        },
      }
    } catch (error) {
      console.error('Error validando creación de préstamo:', error)
      const err = error as any
      const msg = err?.message ?? err?.error_description ?? (typeof error === 'string' ? error : 'N/A')
      const errorDetails = msg && msg !== 'N/A' ? ` (${msg})` : ''
      return {
        allowed: false,
        message: `Error al validar límites. Por favor, intenta nuevamente.${errorDetails}`,
      }
    }
  },

  /**
   * Actualiza el plan del usuario
   */
  async updatePlan(planType: PlanType, isActive: boolean = true): Promise<void> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          planType,
          isActive,
        },
      })

      if (error) throw error
    } catch (error) {
      console.error('Error actualizando plan:', error)
      throw error
    }
  },
}

