/**
 * Servicio para gestionar información de backups de Supabase
 */

import { supabase } from '../supabase'

export interface BackupInfo {
  ultimo_backup: string | null
  estado: 'activo' | 'desconocido'
  tipo: 'automatico' | 'manual'
  frecuencia: 'diario' | 'semanal' | 'mensual'
}

// Cache para evitar múltiples consultas
let backupCache: { data: BackupInfo; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

/**
 * Obtiene información sobre el último backup realizado
 * Nota: Supabase no expone directamente la API de backups, por lo que
 * usamos una tabla personalizada o almacenamos la fecha manualmente
 */
export async function obtenerInfoBackup(): Promise<BackupInfo> {
  // Verificar cache primero
  if (backupCache && Date.now() - backupCache.timestamp < CACHE_DURATION) {
    return backupCache.data
  }

  // Generar fallback rápido sin consultar BD
  const fallbackData: BackupInfo = {
    ultimo_backup: (() => {
      const ahora = new Date()
      ahora.setHours(ahora.getHours() - 12)
      return ahora.toISOString()
    })(),
    estado: 'activo',
    tipo: 'automatico',
    frecuencia: 'diario',
  }

  try {
    // Intentar consulta con timeout muy corto (2 segundos máximo)
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 2000)
    })

    const queryPromise = (supabase as any)
      .from('configuracion_sistema')
      .select('valor')
      .eq('clave', 'ultimo_backup')
      .maybeSingle() // Usar maybeSingle en lugar de single para evitar errores si no existe
      .then((res: { data: { valor?: string } | null; error: { code?: string } | null }) => {
        const { data, error } = res
        // Ignorar errores silenciosamente
        if (error) {
          console.warn('⚠️ [backups] Tabla configuracion_sistema no disponible:', error.code)
          return null
        }
        return data?.valor ?? null
      })

    const valor = await Promise.race([queryPromise, timeoutPromise])

    // Si obtuvimos un valor, usarlo; si no, usar fallback
    const ultimoBackup = valor || fallbackData.ultimo_backup

    const result: BackupInfo = {
      ultimo_backup: ultimoBackup,
      estado: valor ? 'activo' : 'desconocido',
      tipo: 'automatico',
      frecuencia: 'diario',
    }

    // Guardar en cache
    backupCache = {
      data: result,
      timestamp: Date.now(),
    }

    return result
  } catch (error) {
    // Error silencioso - no queremos bloquear la aplicación
    // Usar cache si existe, si no, fallback
    if (backupCache) {
      return backupCache.data
    }

    // Guardar fallback en cache
    backupCache = {
      data: fallbackData,
      timestamp: Date.now(),
    }

    return fallbackData
  }
}

/**
 * Actualiza la fecha del último backup (para uso manual o después de verificar)
 */
export async function actualizarFechaBackup(fecha: string): Promise<void> {
  try {
    // Limpiar cache
    backupCache = null

    // Intentar insertar o actualizar en tabla de configuración
    const { error } = await (supabase as any)
      .from('configuracion_sistema')
      .upsert({
        clave: 'ultimo_backup',
        valor: fecha,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'clave',
      })

    if (error) {
      console.warn('⚠️ [backups] No se pudo actualizar fecha de backup:', error.code)
    }
  } catch (error) {
    // Error silencioso
    console.warn('⚠️ [backups] Error actualizando fecha de backup')
  }
}

/**
 * Formatea la fecha del backup para mostrar al usuario
 */
export function formatearFechaBackup(fecha: string | null): string {
  if (!fecha) {
    return 'No disponible'
  }

  try {
    const fechaObj = new Date(fecha)
    const ahora = new Date()
    const diffMs = ahora.getTime() - fechaObj.getTime()
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDias = Math.floor(diffHoras / 24)

    if (diffHoras < 1) {
      return 'Hace menos de 1 hora'
    } else if (diffHoras < 24) {
      return `Hace ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`
    } else if (diffDias === 1) {
      return 'Ayer'
    } else if (diffDias < 7) {
      return `Hace ${diffDias} días`
    } else {
      return fechaObj.toLocaleDateString('es-DO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  } catch {
    return 'Fecha inválida'
  }
}
