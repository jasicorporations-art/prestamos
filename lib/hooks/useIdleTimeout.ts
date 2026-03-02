/**
 * Hook para monitorear la inactividad del usuario y cerrar sesión automáticamente
 */

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/services/auth'
import { cerrarSesionActiva } from '@/lib/services/sesiones'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutos en milisegundos

interface UseIdleTimeoutOptions {
  timeout?: number // Tiempo en milisegundos antes de cerrar sesión (default: 15 minutos)
  onIdle?: () => void // Callback cuando se detecta inactividad
  enabled?: boolean // Si el hook está habilitado (default: true)
}

export function useIdleTimeout(options: UseIdleTimeoutOptions = {}) {
  const {
    timeout = IDLE_TIMEOUT_MS,
    onIdle,
    enabled = true,
  } = options

  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  const handleLogout = useCallback(async () => {
    try {
      // Cerrar sesión activa
      const user = await authService.getCurrentUser()
      if (user?.id) {
        cerrarSesionActiva(user.id)
      }

      // Cerrar sesión en Supabase (incluye limpieza SW y datos sensibles)
      await authService.signOut()

      // Redirigir a login
      router.push('/login')
      router.refresh()
      
      // Mostrar mensaje al usuario
      alert('Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.')
    } catch (error) {
      console.error('Error cerrando sesión por inactividad:', error)
    }
  }, [router])

  const resetTimer = useCallback(() => {
    if (!enabled) return

    // Limpiar timer anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Actualizar última actividad
    lastActivityRef.current = Date.now()

    // Crear nuevo timer
    timeoutRef.current = setTimeout(() => {
      console.log('⏰ [useIdleTimeout] Tiempo de inactividad excedido. Cerrando sesión...')
      
      // Ejecutar callback personalizado si existe
      if (onIdle) {
        onIdle()
      } else {
        // Cerrar sesión automáticamente
        handleLogout()
      }
    }, timeout)
  }, [timeout, onIdle, enabled, handleLogout])

  const handleActivity = useCallback(() => {
    if (!enabled) return
    resetTimer()
  }, [enabled, resetTimer])

  useEffect(() => {
    if (!enabled) return

    // Eventos que indican actividad del usuario
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
    ]

    // Agregar listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Iniciar el timer
    resetTimer()

    // Limpiar al desmontar
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [enabled, handleActivity, resetTimer])

  // Retornar función para resetear manualmente el timer
  return {
    resetTimer: handleActivity,
    getLastActivity: () => lastActivityRef.current,
    getTimeUntilIdle: () => {
      const elapsed = Date.now() - lastActivityRef.current
      return Math.max(0, timeout - elapsed)
    },
  }
}

