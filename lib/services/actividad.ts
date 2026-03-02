import { supabase } from '../supabase'
import type { ActividadLog } from '@/types'
import { perfilesService } from './perfiles'
import { getAppId } from '../utils/appId'
import { getCompaniaActual } from '../utils/compania'
import { orEmpresaCompania } from '../utils/postgrest'

function rowToActividadLog(row: { usuario_id?: string | null; detalle?: string | null; [key: string]: unknown }): ActividadLog {
  return { ...row, usuario_id: row.usuario_id ?? undefined, detalle: row.detalle ?? undefined } as ActividadLog
}

export const actividadService = {
  /**
   * Registra una actividad en el log del sistema
   */
  async registrarActividad(
    accion: string,
    detalle?: string,
    entidadTipo?: string,
    entidadId?: string
  ): Promise<void> {
    try {
      // Obtener información del usuario actual
      const perfil = await perfilesService.getPerfilActual()
      const nombreUsuario = await perfilesService.getNombreCompleto()
      const nombreSucursal = await perfilesService.getNombreSucursal()
      const empresaId = perfil?.empresa_id || perfil?.compania_id || null
      const appId = getAppId()

      // Obtener user_id actual
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || null

      // Evitar duplicados rápidos (por triggers o reintentos) para la misma entidad
      if (userId && entidadId && entidadTipo) {
        const { data: existingLog, error: existingError } = await supabase
          .from('actividad_logs')
          .select('id, fecha_hora')
          .eq('usuario_id', userId)
          .eq('entidad_tipo', entidadTipo)
          .eq('entidad_id', entidadId)
          .eq('accion', accion)
          .order('fecha_hora', { ascending: false })
          .limit(1) as { data: { id: string; fecha_hora: string }[] | null; error: unknown }

        if (!existingError && existingLog && existingLog.length > 0) {
          const lastDate = new Date(existingLog[0].fecha_hora)
          const now = new Date()
          const diffMs = now.getTime() - lastDate.getTime()
          if (diffMs >= 0 && diffMs < 60_000) {
            console.warn('Actividad duplicada detectada, se omite registro:', {
              accion,
              entidadTipo,
              entidadId,
            })
            return
          }
        }
      }

      // Llamar a la función SQL para registrar la actividad
      const { error } = await (supabase as any).rpc('registrar_actividad', {
        p_usuario_id: userId,
        p_usuario_nombre: nombreUsuario,
        p_sucursal_id: perfil?.sucursal_id || null,
        p_sucursal_nombre: nombreSucursal || null,
        p_accion: accion,
        p_detalle: detalle || null,
        p_entidad_tipo: entidadTipo || null,
        p_entidad_id: entidadId || null,
      })

      if (error) {
        // Ante cualquier error del RPC (función no existe, columnas faltantes, RLS, etc.), intentar insertar directamente
        console.warn('RPC registrar_actividad falló, insertando directamente:', error.message)
        await this.registrarActividadDirecta(
          userId,
          nombreUsuario,
          perfil?.sucursal_id || null,
          nombreSucursal || null,
          accion,
          detalle,
          entidadTipo,
          entidadId,
          empresaId,
          appId ?? 'prestamos'
        )
      }
    } catch (error) {
      console.error('Error en registrarActividad:', error)
      // No lanzar error para no interrumpir el flujo principal
    }
  },

  /**
   * Registra actividad desde el servidor (API routes) usando el cliente Supabase pasado.
   * Útil para backup export/restore y otras acciones que se ejecutan en el servidor.
   */
  async registrarActividadDesdeServidor(
    supabaseClient: { from: (table: string) => any; auth: { getUser: () => Promise<{ data: { user: any } }> } },
    accion: string,
    detalle?: string,
    entidadTipo?: string,
    entidadId?: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) return

      const { data: perfil } = await supabaseClient
        .from('perfiles')
        .select('nombre_completo, empresa_id, sucursal_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      let sucursalNombre: string | null = null
      if (perfil?.sucursal_id) {
        const { data: sucursal } = await supabaseClient
          .from('sucursales')
          .select('nombre')
          .eq('id', perfil.sucursal_id)
          .limit(1)
          .single()
        sucursalNombre = sucursal?.nombre ?? null
      }

      const baseData: Record<string, unknown> = {
        usuario_id: user.id,
        usuario_nombre: (perfil as any)?.nombre_completo || user.email || 'Usuario',
        sucursal_id: (perfil as any)?.sucursal_id || null,
        sucursal_nombre: sucursalNombre,
        accion,
        detalle: detalle || null,
        entidad_tipo: entidadTipo || null,
        entidad_id: entidadId || null,
        fecha_hora: new Date().toISOString(),
      }

      const fullData = { ...baseData }
      const empresaId = (perfil as any)?.empresa_id || null
      if (empresaId) {
        fullData.empresa_id = empresaId
        fullData.compania_id = empresaId
      }

      const table = (supabaseClient as any).from('actividad_logs')
      let { error } = await table.insert(fullData)

      if (error && (error.message?.includes('column') || error.message?.includes('empresa_id') || error.message?.includes('compania_id') || error.message?.includes('usuario_nombre'))) {
        let retry = await table.insert(baseData)
        if (retry.error && (retry.error.message?.includes('usuario_nombre') || retry.error.message?.includes('sucursal'))) {
          const minimal = {
            usuario_id: user.id,
            accion,
            detalle: detalle ?? null,
            entidad_tipo: entidadTipo ?? null,
            entidad_id: entidadId ?? null,
            fecha_hora: new Date().toISOString(),
          }
          retry = await table.insert(minimal)
        }
        if (retry?.error && (retry.error.message?.includes('entidad_tipo') || retry.error.message?.includes('entidad_id'))) {
          const sinEntidad = {
            usuario_id: user.id,
            accion,
            detalle: (detalle ?? '') + (entidadTipo ? ` [${entidadTipo}]` : ''),
            fecha_hora: new Date().toISOString(),
          }
          const r = await table.insert(sinEntidad)
          if (!r.error) error = null
          else error = r.error
        } else {
          error = retry?.error ?? error
        }
      }
      if (error) {
        console.warn('Error registrando actividad desde servidor:', error)
      }
    } catch (err) {
      console.warn('Error en registrarActividadDesdeServidor:', err)
    }
  },

  /**
   * Registra actividad directamente en la tabla (fallback si RPC no funciona)
   */
  async registrarActividadDirecta(
    usuarioId: string | null,
    usuarioNombre: string,
    sucursalId: string | null,
    sucursalNombre: string | null,
    accion: string,
    detalle?: string,
    entidadTipo?: string,
    entidadId?: string,
    empresaId?: string | null,
    appId?: string | null
  ): Promise<void> {
    try {
      // Usar solo columnas base (compatibles con schema minimal de actividad_logs)
      const baseData: Record<string, any> = {
        usuario_id: usuarioId,
        usuario_nombre: usuarioNombre,
        sucursal_id: sucursalId,
        sucursal_nombre: sucursalNombre,
        accion,
        detalle: detalle || null,
        entidad_tipo: entidadTipo || null,
        entidad_id: entidadId || null,
        fecha_hora: new Date().toISOString(),
      }

      // Intentar insert con columnas opcionales si la tabla las tiene (empresa_id, compania_id, app_id)
      const fullData = { ...baseData }
      if (empresaId) {
        fullData.empresa_id = empresaId
        fullData.compania_id = empresaId
      }
      fullData.app_id = appId || 'prestamos'

      let { error } = await (supabase as any).from('actividad_logs').insert(fullData)

      // Si falla por entidad_tipo/entidad_id, intentar sin esas columnas primero (tabla sin ellas)
      if (error && (error.message?.includes('entidad_tipo') || error.message?.includes('entidad_id'))) {
        const sinEntidad: Record<string, unknown> = {
          usuario_id: usuarioId,
          accion,
          detalle: (detalle ?? '') + (entidadTipo ? ` [${entidadTipo}]` : ''),
          fecha_hora: new Date().toISOString(),
        }
        let r = await (supabase as any).from('actividad_logs').insert(sinEntidad)
        if (r.error && r.error.message?.includes('fecha_hora')) {
          const minimo = { usuario_id: usuarioId, accion, detalle: (detalle ?? '') + (entidadTipo ? ` [${entidadTipo}]` : '') }
          r = await (supabase as any).from('actividad_logs').insert(minimo)
        }
        if (!r.error) error = null
        else error = r.error
      }

      // Si falla por otras columnas inexistentes, reintentar con menos columnas
      if (error && (error.message?.includes('column') || error.message?.includes('empresa_id') || error.message?.includes('compania_id') || error.message?.includes('app_id') || error.message?.includes('usuario_nombre'))) {
        let retry = await (supabase as any).from('actividad_logs').insert(baseData)
        if (retry.error && (retry.error.message?.includes('usuario_nombre') || retry.error.message?.includes('sucursal'))) {
          const minimal: Record<string, unknown> = {
            usuario_id: usuarioId,
            accion,
            detalle: detalle ?? null,
            entidad_tipo: entidadTipo ?? null,
            entidad_id: entidadId ?? null,
            fecha_hora: new Date().toISOString(),
          }
          retry = await (supabase as any).from('actividad_logs').insert(minimal)
        }
        if (retry?.error && (retry.error.message?.includes('entidad_tipo') || retry.error.message?.includes('entidad_id'))) {
          const sinEntidad: Record<string, unknown> = {
            usuario_id: usuarioId,
            accion,
            detalle: (detalle ?? '') + (entidadTipo ? ` [${entidadTipo}]` : ''),
            fecha_hora: new Date().toISOString(),
          }
          let r = await (supabase as any).from('actividad_logs').insert(sinEntidad)
          if (r.error && r.error.message?.includes('fecha_hora')) {
            r = await (supabase as any).from('actividad_logs').insert({
              usuario_id: usuarioId,
              accion,
              detalle: (detalle ?? '') + (entidadTipo ? ` [${entidadTipo}]` : ''),
            })
          }
          if (!r.error) error = null
          else error = r.error
        } else {
          error = retry?.error ?? error
        }
      }

      if (error) {
        console.error('Error insertando actividad directamente:', error)
      }
    } catch (error) {
      console.error('Error en registrarActividadDirecta:', error)
    }
  },

  /**
   * Obtiene el historial de actividad (solo para Admin)
   * Filtra por empresa del usuario actual para seguridad multi-tenant.
   * Si actividad_logs no tiene empresa_id/compania_id, trae logs por usuario_id (usuarios de la empresa).
   */
  async getHistorial(limit: number = 100): Promise<ActividadLog[]> {
    try {
      const perfil = await perfilesService.getPerfilActual()
      const empresaId = perfil?.empresa_id || perfil?.compania_id || getCompaniaActual() || null
      const appId = getAppId()

      // Estrategia que funciona aunque actividad_logs no tenga empresa_id/compania_id:
      // obtener user_id de todos los perfiles de la empresa y filtrar actividad_logs por usuario_id
      if (empresaId) {
        const rEmpresa = await supabase.from('perfiles').select('user_id').eq('empresa_id', empresaId).limit(500)
        const rCompania = await supabase.from('perfiles').select('user_id').eq('compania_id', empresaId).limit(500)
        const perfilesEmpresa = (rEmpresa.data || rCompania.data || []) as { user_id: string }[]
        const userIds = perfilesEmpresa.map((p: any) => p.user_id).filter(Boolean)
        if (userIds.length > 0) {
          const res = await supabase
            .from('actividad_logs')
            .select('*')
            .in('usuario_id', userIds)
            .order('fecha_hora', { ascending: false })
            .limit(limit)
          if (!res.error) {
            return (res.data || []).map(rowToActividadLog)
          }
        }
      }

      // Fallback: si la tabla tiene empresa_id/compania_id/app_id, intentar filtros directos
      let logsQuery = supabase.from('actividad_logs').select('*')
      if (empresaId) {
        try {
          logsQuery = logsQuery.or(orEmpresaCompania(empresaId))
        } catch {
          try {
            logsQuery = logsQuery.eq('compania_id', empresaId)
          } catch {
            logsQuery = logsQuery.eq('empresa_id', empresaId)
          }
        }
      } else if (appId) {
        logsQuery = logsQuery.eq('app_id', appId)
      }

      const { data, error } = await logsQuery.order('fecha_hora', { ascending: false }).limit(limit)
      if (error) throw error
      return (data || []).map(rowToActividadLog)
    } catch (error) {
      console.error('Error obteniendo historial de actividad:', error)
      return []
    }
  },

  /**
   * Obtiene el historial de actividad de una sucursal específica
   */
  async getHistorialPorSucursal(sucursalId: string, limit: number = 100): Promise<ActividadLog[]> {
    const { data, error } = await supabase
      .from('actividad_logs')
      .select('*')
      .eq('sucursal_id', sucursalId)
      .order('fecha_hora', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data || []).map(rowToActividadLog)
  },

  /**
   * Obtiene el historial de actividad de un usuario específico
   */
  async getHistorialPorUsuario(usuarioId: string, limit: number = 100): Promise<ActividadLog[]> {
    const { data, error } = await supabase
      .from('actividad_logs')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('fecha_hora', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data || []).map(rowToActividadLog)
  },
}

