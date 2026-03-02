'use client'

import { useEffect } from 'react'

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (typeof window !== 'undefined' && window.innerWidth < 768)
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const onLoad = () => {
      if (isMobileDevice()) {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            registration.update()
            console.log('SW registrado con éxito:', registration.scope)
          })
          .catch((err) => {
            console.log('Fallo en registro de SW:', err)
          })
      } else {
        // En escritorio: desregistrar SW para evitar bloqueos de login
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((reg) => reg.unregister())
          if (registrations.length) console.log('SW desregistrado en escritorio (login sin bloqueos)')
        })
      }
    }

    if (document.readyState === 'complete') {
      onLoad()
    } else {
      window.addEventListener('load', onLoad)
      return () => window.removeEventListener('load', onLoad)
    }
  }, [])

  return null
}
