'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function CartaSaldoClientePage() {
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
        if (!json?.carta_saldo_disponible) throw new Error('La carta de saldo solo está disponible cuando el préstamo está saldado')
        setData(json)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error')
      }
    }
    if (ventaId) load()
  }, [ventaId])

  if (error) return <main className="p-4 text-red-600">{error}</main>
  if (!data) return <main className="p-4 text-gray-600">Cargando carta de saldo...</main>

  const empresaNombre = data?.empresa?.nombre || 'JASICORPORATIONS'
  const empresaRnc = data?.empresa?.rnc || 'Pendiente'
  const empresaDireccion = data?.empresa?.direccion || 'Pendiente'
  const empresaTelefono = data?.empresa?.telefono || 'Pendiente'
  const clienteNombre = data?.cliente?.nombre_completo || 'N/A'
  const clienteCedula = data?.cliente?.cedula || 'N/A'
  const numeroPrestamo = data?.venta?.numero_prestamo || data?.venta?.id?.slice(0, 8) || 'N/A'
  const marca = data?.motor?.marca || 'N/A'
  const modelo = data?.motor?.modelo || ''
  const chasis = data?.motor?.numero_chasis || 'N/A'
  const fechaActual = new Date().toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const codigoSeguridad = `COD-${String(data?.venta?.id || '').slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`
  const textoCuerpo = `A QUIEN PUEDA INTERESAR:

Por medio de la presente, certificamos que el Sr./Sra. ${clienteNombre}, portador de la cédula ${clienteCedula}, ha cancelado en su totalidad el compromiso financiero correspondiente al préstamo:

Marca/Modelo: ${marca} ${modelo}
Chasis: ${chasis}
Préstamo No.: ${numeroPrestamo}

A la fecha, el cliente se encuentra libre de toda responsabilidad económica con nuestra institución respecto a este contrato.`

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="p-6 md:p-10 print:p-10">
          <header className="text-center">
            <h1 className="text-2xl font-bold tracking-wide text-slate-900">{empresaNombre}</h1>
            <p className="mt-2 text-sm text-slate-700">RNC/ID Fiscal: {empresaRnc}</p>
            <p className="text-sm text-slate-700">Dirección: {empresaDireccion}</p>
            <p className="text-sm text-slate-700">Teléfono: {empresaTelefono}</p>
          </header>

          <div className="my-6 border-t border-slate-300" />

          <section>
            <h2 className="text-center text-xl font-bold tracking-wider text-slate-900">CARTA DE SALDO</h2>
            <p className="mt-6 text-sm text-slate-800">Fecha: {fechaActual}</p>
          </section>

          <section className="mt-6 whitespace-pre-line text-[15px] leading-7 text-slate-800">
            {textoCuerpo}
          </section>

          <section className="mt-10 space-y-1 text-sm text-slate-700">
            <p>Firma Digital: Administración</p>
            <p>Administrador</p>
          </section>

          <section className="mt-8 space-y-1 text-xs text-slate-600">
            <p>Código de Seguridad: {codigoSeguridad}</p>
            <p>Fecha de Emisión: {fechaActual}</p>
          </section>

          <section className="mt-10 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Saldo pendiente actual: RD$ {Number(data.venta?.saldo_pendiente || 0).toLocaleString('es-DO')}
          </section>

          <div className="mt-8 flex flex-wrap gap-2 print:hidden">
            <button onClick={() => window.print()} className="rounded-md bg-primary-600 px-4 py-2 text-white">
              Descargar / Imprimir
            </button>
            <button onClick={() => router.back()} className="rounded-md border px-4 py-2">
              Volver
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
