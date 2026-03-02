/**
 * Servicio para gestionar sesiones activas y prevenir sesiones simultáneas
 */

import { supabase } from '../supabase'

const STORAGE_KEY_ACTIVE_SESSION = 'active_session_id'
const STORAGE_KEY_USER_ID = 'active_user_id'

export interface ActiveSession {
  user_id: string
  session_id: string
  device_id: string
  last_activity: number
  created_at: number
}

/**
 * Genera un ID único para esta sesión/dispositivo
 */
function generarSessionId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${random}`
}

/**
 * Genera un ID único para el dispositivo (persistente)
 */
function obtenerDeviceId(): string {
  let deviceId = localStorage.getItem('device_id')
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    localStorage.setItem('device_id', deviceId)
  }
  return deviceId
}

/**
 * Registra una nueva sesión activa
 */
export async function registrarSesionActiva(userId: string): Promise<string> {
  const sessionId = generarSessionId()
  const deviceId = obtenerDeviceId()
  const now = Date.now()

  const session: ActiveSession = {
    user_id: userId,
    session_id: sessionId,
    device_id: deviceId,
    last_activity: now,
    created_at: now,
  }

  // Guardar en localStorage
  localStorage.setItem(STORAGE_KEY_ACTIVE_SESSION, sessionId)
  localStorage.setItem(STORAGE_KEY_USER_ID, userId)
  localStorage.setItem(`session_${sessionId}`, JSON.stringify(session))

  // Guardar también la referencia de usuario -> sesión activa
  localStorage.setItem(`user_active_session_${userId}`, sessionId)

  console.log('✅ [sesiones] Sesión registrada:', sessionId)
  return sessionId
}

/**
 * Obtiene la sesión activa actual del usuario
 */
export function obtenerSesionActiva(userId: string): ActiveSession | null {
  const sessionId = localStorage.getItem(`user_active_session_${userId}`)
  if (!sessionId) {
    return null
  }

  const sessionData = localStorage.getItem(`session_${sessionId}`)
  if (!sessionData) {
    return null
  }

  try {
    return JSON.parse(sessionData) as ActiveSession
  } catch {
    return null
  }
}

/**
 * Verifica si la sesión actual es válida (no hay otra sesión activa en otro dispositivo)
 */
export function verificarSesionValida(userId: string): boolean {
  const currentSessionId = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION)
  const savedSessionId = localStorage.getItem(`user_active_session_${userId}`)

  // Si no hay sesión guardada, es válida (primera vez)
  if (!savedSessionId) {
    return true
  }

  // Si la sesión actual coincide con la guardada, es válida
  if (currentSessionId === savedSessionId) {
    return true
  }

  // Si hay otra sesión activa, esta no es válida
  console.warn('⚠️ [sesiones] Sesión inválida detectada. Hay otra sesión activa en otro dispositivo.')
  return false
}

/**
 * Actualiza la última actividad de la sesión
 */
export function actualizarActividad(userId: string): void {
  const session = obtenerSesionActiva(userId)
  if (!session) {
    return
  }

  session.last_activity = Date.now()
  localStorage.setItem(`session_${session.session_id}`, JSON.stringify(session))
}

/**
 * Cierra la sesión activa
 */
export function cerrarSesionActiva(userId: string): void {
  const sessionId = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION)
  
  if (sessionId) {
    localStorage.removeItem(`session_${sessionId}`)
  }
  
  localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION)
  localStorage.removeItem(`user_active_session_${userId}`)
  localStorage.removeItem(STORAGE_KEY_USER_ID)
  
  console.log('✅ [sesiones] Sesión cerrada:', sessionId)
}

/**
 * Verifica si hay una sesión activa en otro dispositivo para el mismo usuario
 * Retorna true si hay otra sesión activa más reciente
 */
export function haySesionEnOtroDispositivo(userId: string): boolean {
  const currentSession = obtenerSesionActiva(userId)
  const currentSessionId = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION)

  if (!currentSession || !currentSessionId) {
    return false
  }

  // Si la sesión actual no coincide con la última guardada, hay otra sesión activa
  const savedSessionId = localStorage.getItem(`user_active_session_${userId}`)
  if (savedSessionId && savedSessionId !== currentSessionId) {
    // Verificar si la otra sesión es más reciente
    const otherSessionData = localStorage.getItem(`session_${savedSessionId}`)
    if (otherSessionData) {
      try {
        const otherSession = JSON.parse(otherSessionData) as ActiveSession
        // Si la otra sesión tiene actividad más reciente, cerrar esta
        if (otherSession.last_activity > currentSession.last_activity) {
          return true
        }
      } catch {
        // Si hay error, asumir que no hay otra sesión
      }
    }
  }

  return false
}

/**
 * Fuerza el cierre de todas las sesiones anteriores de un usuario
 * Útil cuando el usuario inicia sesión en un nuevo dispositivo
 */
export function forzarCierreOtrasSesiones(userId: string, nuevaSessionId: string): void {
  // Obtener todas las claves de sesión almacenadas
  const allKeys = Object.keys(localStorage)
  const sessionKeys = allKeys.filter(key => key.startsWith('session_'))

  for (const key of sessionKeys) {
    try {
      const sessionData = localStorage.getItem(key)
      if (sessionData) {
        const session = JSON.parse(sessionData) as ActiveSession
        // Si es del mismo usuario pero diferente sesión, eliminarla
        if (session.user_id === userId && session.session_id !== nuevaSessionId) {
          localStorage.removeItem(key)
          console.log('🗑️ [sesiones] Sesión anterior eliminada:', session.session_id)
        }
      }
    } catch {
      // Ignorar errores al parsear
    }
  }
}


