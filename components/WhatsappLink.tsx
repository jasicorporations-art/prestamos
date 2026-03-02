'use client'

import { useState } from 'react'
import { useCompania } from '@/lib/contexts/CompaniaContext'
import { Button } from '@/components/Button'

/**
 * Llama a la API de obtener QR. instanceName = ID de empresa (compania).
 * La API debe devolver { qr: string } donde qr es base64 (o data URL) de la imagen.
 */
async function obtenerQR(instanceName: string): Promise<{ qr: string }> {
  const res = await fetch('/api/whatsapp/obtener-qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instanceName }),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || `Error ${res.status}`)
  }
  const data = (await res.json()) as { qr?: string }
  if (!data.qr || typeof data.qr !== 'string') {
    throw new Error('La API no devolvió un código QR')
  }
  return { qr: data.qr }
}

function dataUrlFromBase64(base64: string): string {
  const trimmed = base64.trim()
  if (trimmed.startsWith('data:')) return trimmed
  return `data:image/png;base64,${trimmed}`
}

export function WhatsappLink() {
  const { compania, loading: companiaLoading } = useCompania()
  const [loading, setLoading] = useState(false)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerarQR = async () => {
    if (!compania?.trim()) {
      setError('No hay empresa en sesión. Inicia sesión con una cuenta con empresa asignada.')
      return
    }
    setError(null)
    setQrImage(null)
    setLoading(true)
    try {
      const { qr } = await obtenerQR(compania.trim())
      setQrImage(dataUrlFromBase64(qr))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al obtener el código QR')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        onClick={handleGenerarQR}
        disabled={companiaLoading || loading || !compania}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
            Generando...
          </span>
        ) : (
          'Generar Código QR'
        )}
      </Button>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading && !qrImage && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8">
          <span className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" aria-hidden />
          <span className="mt-3 text-sm text-gray-600">Cargando código QR...</span>
        </div>
      )}

      {qrImage && !loading && (
        <div className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-4">
          <img
            src={qrImage}
            alt="Código QR para vincular WhatsApp"
            className="max-h-64 w-auto object-contain"
          />
          <p className="mt-2 text-sm text-gray-600">Escanea con WhatsApp para vincular</p>
        </div>
      )}
    </div>
  )
}
