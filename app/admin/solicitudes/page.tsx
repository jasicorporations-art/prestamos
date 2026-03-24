'use client'

import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

type Solicitud = {
  id: string
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  monto_solicitado: number
  descripcion: string | null
  created_at: string
  datos_cliente: {
    cedula?: string
    nombre?: string
    telefono?: string
    ingresos?: number
    gastos?: number
  }
}

export default function AdminSolicitudesPage() {
  const [items, setItems] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/solicitudes', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Error cargando solicitudes')
      setItems(json.solicitudes || [])
    } catch (e) {
      console.error(e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function aprobar(id: string) {
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/solicitudes/${id}/aprobar`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'No se pudo aprobar')
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error aprobando solicitud')
    } finally {
      setSavingId(null)
    }
  }

  async function rechazar(id: string) {
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/solicitudes/${id}/rechazar`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'No se pudo rechazar')
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error rechazando solicitud')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <main className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Solicitudes Entrantes</h1>
        <button onClick={load} className="rounded-md border px-3 py-1.5 text-sm">Actualizar</button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-600">Cargando solicitudes...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-600">No hay solicitudes.</div>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <div key={s.id} className="rounded-lg border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{s.datos_cliente?.nombre || 'Cliente sin nombre'}</p>
                <span className="text-xs rounded-full px-2 py-1 bg-gray-100 border">{s.estado}</span>
              </div>
              <p className="text-sm text-gray-700">Cedula: {s.datos_cliente?.cedula || '-'}</p>
              <p className="text-sm text-gray-700">Telefono: {s.datos_cliente?.telefono || '-'}</p>
              <p className="text-sm text-gray-700">Monto: RD$ {Number(s.monto_solicitado || 0).toLocaleString()}</p>
              {s.descripcion && <p className="text-sm text-gray-700">Detalle: {s.descripcion}</p>}
              {s.estado === 'pendiente' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => aprobar(s.id)}
                    disabled={savingId === s.id}
                    className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm disabled:opacity-60"
                  >
                    Aprobar y crear Cliente + Prestamo
                  </button>
                  <button
                    onClick={() => rechazar(s.id)}
                    disabled={savingId === s.id}
                    className="rounded-md bg-red-600 text-white px-3 py-1.5 text-sm disabled:opacity-60"
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
