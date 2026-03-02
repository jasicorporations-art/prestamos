// Service Worker DESHABILITADO COMPLETAMENTE
// Este archivo ya no registra Service Workers
'use client'

import { useEffect } from 'react'

export function useServiceWorker() {
  useEffect(() => {
    // Service Worker completamente deshabilitado
    // NO registrar ningún Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Desregistrar cualquier Service Worker existente
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => {})
        })
      })
      console.log('🚫 Service Worker deshabilitado - no se registrará')
    }
  }, [])
}


