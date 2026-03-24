'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type ReciboData = {
  pago: { id: string; monto: number; fecha_pago: string; numero_cuota?: number | null; metodo_pago?: string | null; referencia?: string | null }
  venta: { id: string; numero_prestamo?: string | null; saldo_pendiente?: number | null }
  cliente?: { nombre_completo?: string | null; cedula?: string | null; celular?: string | null }
  motor?: { marca?: string | null; modelo?: string | null; numero_chasis?: string | null; numero_chasis_real?: string | null }
  empresa_nombre?: string | null
}

export default function PortalClienteReciboPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [data, setData] = useState<ReciboData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function run() {
      try {
        const res = await fetch(`/api/public/cliente-portal/recibo/${id}`, { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'No se pudo cargar recibo')
        setData(json)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error')
      }
    }
    if (id) run()
  }, [id])

  if (error) {
    return <main className="p-4 text-red-600">{error}</main>
  }
  if (!data) {
    return <main className="p-4 text-gray-600">Cargando recibo...</main>
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white border rounded-xl shadow-sm p-4 space-y-3">
        <h1 className="text-lg font-bold text-center">Recibo de Pago</h1>
        <p className="text-sm text-gray-600 text-center">{data.empresa_nombre || 'Empresa'}</p>
        <div className="text-sm space-y-1">
          <p><strong>No. Recibo:</strong> {data.pago.id.slice(0, 8).toUpperCase()}</p>
          <p><strong>Préstamo:</strong> {data.venta.numero_prestamo || data.venta.id.slice(0, 8)}</p>
          <p><strong>Cliente:</strong> {data.cliente?.nombre_completo || '-'} ({data.cliente?.cedula || '-'})</p>
          <p><strong>Artículo:</strong> {data.motor?.marca || '-'} {data.motor?.modelo || '-'} {data.motor?.numero_chasis_real || data.motor?.numero_chasis ? `· Serie: ${data.motor?.numero_chasis_real || data.motor?.numero_chasis}` : ''}</p>
          <p><strong>Fecha y hora:</strong> {new Date(data.pago.fecha_pago).toLocaleString('es-DO')}</p>
          <p><strong>Monto pagado:</strong> RD$ {Number(data.pago.monto || 0).toLocaleString('es-DO')}</p>
          <p><strong>Cuota aplicada:</strong> {data.pago.numero_cuota ?? 'Abono general'}</p>
          {data.pago.metodo_pago && <p><strong>Método de pago:</strong> {data.pago.metodo_pago}</p>}
          {data.pago.referencia && <p><strong>Referencia:</strong> {data.pago.referencia}</p>}
          <p><strong>Balance restante:</strong> RD$ {Number(data.venta?.saldo_pendiente || 0).toLocaleString('es-DO')}</p>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={() => window.print()} className="flex-1 rounded-md bg-primary-600 text-white py-2">Descargar / Imprimir PDF</button>
          <button onClick={() => router.back()} className="rounded-md border px-3 py-2">Volver</button>
        </div>
      </div>
    </main>
  )
}
