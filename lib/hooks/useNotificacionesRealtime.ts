'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

/**
 * Notificaciones en tiempo real via Supabase Realtime.
 * Escucha INSERT en `pagos_pendientes_verificacion` filtrado por empresa_id.
 * Aislamiento multi-tenant garantizado — nunca mezcla datos entre empresas.
 */
export function useNotificacionesRealtime(empresaId: string | null) {
  const [nuevosComprobantes, setNuevosComprobantes] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!empresaId || empresaId.trim() === '') return

    let cancelled = false

    try {
      const client = getSupabaseClient()
      const channelName = `jasi-notif-pagos-${empresaId}`

      const channel = client
        .channel(channelName)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on('postgres_changes' as any, {
          event: 'INSERT',
          schema: 'public',
          table: 'pagos_pendientes_verificacion',
          filter: `id_empresa=eq.${empresaId}`,
        }, () => {
          if (!cancelled) setNuevosComprobantes((n) => n + 1)
        })
        .subscribe((status: string) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[NotifRealtime]', status, empresaId)
          }
        })

      channelRef.current = channel
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[NotifRealtime] fallo al suscribir:', err)
      }
    }

    return () => {
      cancelled = true
      try {
        if (channelRef.current) {
          getSupabaseClient().removeChannel(channelRef.current)
          channelRef.current = null
        }
      } catch { /* ignore */ }
    }
  }, [empresaId])

  const clearCount = useCallback(() => setNuevosComprobantes(0), [])

  return { nuevosComprobantes, clearCount }
}
