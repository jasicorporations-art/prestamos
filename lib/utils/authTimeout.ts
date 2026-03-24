/**
 * Timeout y mapeo de errores para flujo de autenticación.
 * Evita que login o verificación de sesión queden colgados en PWA/Android.
 */

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T | (() => T),
  label?: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (process.env.NODE_ENV === 'development' && label) {
        console.warn(`[authTimeout] ${label} agotado tras ${ms}ms`)
      }
      try {
        resolve(typeof fallback === 'function' ? (fallback as () => T)() : fallback)
      } catch (e) {
        reject(e)
      }
    }, ms)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

/** Detecta si el error es de red (fetch fallido, sin conexión). */
export function isNetworkError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? '')
  return (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Load failed') ||
    msg.includes('network') ||
    msg.includes('Network request failed') ||
    (typeof navigator !== 'undefined' && !navigator.onLine && msg.length > 0)
  )
}

/** Detecta si el error es de sesión/token inválido o expirado. */
export function isSessionError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? '')
  return (
    msg.includes('session missing') ||
    msg.includes('Auth session missing') ||
    msg.includes('invalid claim') ||
    msg.includes('JWT') ||
    msg.includes('token') ||
    msg.includes('refresh_token')
  )
}

/**
 * Devuelve un mensaje de error claro para el usuario (login, AuthGuard, etc.).
 * Sustituye genéricos como "revise la conexión" por mensajes específicos.
 */
export function mapAuthErrorMessage(error: unknown, context: 'login' | 'guard' | 'session'): string {
  const msg = String((error as { message?: string })?.message ?? '')
  if (isNetworkError(error) || msg.includes('fetch') || msg.includes('timeout')) {
    return 'No se pudo conectar al servidor. Comprueba tu conexión a internet e intenta de nuevo.'
  }
  if (isSessionError(error) || msg.includes('session') || msg.includes('Auth session')) {
    return 'La sesión no pudo validarse. Inicia sesión de nuevo.'
  }
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'Usuario o contraseña incorrectos.'
  }
  if (msg.includes('Email not confirmed')) {
    return 'Debes confirmar tu correo antes de iniciar sesión.'
  }
  if (msg.includes('perfil') || msg.includes('profile') || msg.includes('PGRST116')) {
    return 'No se pudo cargar tu perfil. Contacta al administrador.'
  }
  if (msg.includes('empresa') || msg.includes('company')) {
    return 'No se pudo cargar tu empresa. Contacta al administrador.'
  }
  if (msg.includes('Timeout') || msg.includes('timeout') || msg.includes('tardando')) {
    return context === 'login'
      ? 'El servidor tardó en responder. Intenta de nuevo en unos segundos.'
      : 'La verificación de sesión tardó demasiado. Intenta de nuevo.'
  }
  if (msg.includes('Acceso no autorizado') || msg.includes('denegado')) {
    return msg
  }
  if (msg.trim()) return msg
  return context === 'login'
    ? 'Error al iniciar sesión. Intenta de nuevo.'
    : 'No se pudo verificar la sesión. Inicia sesión de nuevo.'
}
