'use client'

import { useState, useEffect, useRef } from 'react'

const VERIFY_TIMEOUT_MS = 4000
const VERIFY_DEBOUNCE_MS = 800

/**
 * Verifica conectividad real con una petición (navigator.onLine puede ser falso con VPN/proxy).
 * Usa la propia app para evitar CORS.
 */
async function verifyConnection(): Promise<boolean> {
  if (typeof window === 'undefined') return true
  try {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), VERIFY_TIMEOUT_MS)
    await fetch(window.location.origin, { method: 'HEAD', signal: c.signal, cache: 'no-store' })
    clearTimeout(t)
    return true
  } catch {
    return false
  }
}

/**
 * Hook para detectar el estado de conexión a internet.
 * Si navigator.onLine es false, verifica con una petición real para evitar falsos "modo offline".
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)
  const verifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const updateOnlineStatus = (browserOnline: boolean) => {
      if (browserOnline) {
        setIsOnline(true)
        if (wasOffline) {
          setWasOffline(false)
          console.log('🌐 Conexión restaurada - iniciando sincronización...')
          window.dispatchEvent(new CustomEvent('online-restored'))
        }
        return
      }

      // navigator.onLine es false: puede ser real o falso (VPN, proxy). Verificar con una petición.
      if (verifyTimeoutRef.current) {
        clearTimeout(verifyTimeoutRef.current)
      }
      verifyTimeoutRef.current = setTimeout(async () => {
        verifyTimeoutRef.current = null
        const reallyOnline = await verifyConnection()
        setIsOnline(reallyOnline)
        if (!reallyOnline) {
          setWasOffline(true)
          console.log('📴 Sin conexión - modo offline activado')
        }
      }, VERIFY_DEBOUNCE_MS)
    }

    const handleOnline = () => updateOnlineStatus(true)
    const handleOffline = () => updateOnlineStatus(false)

    // Estado inicial: si el navegador dice online, confiar; si dice offline, verificar
    if (navigator.onLine) {
      setIsOnline(true)
    } else {
      updateOnlineStatus(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      if (verifyTimeoutRef.current) clearTimeout(verifyTimeoutRef.current)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  return { isOnline, wasOffline }
}
