'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, CreditCard } from 'lucide-react'
import { Button } from '@/components/Button'
import { authService } from '@/lib/services/auth'

export function WhatsAppCupoBanner() {
  const [estado, setEstado] = useState<{
    cupo_agotado: boolean
    mensaje?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    authService.getSession().then((session) => {
      const headers: Record<string, string> = {}
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      return fetch('/api/whatsapp-cupo', { credentials: 'include', headers })
    }).then((r) => (r?.ok ? r.json() : r.json().then(() => null)))
      .then((data) => {
        if (!cancelled) setEstado(data ?? null)
      })
      .catch(() => { if (!cancelled) setEstado(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function comprarExtension() {
    setCheckoutLoading(true)
    try {
      const session = await authService.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch('/api/create-checkout-whatsapp-extension', { method: 'POST', credentials: 'include', headers })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`)
      if (data.url) window.location.href = data.url
      else throw new Error(data.error || 'No se recibió URL de pago')
    } catch (e) {
      alert(`Error: ${e instanceof Error ? e.message : 'Error al procesar el pago'}`)
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (loading || !estado?.cupo_agotado) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <MessageCircle className="w-8 h-8 text-amber-600 flex-shrink-0" />
        <div>
          <p className="font-medium text-amber-900">
            {estado.mensaje || 'Has agotado tus notificaciones mensuales.'}
          </p>
          <p className="text-sm text-amber-700 mt-0.5">
            Para continuar enviando recibos y recordatorios ahora mismo, puedes adquirir un Paquete de Extensión de 200 Notificaciones.
          </p>
        </div>
      </div>
      <Button
        onClick={comprarExtension}
        disabled={checkoutLoading}
        className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
      >
        {checkoutLoading ? (
          <span className="animate-pulse">Procesando...</span>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2 inline" />
            Adquirir Paquete de Extensión
          </>
        )}
      </Button>
    </div>
  )
}
