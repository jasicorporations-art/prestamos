'use client'

import { useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useNotificacionesRealtime } from '@/lib/hooks/useNotificacionesRealtime'

interface Props {
  empresaId: string | null
}

/**
 * Campana de notificaciones en tiempo real.
 * Badge rojo = nuevos comprobantes de pago del portal cliente pendientes de revisión.
 * Al hacer clic → navega a /admin/pagos-verificar y limpia el contador.
 */
export function NotifBell({ empresaId }: Props) {
  const router = useRouter()
  const { nuevosComprobantes, clearCount } = useNotificacionesRealtime(empresaId)
  const prevCountRef = useRef(0)

  // Solicitar permiso de notificaciones del navegador una sola vez
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => { /* usuario rechazó, ok */ })
    }
  }, [])

  // Mostrar notificación nativa cuando llega un comprobante nuevo
  useEffect(() => {
    const wasZero = prevCountRef.current === 0
    const creció = nuevosComprobantes > prevCountRef.current
    prevCountRef.current = nuevosComprobantes

    if (!creció || wasZero) return // no notificar al cargar la página

    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Nuevo comprobante de pago', {
          body: 'Un cliente notificó un pago. Toca para revisarlo.',
          tag: 'jasi-pago-portal',   // evita duplicados si llegan varios seguidos
        })
      }
    } catch { /* navegador sin soporte, silencioso */ }
  }, [nuevosComprobantes])

  function handleClick() {
    clearCount()
    router.push('/admin/pagos-verificar')
  }

  const hayNuevos = nuevosComprobantes > 0

  return (
    <button
      type="button"
      onClick={handleClick}
      title={
        hayNuevos
          ? `${nuevosComprobantes} comprobante${nuevosComprobantes !== 1 ? 's' : ''} nuevo${nuevosComprobantes !== 1 ? 's' : ''} por verificar`
          : 'Sin notificaciones nuevas'
      }
      aria-label="Notificaciones de pagos del portal"
      className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-gray-100"
    >
      <Bell
        className="w-5 h-5 transition-colors"
        style={{ color: hayNuevos ? '#dc2626' : '#9ca3af' }}
      />

      {hayNuevos && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-white text-[10px] font-black leading-none px-1 animate-pulse"
          style={{ background: '#dc2626', boxShadow: '0 0 0 2px #fff' }}
        >
          {nuevosComprobantes > 99 ? '99+' : nuevosComprobantes}
        </span>
      )}
    </button>
  )
}
