'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function SolicitudPrestamoPage() {
  const params = useSearchParams()
  const empresaId = useMemo(() => (params.get('empresa_id') || '').trim(), [params])
  const empresaNombre = useMemo(() => (params.get('empresa') || '').trim(), [params])
  const [loading, setLoading] = useState(false)
  const [pin, setPin] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tipoPlazo, setTipoPlazo] = useState<'diario' | 'semanal' | 'quincenal' | 'mensual'>('mensual')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPin(null)
    if (!empresaId && !empresaNombre) {
      setError('Falta empresa_id o empresa en la URL')
      return
    }
    const formEl = e.currentTarget
    const fd = new FormData(formEl)
    if (empresaId) fd.set('empresa_id', empresaId)
    if (empresaNombre) fd.set('empresa', empresaNombre)
    setLoading(true)
    try {
      const res = await fetch('/api/public/solicitudes/create', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'No se pudo enviar la solicitud')
      setPin(String(json.pin))
      formEl.reset()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold">Solicitud de Prestamo</h1>
        <p className="text-sm text-gray-600">Complete el formulario. Su solicitud llegara directamente a la empresa seleccionada.</p>
        {!empresaId && !empresaNombre && (
          <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">
            URL invalida: agregue <code>empresa_id</code> o <code>empresa</code>, por ejemplo: <code>/solicitud-prestamo?empresa=jasi llc</code>
          </div>
        )}
        {error && <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</div>}
        {pin && (
          <div className="rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3">
            Solicitud enviada. Guarde su PIN para consultar estado: <strong>{pin}</strong>
          </div>
        )}

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="hidden" name="empresa_id" value={empresaId} />
          <input name="cedula" required placeholder="Cedula" className="border rounded-md px-3 py-2" />
          <input name="nombre" required placeholder="Nombre completo" className="border rounded-md px-3 py-2" />
          <input name="telefono" required placeholder="Telefono" className="border rounded-md px-3 py-2" />
          <input name="direccion" required placeholder="Direccion del cliente" className="border rounded-md px-3 py-2" />
          <input name="monto_solicitado" required type="number" min="1" step="0.01" placeholder="Monto solicitado" className="border rounded-md px-3 py-2" />
          <input name="ingresos" type="number" min="0" step="0.01" placeholder="Ingresos mensuales" className="border rounded-md px-3 py-2" />
          <input name="gastos" type="number" min="0" step="0.01" placeholder="Gastos mensuales" className="border rounded-md px-3 py-2" />
          <input name="cantidad_cuotas" required type="number" min="1" max="120" defaultValue={12} placeholder="Cantidad de cuotas" className="border rounded-md px-3 py-2" />
          <select
            name="tipo_plazo"
            value={tipoPlazo}
            onChange={(e) => setTipoPlazo(e.target.value as 'diario' | 'semanal' | 'quincenal' | 'mensual')}
            className="border rounded-md px-3 py-2"
          >
            <option value="diario">Pago diario</option>
            <option value="semanal">Pago semanal</option>
            <option value="quincenal">Pago quincenal</option>
            <option value="mensual">Pago mensual</option>
          </select>
          {tipoPlazo === 'semanal' && (
            <select name="dia_pago_semanal" required className="border rounded-md px-3 py-2">
              <option value="">Día de pago semanal</option>
              <option value="1">Lunes</option>
              <option value="2">Martes</option>
              <option value="3">Miércoles</option>
              <option value="4">Jueves</option>
              <option value="5">Viernes</option>
              <option value="6">Sábado</option>
              <option value="0">Domingo</option>
            </select>
          )}
          {tipoPlazo === 'quincenal' && (
            <input
              name="fecha_inicio_quincenal"
              type="date"
              required
              className="border rounded-md px-3 py-2"
              placeholder="Fecha de inicio quincenal"
            />
          )}
          <input name="nombre_garante" placeholder="Nombre del garante" className="border rounded-md px-3 py-2" />
          <input name="telefono_garante" placeholder="Telefono del garante" className="border rounded-md px-3 py-2" />
          <input name="direccion_garante" placeholder="Direccion del garante" className="md:col-span-2 border rounded-md px-3 py-2" />
          <textarea
            name="descripcion"
            required
            rows={4}
            placeholder="Para que necesita el dinero o que producto quiere financiar"
            className="md:col-span-2 border rounded-md px-3 py-2"
          />
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Foto de perfil del solicitante (obligatoria)</label>
            <input name="foto_perfil" type="file" required accept="image/*" className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Fotos del producto (maximo 3)</label>
            <input name="fotos" type="file" multiple accept="image/*" className="w-full border rounded-md px-3 py-2" />
          </div>
          <button
            type="submit"
            disabled={loading || (!empresaId && !empresaNombre)}
            className="md:col-span-2 rounded-md bg-primary-600 text-white py-2 px-4 disabled:opacity-60"
          >
            {loading ? 'Enviando solicitud...' : 'Enviar solicitud'}
          </button>
        </form>
      </div>
    </main>
  )
}
