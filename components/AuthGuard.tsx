'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authService } from '@/lib/services/auth'
import { perfilesService } from '@/lib/services/perfiles'
import { evaluarAceptacionLegal } from '@/lib/services/legal'
import { subscriptionService } from '@/lib/services/subscription'
import { verificarSesionValida, haySesionEnOtroDispositivo, actualizarActividad, cerrarSesionActiva } from '@/lib/services/sesiones'
import { useIdleTimeout } from '@/lib/hooks/useIdleTimeout'
import { getAppId } from '@/lib/utils/appId'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [subscriptionActive, setSubscriptionActive] = useState(true)

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null

    // Si está en una página pública, no verificar autenticación
    const isPublicPage = pathname === '/login' || pathname === '/register' || pathname === '/' || pathname === '/landing' || pathname === '/precios' || pathname === '/recuperar-contrasena' || pathname === '/actualizar-contrasena' || pathname === '/recuperar-contrasena' || pathname === '/actualizar-contrasena'
    const isLegalAcceptancePage = pathname === '/aceptacion-legal'
    
    if (isPublicPage) {
      setLoading(false)
      setAuthenticated(false)
    } else {
      const AUTH_CHECK_TIMEOUT_MS = 15000
      const timeoutId = setTimeout(() => {
        setLoading(false)
        setAuthenticated(false)
        router.push('/login?error=Timeout%20verificando%20sesión')
      }, AUTH_CHECK_TIMEOUT_MS)

      const checkAuth = async () => {
        try {
          const session = await authService.getSession()
          if (session) {
            const user = await authService.getCurrentUser()
            
            // NOTA: Las verificaciones de sesión se hacen solo periódicamente para evitar bucles
            // Solo actualizar actividad si hay una sesión activa registrada
            if (user?.id) {
              try {
                const { obtenerSesionActiva } = await import('@/lib/services/sesiones')
                const currentSession = obtenerSesionActiva(user.id)
                if (currentSession) {
                  actualizarActividad(user.id)
                }
              } catch (error) {
                // Error silencioso - no bloquear la autenticación
              }
            }
            
            setAuthenticated(true)

            let perfil = await perfilesService.getPerfilActual()
            // Si el usuario tiene rol Vendedor, puede ser el primer usuario: intentar asegurar Admin (respaldo si falló en registro)
            if (perfil?.rol === 'Vendedor') {
              try {
                const session = await authService.getSession()
                const token = (session as { access_token?: string })?.access_token
                const headers: Record<string, string> = { 'Content-Type': 'application/json' }
                if (token) headers['Authorization'] = `Bearer ${token}`
                const res = await fetch('/api/registro-asegurar-admin', { method: 'POST', credentials: 'include', headers })
                if (res.ok) {
                  const data = await res.json().catch(() => ({}))
                  if ((data as { actualizado?: boolean; creado?: boolean }).actualizado || (data as { creado?: boolean }).creado) {
                    const { invalidatePerfilCache } = await import('@/lib/services/perfiles')
                    invalidatePerfilCache()
                    perfil = await perfilesService.getPerfilActual()
                  }
                }
              } catch {
                // Ignorar: no bloquear la app
              }
            }
            if (pathname === '/super-admin') {
              if (perfil?.rol !== 'super_admin') {
                router.push('/dashboard')
                return
              }
            }
            const appId = getAppId()
            const appIdValido = !appId || perfil?.rol === 'super_admin' || !perfil?.app_id || perfil.app_id === appId
            if (!appIdValido) {
              await authService.signOut()
              router.push('/login?error=Acceso%20no%20autorizado%20para%20esta%20plataforma')
              return
            }
            const estadoLegal = evaluarAceptacionLegal(perfil)
            if (!estadoLegal.actualizado && !isLegalAcceptancePage) {
              router.push('/aceptacion-legal')
              return
            }
            
            // Super-admin: no exigir suscripción activa en /super-admin
            if (pathname === '/super-admin') {
              setSubscriptionActive(true)
            }
            // Verificar si la suscripción está activa (excepto en páginas públicas)
            try {
              const isActive = pathname === '/super-admin' ? true : await subscriptionService.isActive()
              if (pathname !== '/super-admin') setSubscriptionActive(isActive)
              
              if (!isActive) {
                // Verificar si es trial expirado
                const trialInfo = await subscriptionService.getTrialInfo()
                if (trialInfo.isTrial && trialInfo.daysRemaining === 0) {
                  // Si el trial expiró, redirigir a precios con mensaje específico
                  router.push('/precios?trial_expired=true')
                } else {
                  // Si la suscripción no está activa, redirigir a precios
                  router.push('/precios?subscription_inactive=true')
                }
                return
              }
            } catch (error) {
              console.error('Error verificando suscripción:', error)
              // En caso de error, permitir acceso (no bloquear)
            }
          } else {
            setAuthenticated(false)
            // Redirigir a login si no está autenticado
            router.push('/login')
          }
        } catch (error: any) {
          // Si es un error de sesión faltante, es normal (no hay sesión)
          if (error?.message?.includes('session missing') || error?.message?.includes('Auth session missing')) {
            setAuthenticated(false)
            router.push('/login')
          } else {
            console.error('Error verificando autenticación:', error)
            setAuthenticated(false)
            router.push('/login')
          }
        } finally {
          clearTimeout(timeoutId)
          setLoading(false)
        }
      }

      checkAuth()
    }

    // Escuchar cambios en el estado de autenticación
    // NOTA: No registramos sesiones aquí para evitar bucles. Las sesiones solo se registran en el login.
    try {
      const authData = authService.onAuthStateChange(async (user) => {
        if (user) {
          // Solo actualizar estado de autenticación, NO registrar nueva sesión
          // Las sesiones solo se registran explícitamente en el proceso de login
          setAuthenticated(true)
        } else {
          // Cerrar sesión activa cuando el usuario cierra sesión
          try {
            const currentUser = await authService.getCurrentUser()
            if (currentUser?.id) {
              const { cerrarSesionActiva } = await import('@/lib/services/sesiones')
              cerrarSesionActiva(currentUser.id)
            }
          } catch (error) {
            console.error('Error cerrando sesión activa:', error)
          }
          setAuthenticated(false)
          if (pathname !== '/login' && pathname !== '/register' && pathname !== '/' && pathname !== '/landing' && pathname !== '/recuperar-contrasena' && pathname !== '/actualizar-contrasena') {
            router.push('/login')
          }
        }
      })
      // onAuthStateChange devuelve { subscription }
      subscription = authData?.subscription || null
    } catch (error) {
      console.warn('Error configurando listener de autenticación:', error)
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [router, pathname])

  // Determinar si es página pública (debe estar antes de los hooks)
  const isPublicPage = pathname === '/login' || pathname === '/register' || pathname === '/' || pathname === '/landing' || pathname === '/precios' || pathname === '/recuperar-contrasena' || pathname === '/actualizar-contrasena'

  // Hook para monitorear inactividad y cerrar sesión automáticamente (30 minutos)
  // Debe estar antes de cualquier return condicional
  useIdleTimeout({
    timeout: 30 * 60 * 1000, // 30 minutos
    enabled: authenticated && !isPublicPage && subscriptionActive,
    onIdle: async () => {
      // Cerrar sesión activa
      try {
        const user = await authService.getCurrentUser()
        if (user?.id) {
          cerrarSesionActiva(user.id)
        }
      } catch (error) {
        console.error('Error cerrando sesión activa:', error)
      }
    },
  })

  // Verificar periódicamente si hay otra sesión activa (cada 2 minutos)
  // Reducido frecuencia y simplificado para evitar bucles
  useEffect(() => {
    if (!authenticated || isPublicPage || !subscriptionActive) return

    const interval = setInterval(async () => {
      try {
        const user = await authService.getCurrentUser()
        if (!user?.id) return

        // Solo verificar si hay una sesión activa registrada
        const { obtenerSesionActiva } = require('@/lib/services/sesiones')
        const currentSession = obtenerSesionActiva(user.id)
        
        if (currentSession) {
          // Actualizar actividad solo si hay sesión válida
          actualizarActividad(user.id)
          
          // Verificación simplificada: solo si hay discrepancia real en IDs
          const currentSessionId = localStorage.getItem('active_session_id')
          const savedSessionId = localStorage.getItem(`user_active_session_${user.id}`)
          
          // Solo actuar si hay una discrepancia clara y la otra sesión es más reciente
          if (savedSessionId && savedSessionId !== currentSessionId) {
            const otherSessionData = localStorage.getItem(`session_${savedSessionId}`)
            if (otherSessionData) {
              try {
                const otherSession = JSON.parse(otherSessionData)
                // Solo cerrar si la otra sesión es significativamente más reciente (más de 5 segundos)
                if (otherSession.last_activity > currentSession.last_activity + 5000) {
                  console.warn('⚠️ [AuthGuard] Sesión más reciente detectada. Cerrando esta sesión.')
                  cerrarSesionActiva(user.id)
                  await authService.signOut()
                  alert('Tu sesión fue cerrada porque iniciaste sesión en otro dispositivo.')
                  router.push('/login')
                  router.refresh()
                }
              } catch {
                // Ignorar errores de parseo
              }
            }
          }
        }
      } catch (error) {
        // Error silencioso para no interrumpir la experiencia
      }
    }, 120000) // Verificar cada 2 minutos (menos frecuente)

    return () => clearInterval(interval)
  }, [authenticated, isPublicPage, subscriptionActive, router])
  
  // Si está en login, registro, landing o página principal, mostrar solo el contenido (sin navegación)
  if (isPublicPage) {
    return <>{children}</>
  }

  // Mostrar loading mientras verifica autenticación para páginas protegidas
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado y no está en páginas públicas, no mostrar nada (ya se redirigió)
  if (!authenticated) {
    return null
  }

  // Si la suscripción no está activa y no está en la página de precios, no mostrar contenido
  if (!subscriptionActive && pathname !== '/precios') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Suscripción Inactiva
            </h2>
            <p className="text-gray-600 mb-6">
              Tu suscripción no está activa. Por favor, renueva tu suscripción para continuar usando el sistema.
            </p>
            <button
              onClick={() => router.push('/precios')}
              className="px-6 py-3 bg-rose-600 text-white rounded-md hover:bg-rose-700 font-medium"
            >
              Ver Planes y Suscribirme
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Si está autenticado y la suscripción está activa, mostrar el contenido protegido
  return <>{children}</>
}

