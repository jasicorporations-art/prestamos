'use client'

import { useState, useEffect, useCallback } from 'react'
import { obtenerResumenMora } from '@/lib/services/reporteMora'

/**
 * Hook que devuelve el número de clientes en mora/atraso para mostrar en notificaciones.
 * Se actualiza al montar y cada 2 minutos (o al llamar refresh).
 */
export function useMoraCount(enabled = true): { count: number; loading: boolean; refresh: () => void } {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const resumen = await obtenerResumenMora()
      setCount(resumen.totalClientesEnAtraso)
    } catch (e) {
      console.warn('Error obteniendo conteo de mora:', e)
      setCount(0)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Refrescar cada 2 minutos
  useEffect(() => {
    if (!enabled) return
    const interval = setInterval(refresh, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [enabled, refresh])

  return { count, loading, refresh }
}
