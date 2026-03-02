'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { solicitudesService } from '@/lib/services/solicitudes'

/**
 * Hook que devuelve el conteo de solicitudes pendientes de aprobación
 * y se actualiza en tiempo real mediante suscripciones de Supabase.
 */
export function usePendientesAprobacion(enabled = true): number {
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!enabled) return
    try {
      const n = await solicitudesService.getContadorPendientes()
      setCount(n)
    } catch (e) {
      console.warn('Error obteniendo pendientes:', e)
    }
  }, [enabled])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel('pendientes-aprobacion')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ventas' },
        () => refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitudes_cambio' },
        () => refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, refresh])

  return count
}
