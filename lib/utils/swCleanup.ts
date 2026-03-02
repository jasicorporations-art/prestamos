/**
 * Utilidad para limpiar datos sensibles al cerrar sesión.
 * - Notifica al Service Worker para limpiar caches
 * - Limpia localStorage de sesión (active_session_id, session_*, etc.)
 * Se ejecuta automáticamente en authService.signOut (manual y auto-logout por inactividad).
 */

const SESSION_KEYS_PREFIX = ['active_session_id', 'active_user_id', 'user_active_session_', 'session_', 'jasi_clientes_cache']
const ADDITIONAL_KEYS = ['offline_pending_operations']
// No borramos compania_actual: es conveniencia para el próximo login

/**
 * Limpia datos sensibles de sesión en localStorage
 */
export function limpiarDatosSensiblesLocalStorage(): void {
  if (typeof window === 'undefined') return

  try {
    const keys = Object.keys(localStorage)
    for (const key of keys) {
      const shouldRemove =
        SESSION_KEYS_PREFIX.some((p) => key === p || key.startsWith(p)) ||
        ADDITIONAL_KEYS.includes(key)
      if (shouldRemove) {
        localStorage.removeItem(key)
      }
    }
    console.log('[swCleanup] Datos sensibles de localStorage limpiados')
  } catch (e) {
    console.warn('[swCleanup] Error limpiando localStorage:', e)
  }
}

/**
 * Notifica al Service Worker que limpie caches (al cerrar sesión)
 */
export function notificarSWHacerLimpieza(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  try {
    const controller = navigator.serviceWorker.controller
    if (controller) {
      controller.postMessage({ type: 'clearSensitiveData' })
      console.log('[swCleanup] SW notificado para limpiar caches')
    }
  } catch (e) {
    console.warn('[swCleanup] Error notificando SW:', e)
  }
}

/**
 * Ejecuta la limpieza completa: localStorage + notificación SW
 */
export function ejecutarLimpiezaSesion(): void {
  limpiarDatosSensiblesLocalStorage()
  notificarSWHacerLimpieza()
}

/**
 * Limpia TODOS los datos que pueden causar problemas al iniciar sesión.
 * Útil cuando el login se queda cargando en el navegador normal pero funciona en incógnito.
 * Limpia: Supabase auth, sesiones, cachés, y recarga la página.
 */
export function limpiarSesionParaReintentarLogin(): void {
  if (typeof window === 'undefined') return

  try {
    const keys = Object.keys(localStorage)
    for (const key of keys) {
      const shouldRemove =
        key.startsWith('sb-') || // Supabase auth (sb-*-auth-token)
        key.startsWith('jasi-') || // Nuestra auth (jasi-prestamos-auth) y cachés
        key.startsWith('active_session') ||
        key.startsWith('active_user') ||
        key.startsWith('user_active_session') ||
        key.startsWith('session_') ||
        key === 'device_id' ||
        key === 'compania_actual' ||
        key === 'offline_pending_operations' ||
        key.startsWith('jasi_clientes_cache')
      if (shouldRemove) {
        localStorage.removeItem(key)
      }
    }
    sessionStorage.clear()
    notificarSWHacerLimpieza()
    console.log('[swCleanup] Sesión limpiada para reintentar login. Recargando...')
    window.location.href = '/login'
  } catch (e) {
    console.warn('[swCleanup] Error limpiando sesión:', e)
    window.location.href = '/login'
  }
}
