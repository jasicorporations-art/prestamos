/**
 * Utilidades de geolocalización para JASIPRESTAMOS.
 * GPS requerido para registrar cobros (ubicación del cobrador).
 */

const TIMEOUT_MS = 15000 // 15s para enableHighAccuracy en exteriores

export interface Coordenadas {
  lat: number
  lng: number
}

export type GeolocationPermission = 'granted' | 'denied' | 'prompt' | 'unsupported'

export interface GeolocationError {
  code: number
  message: string
  userDenied?: boolean
}

/**
 * Verifica si la app está en un contexto seguro (HTTPS).
 * El GPS no funciona sin HTTPS en navegadores modernos.
 */
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return false
  return window.isSecureContext
}

/**
 * Verifica el estado del permiso de ubicación.
 * Retorna 'unsupported' si geolocation no está disponible.
 */
export function checkGeolocationPermission(): Promise<GeolocationPermission> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve('unsupported')
      return
    }
    if (!('permissions' in navigator)) {
      resolve('prompt')
      return
    }
    navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(
      (result) => {
        if (result.state === 'granted') resolve('granted')
        else if (result.state === 'denied') resolve('denied')
        else resolve('prompt')
      },
      () => resolve('prompt')
    )
  })
}

/**
 * Solicita y obtiene la ubicación actual con alta precisión (GPS).
 * Usa enableHighAccuracy: true para cobradores en la calle.
 */
export function getLocationWithTimeout(timeoutMs: number = TIMEOUT_MS): Promise<Coordenadas | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }

    const timeoutId = setTimeout(() => {
      resolve(null)
    }, timeoutMs)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeoutId)
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      () => {
        clearTimeout(timeoutId)
        resolve(null)
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      }
    )
  })
}

/**
 * Solicita la ubicación y retorna detalles del error si falla.
 */
export function getLocationWithErrorHandling(
  timeoutMs: number = TIMEOUT_MS
): Promise<{ coords: Coordenadas } | { error: GeolocationError }> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ error: { code: 3, message: 'Geolocalización no disponible', userDenied: false } })
      return
    }

    const timeoutId = setTimeout(() => {
      resolve({ error: { code: 3, message: 'Tiempo de espera agotado', userDenied: false } })
    }, timeoutMs)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeoutId)
        resolve({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } })
      },
      (err) => {
        clearTimeout(timeoutId)
        const userDenied = err.code === 1
        const messages: Record<number, string> = {
          1: 'Permiso de ubicación denegado',
          2: 'Ubicación no disponible',
          3: 'Tiempo de espera agotado',
        }
        resolve({
          error: {
            code: err.code,
            message: messages[err.code] || err.message || 'Error al obtener ubicación',
            userDenied,
          },
        })
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      }
    )
  })
}

/** URL de Google Maps para navegación: https://www.google.com/maps?q=lat,lng */
export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`
}
