'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, CheckCircle, RefreshCw, Smartphone } from 'lucide-react'
import { Button } from '@/components/Button'
import { authService } from '@/lib/services/auth'

function dataUrlFromBase64(base64: string): string {
  const t = base64.trim()
  if (t.startsWith('data:')) return t
  return `data:image/png;base64,${t}`
}

export default function WhatsappConnectionsPage() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [planWhatsapp, setPlanWhatsapp] = useState<boolean>(false)
  const [qr, setQr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrLoading, setQrLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchState() {
    setError(null)
    setLoading(true)
    try {
      const session = await authService.getSession()
      const headers: Record<string, string> = {}
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch('/api/evolution/connection-state', { headers })
      const data = await res.json().catch(() => ({}))
      setConnected(!!data.connected)
      setPlanWhatsapp(!!data.plan_whatsapp)
      if (!res.ok) setError(data.error || `Error ${res.status}`)
    } catch (e) {
      setConnected(false)
      setPlanWhatsapp(false)
      setError(e instanceof Error ? e.message : 'Error al verificar estado')
    } finally {
      setLoading(false)
    }
  }

  async function generarQR() {
    setError(null)
    setQr(null)
    setQrLoading(true)
    try {
      const session = await authService.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch('/api/evolution/obtener-qr', { method: 'POST', headers, credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`)
        return
      }
      if (data.qr) setQr(dataUrlFromBase64(data.qr))
      setTimeout(fetchState, 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al obtener QR')
    } finally {
      setQrLoading(false)
    }
  }

  useEffect(() => {
    fetchState()
  }, [])

  if (loading && connected === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4" />
          <p className="text-gray-500">Verificando conexión WhatsApp...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <MessageCircle className="w-8 h-8 text-green-600" />
          Conexión WhatsApp
        </h1>
        <p className="text-gray-600">
          Vincula tu WhatsApp Business con Evolution API (Railway) para enviar recibos y tablas de amortización automáticamente.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {!planWhatsapp && (
        <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl text-center">
          <p className="text-lg font-semibold text-gray-900 mb-1">
            Activa WhatsApp Premium para escanear el QR
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Tu empresa debe tener <strong>whatsapp_premium = true</strong> en Supabase para generar el código QR y vincular tu WhatsApp. Contacta al administrador para activar el plan.
          </p>
        </div>
      )}

      {connected === true ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Conectado</h2>
          <p className="text-gray-600 mb-6">
            Tu WhatsApp está vinculado. Los mensajes de amortización y recibos se enviarán automáticamente a tus clientes.
          </p>
          <Button variant="outline" onClick={fetchState}>
            <RefreshCw className="w-4 h-4 mr-2 inline" />
            Actualizar estado
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-6 h-6 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Vincular WhatsApp</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Escanea el código QR con tu WhatsApp (dispositivo principal o Business) para conectar.
          </p>
          <Button
            onClick={generarQR}
            disabled={qrLoading || !planWhatsapp}
            className="mb-6"
          >
            {qrLoading ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                Generando QR...
              </>
            ) : !planWhatsapp ? (
              <>WhatsApp Premium requerido para generar QR</>
            ) : (
              <>Generar código QR</>
            )}
          </Button>
          {qr && (
            <div className="flex flex-col items-center rounded-lg border border-gray-200 bg-gray-50 p-6">
              <img
                src={qr}
                alt="QR para vincular WhatsApp"
                className="max-h-64 w-auto object-contain"
              />
              <p className="mt-3 text-sm text-gray-600">Escanea con WhatsApp para vincular</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
