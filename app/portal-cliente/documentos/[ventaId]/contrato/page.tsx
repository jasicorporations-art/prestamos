'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

function addByPlazo(base: Date, index: number, tipo: string) {
  const d = new Date(base)
  if (tipo === 'diario') d.setDate(d.getDate() + index)
  else if (tipo === 'semanal') d.setDate(d.getDate() + index * 7)
  else if (tipo === 'quincenal') d.setDate(d.getDate() + index * 15)
  else d.setMonth(d.getMonth() + index)
  return d
}

export default function ContratoClientePage() {
  const params = useParams()
  const router = useRouter()
  const ventaId = params.ventaId as string
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public/cliente-portal/documentos/${ventaId}`, { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'No disponible')
        setData(json)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error')
      }
    }
    if (ventaId) load()
  }, [ventaId])

  if (error) return <main className="p-4 text-red-600">{error}</main>
  if (!data) return <main className="p-4 text-gray-600">Cargando contrato...</main>

  const cuotas = Array.isArray(data?.cuotas) ? data.cuotas : []
  const tasa = Number(data?.venta?.porcentaje_interes || 0)
  const valorCuota = cuotas[0]?.cuota_fija || (Number(data?.venta?.monto_total || 0) / Math.max(1, Number(data?.venta?.cantidad_cuotas || 1)))
  const pagoInicial = Number(data?.pago_inicial || 0)
  const montoTotal = Number(data?.venta?.monto_total || 0)
  const montoFinanciado = Math.max(0, montoTotal - pagoInicial)
  const tipoPlazoLabel = data?.venta?.tipo_plazo === 'semanal'
    ? 'Semanal'
    : data?.venta?.tipo_plazo === 'quincenal'
      ? 'Quincenal'
      : data?.venta?.tipo_plazo === 'diario'
        ? 'Diario'
        : 'Mensual'
  const planFallback = Array.from({ length: Math.max(0, Number(data?.venta?.cantidad_cuotas || 0)) }).map((_, i) => {
    const fecha = addByPlazo(new Date(data?.venta?.fecha_venta || Date.now()), i + 1, data?.venta?.tipo_plazo || 'mensual')
    return {
      numero_cuota: i + 1,
      fecha_pago: fecha.toISOString(),
      cuota_fija: valorCuota,
    }
  })
  const planPagos = cuotas.length > 0 ? cuotas : planFallback

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto bg-white border rounded-xl p-6 space-y-4 print:shadow-none">
        <h1 className="text-xl font-bold text-center">CONTRATO DE VENTA CONDICIONAL Y FINANCIAMIENTO</h1>
        <p className="text-center text-sm">Fecha: {new Date().toLocaleDateString('es-DO')}</p>
        <hr />

        <h2 className="font-semibold">PARTES DEL CONTRATO</h2>
        <p><strong>POR LA EMPRESA:</strong> {data.empresa?.nombre || '-'}</p>
        <p><strong>RNC:</strong> {data.empresa?.rnc || 'Pendiente'} · <strong>Teléfono:</strong> {data.empresa?.telefono || 'Pendiente'}</p>
        <p><strong>Dirección:</strong> {data.empresa?.direccion || 'Pendiente'}</p>
        <p><strong>Representante Legal:</strong> Pendiente</p>
        <p><strong>POR EL CLIENTE (DEUDOR):</strong> {data.cliente?.nombre_completo || '-'} ({data.cliente?.cedula || '-'})</p>
        <p><strong>Dirección:</strong> {data.cliente?.direccion || '-'} · <strong>Teléfono:</strong> {data.cliente?.celular || '-'}</p>
        <p><strong>POR EL GARANTE (FIADOR SOLIDARIO):</strong> {data.cliente?.nombre_garante || 'No especificado'}</p>
        <p><strong>Teléfono garante:</strong> {data.cliente?.telefono_garante || 'No especificado'} · <strong>Dirección garante:</strong> {data.cliente?.direccion_garante || 'No especificado'}</p>

        <h2 className="font-semibold pt-2">ARTÍCULO OBJETO DEL FINANCIAMIENTO</h2>
        <p><strong>Marca:</strong> {data.motor?.marca || 'N/A'} · <strong>Modelo:</strong> {data.motor?.modelo || 'N/A'} · <strong>Serie:</strong> {data.motor?.numero_chasis || 'N/A'}</p>

        <h2 className="font-semibold pt-2">TÉRMINOS DEL FINANCIAMIENTO</h2>
        <p><strong>Préstamo:</strong> {data.venta?.numero_prestamo || data.venta?.id?.slice(0, 8)}</p>
        <p><strong>Monto Total:</strong> RD$ {montoTotal.toLocaleString('es-DO')}</p>
        <p><strong>Pago Inicial:</strong> RD$ {pagoInicial.toLocaleString('es-DO')} · <strong>Monto Financiado:</strong> RD$ {montoFinanciado.toLocaleString('es-DO')}</p>
        <p><strong>Tasa:</strong> {tasa}% por período · <strong>Método:</strong> {data.venta?.metodo_interes || 'fijo'}</p>
        <p><strong>Cantidad de Cuotas:</strong> {data.venta?.cantidad_cuotas || 0} · <strong>Tipo de Plazo:</strong> {tipoPlazoLabel} · <strong>Valor por Cuota:</strong> RD$ {Number(valorCuota || 0).toLocaleString('es-DO')}</p>

        <hr />
        <h2 className="font-semibold">CLÁUSULAS Y CONDICIONES</h2>
        <ol className="text-sm text-gray-700 list-decimal pl-5 space-y-1">
          <li>Mora: recargo de 3.7% mensual sobre la cuota vencida.</li>
          <li>Gastos de cierre y administrativos incluidos según condiciones de emisión.</li>
          <li>Incautación: ante incumplimiento, la empresa puede recuperar el artículo financiado.</li>
          <li>Propiedad: permanece en la empresa hasta la cancelación total.</li>
          <li>El garante responde solidariamente por las obligaciones del deudor.</li>
        </ol>

        <h2 className="font-semibold pt-2">Plan de pagos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">#</th>
                <th>Fecha</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {planPagos.length > 0 ? planPagos.map((c: any) => (
                <tr key={`cuota-${c.numero_cuota}`} className="border-b">
                  <td className="py-2">{c.numero_cuota}</td>
                  <td>{c.fecha_pago ? new Date(c.fecha_pago).toLocaleDateString('es-DO') : '-'}</td>
                  <td>RD$ {Number(c.cuota_fija || 0).toLocaleString('es-DO')}</td>
                </tr>
              )) : (
                <tr><td className="py-2 text-gray-500" colSpan={3}>No hay plan de pagos detallado disponible.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-center text-sm">
          <div>
            <div className="border-t border-gray-400 pt-2">Firma Empresa</div>
          </div>
          <div>
            <div className="border-t border-gray-400 pt-2">Firma Deudor</div>
          </div>
          <div>
            <div className="border-t border-gray-400 pt-2">Firma Garante</div>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={() => window.print()} className="rounded-md bg-primary-600 text-white px-4 py-2">Descargar / Imprimir</button>
          <button onClick={() => router.back()} className="rounded-md border px-4 py-2">Volver</button>
        </div>
      </div>
    </main>
  )
}
