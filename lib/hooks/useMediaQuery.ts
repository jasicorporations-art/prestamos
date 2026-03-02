'use client'

import { useState, useEffect } from 'react'

/**
 * Hook que devuelve true si el viewport cumple la media query (ej: min-width: 768px).
 * Útil para comportamiento responsive (sidebar desktop vs móvil).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia(query)
    setMatches(media.matches)
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}
