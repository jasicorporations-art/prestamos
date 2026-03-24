'use client'

import { FormEvent, useState } from 'react'

type EstadoResp = {
  id: string
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  created_at: string
  monto_solicitado: number
  descripcion: string
}

export default function EstadoSolicitudPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estado, setEstado] = useState<EstadoResp | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setEstado(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    const cedula = String(fd.get('cedula') || '')
    const pin = String(fd.get('pin') || '')
    setLoading(true)
    try {
      const res = await fetch('/api/public/solicitudes/estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula, pin }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'No se pudo consultar')
      setEstado(json.solicitud as EstadoResp)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold">Consultar estado de solicitud</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <input name="cedula" required placeholder="Cedula" className="w-full border rounded-md px-3 py-2" />
          <input name="pin" required placeholder="PIN" className="w-full border rounded-md px-3 py-2" />
          <button type="submit" disabled={loading} className="rounded-md bg-primary-600 text-white py-2 px-4 disabled:opacity-60">
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </form>

        {error && <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</div>}
        {estado && (
          <div className="rounded-md border border-gray-200 p-4 space-y-1">
            <p className="text-sm text-gray-600">Estado actual</p>
            <p className="text-lg font-semibold">
              {estado.estado === 'pendiente' && 'Su solicitud esta en revision'}
              {estado.estado === 'aprobado' && 'Su solicitud ha sido Aprobada'}
              {estado.estado === 'rechazado' && 'Su solicitud fue Rechazada'}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
