'use client'

import { useState } from 'react'
import { Search, User, MapPin, Phone, Mail, Star, AlertTriangle, Scale, Shield, TrendingDown, TrendingUp, ChevronRight, CreditCard } from 'lucide-react'
import { Button } from '@/components/Button'
import { AvatarCliente } from '@/components/AvatarCliente'
import type { CreditoLocalResponse } from '@/app/api/admin/credito-local/route'
import { formatCurrency } from '@/lib/utils/currency'

export default function CreditoLocalPage() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CreditoLocalResponse | null>(null)

  async function handleSearch() {
    const value = input.trim()
    if (!value) {
      setError('Escribe el ID (UUID) o la cédula del cliente.')
      return
    }
    setError(null)
    setData(null)
    setLoading(true)
    try {
      const session = await import('@/lib/services/auth').then((m) => m.authService.getSession())
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const body: Record<string, string> = value.length <= 20 && !value.includes('-')
        ? { cedula: value }
        : { cliente_id: value }
      const res = await fetch('/api/admin/credito-local', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || 'Error al consultar.')
        return
      }
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  const ratingColor =
    !data ? '' :
    data.rating >= 4.5 ? 'text-green-600' :
    data.rating >= 3.5 ? 'text-amber-500' :
    'text-red-600'

  const ratingLabel =
    !data ? '' :
    data.rating >= 4.5 ? 'Bajo riesgo' :
    data.rating >= 3.5 ? 'Riesgo moderado' :
    'Alto riesgo'

  const ratingBg =
    !data ? '' :
    data.rating >= 4.5 ? 'bg-green-50 border-green-200' :
    data.rating >= 3.5 ? 'bg-amber-50 border-amber-200' :
    'bg-red-50 border-red-200'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Scale className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crédito Local</h1>
          <p className="text-sm text-gray-500 mt-0.5">Buró de crédito interno — historial del cliente en la red</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Consultar por cédula o ID de cliente
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Ej: 001-0000001-0 o UUID del cliente"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading}>
            <span className="inline-flex items-center gap-2">
              <Search className="h-4 w-4" />
              {loading ? 'Buscando...' : 'Buscar'}
            </span>
          </Button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <div className="flex gap-3 items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="h-4 bg-gray-200 rounded w-36" />
              </div>
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => <div key={i} className="w-8 h-8 bg-gray-200 rounded" />)}
              </div>
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 h-40" />
        </div>
      )}

      {/* No encontrado */}
      {data && !data.encontrado && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-amber-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>No se encontró ningún cliente con ese ID o cédula.</span>
        </div>
      )}

      {data?.encontrado && (
        <div className="space-y-5">

          {/* Banner mora */}
          {data.tieneDeudaEnMora && (
            <div className="flex items-center gap-3 rounded-2xl bg-red-50 border-2 border-red-300 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-red-900">Cliente con deuda en mora</p>
                <p className="text-sm text-red-700">Tiene cuotas vencidas activas en la red</p>
              </div>
            </div>
          )}

          {/* Perfil + Calificación */}
          <div className="grid gap-4 sm:grid-cols-2">

            {/* Datos del cliente */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-500" />
                <h2 className="font-semibold text-gray-800 text-sm">Datos del cliente</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <AvatarCliente
                    nombreCompleto={data.perfil.nombre || ''}
                    fotoUrl={data.perfil.foto_url ?? undefined}
                    size="lg"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{data.perfil.nombre || '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Cédula: {data.perfil.cedula || '—'}</p>
                  </div>
                </div>
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-start gap-2.5 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    <span>{data.perfil.direccion || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>{data.perfil.telefono || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>{data.perfil.correo || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Calificación */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-500" />
                <h2 className="font-semibold text-gray-800 text-sm">Calificación crediticia</h2>
              </div>
              <div className="p-5 space-y-4">
                {/* Score visual */}
                <div className={`rounded-xl border px-4 py-3 flex items-center justify-between ${ratingBg}`}>
                  <div>
                    <p className={`text-2xl font-bold ${ratingColor}`}>{data.rating}<span className="text-base font-normal text-gray-400">/5</span></p>
                    <p className={`text-xs font-semibold mt-0.5 ${ratingColor}`}>{ratingLabel}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => {
                      const enteras = Math.floor(data.rating)
                      const media = data.rating % 1 >= 0.5
                      return (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i <= enteras
                              ? 'fill-amber-400 stroke-amber-500'
                              : i === enteras + 1 && media
                              ? 'fill-amber-200 stroke-amber-400'
                              : 'fill-none stroke-gray-300'
                          }`}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Pagos con mora</p>
                    <p className={`text-xl font-bold ${data.vecesPagadoConMora > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {data.vecesPagadoConMora}
                    </p>
                    {data.vecesPagadoConMora > 0
                      ? <TrendingDown className="h-3.5 w-3.5 text-red-400 mx-auto mt-1" />
                      : <TrendingUp className="h-3.5 w-3.5 text-green-400 mx-auto mt-1" />
                    }
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">En recargos</p>
                    <p className="text-base font-bold text-gray-800">${formatCurrency(data.totalPagadoEnRecargos)}</p>
                    <CreditCard className="h-3.5 w-3.5 text-gray-400 mx-auto mt-1" />
                  </div>
                </div>

                {data.esAltoRiesgo && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-100 border border-red-200 px-3 py-2.5">
                    <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm font-semibold text-red-800">Cliente de alto riesgo</p>
                  </div>
                )}

                <p className="text-xs text-gray-400 leading-relaxed">
                  5 estrellas = paga a tiempo · menos estrellas = mayor riesgo por pagos con retraso.
                </p>
              </div>
            </div>
          </div>

          {/* Historial de préstamos */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-500" />
                <h2 className="font-semibold text-gray-800 text-sm">
                  Historial de préstamos
                  <span className="ml-2 text-xs font-normal text-gray-400">({data.historial.length})</span>
                </h2>
              </div>
            </div>

            {data.historial.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Sin préstamos registrados en la red.
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-gray-100">
                  {data.historial.map((h) => (
                    <div key={h.venta_id} className="p-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {h.numero_prestamo || h.venta_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Monto: <span className="font-medium text-gray-700">${Number(h.monto_original).toLocaleString('es-DO')}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Saldo: <span className="font-medium text-gray-700">${Number(h.saldo_pendiente).toLocaleString('es-DO')}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Mora en pagos: {h.tuvo_pagos_con_mora
                            ? <span className="text-amber-600 font-medium">Sí</span>
                            : <span className="text-gray-400">No</span>}
                        </p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${
                        h.estado === 'Atraso' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {h.estado}{h.dias_atraso > 0 && ` · ${h.dias_atraso}d`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="text-left py-3 px-5 font-medium text-gray-500 text-xs uppercase tracking-wide">Préstamo</th>
                        <th className="text-right py-3 px-5 font-medium text-gray-500 text-xs uppercase tracking-wide">Monto original</th>
                        <th className="text-right py-3 px-5 font-medium text-gray-500 text-xs uppercase tracking-wide">Saldo pendiente</th>
                        <th className="text-center py-3 px-5 font-medium text-gray-500 text-xs uppercase tracking-wide">Estado</th>
                        <th className="text-center py-3 px-5 font-medium text-gray-500 text-xs uppercase tracking-wide">Pagos con mora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.historial.map((h) => (
                        <tr key={h.venta_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-5 font-medium text-gray-900">
                            {h.numero_prestamo || h.venta_id.slice(0, 8)}
                          </td>
                          <td className="py-3.5 px-5 text-right font-medium text-gray-800">
                            ${Number(h.monto_original).toLocaleString('es-DO')}
                          </td>
                          <td className="py-3.5 px-5 text-right text-gray-700">
                            ${Number(h.saldo_pendiente).toLocaleString('es-DO')}
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                              h.estado === 'Atraso' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {h.estado}{h.dias_atraso > 0 && ` (${h.dias_atraso} días)`}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            {h.tuvo_pagos_con_mora
                              ? <span className="inline-flex items-center gap-1 text-amber-600 font-medium text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Sí</span>
                              : <span className="text-gray-400 text-xs">No</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Garantes */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-500" />
              <h2 className="font-semibold text-gray-800 text-sm">
                Garantes
                <span className="ml-2 text-xs font-normal text-gray-400">({data.garantes.length})</span>
              </h2>
            </div>
            <div className="p-5">
              {data.garantes.length === 0 ? (
                <p className="text-gray-400 text-sm">No hay garantes registrados.</p>
              ) : (
                <ul className="space-y-2">
                  {data.garantes.map((g, i) => (
                    <li key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-indigo-700">
                          {(g.nombre || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900 flex-1">{g.nombre}</span>
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {g.telefono}
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
