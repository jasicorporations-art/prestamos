'use client'

import { useEffect, useState, useCallback } from 'react'
import { pagosService } from '@/lib/services/pagos'
import { rutasService } from '@/lib/services/rutas'
import type { Pago, Ruta } from '@/types'
import { Button } from '@/components/Button'
import { MapPin, ArrowLeft, RefreshCw, Calendar, ShieldAlert, ExternalLink, Route } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { perfilesService } from '@/lib/services/perfiles'
import { MapaCobros } from '@/components/MapaCobros'

type PagoConCoords = Omit<Pago, 'venta'> & {
  venta?: {
    ruta_id?: string
    cliente?: { nombre_completo?: string }
    motor?: { marca?: string; modelo?: string; numero_chasis?: string }
  } | Array<{ ruta_id?: string; cliente?: { nombre_completo?: string }; motor?: { marca?: string; modelo?: string; numero_chasis?: string } }>
}

function getClienteNombre(p: PagoConCoords): string {
  const v = Array.isArray(p.venta) ? p.venta[0] : p.venta
  const c = v?.cliente
  const nombre = Array.isArray(c) ? c[0]?.nombre_completo : (c as any)?.nombre_completo
  return nombre || 'Cliente'
}

function getRutaId(p: PagoConCoords): string | null {
  const v = Array.isArray(p.venta) ? p.venta[0] : p.venta
  return (v as any)?.ruta_id ?? null
}

export default function MapaCobrosPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [pagos, setPagos] = useState<PagoConCoords[]>([])
  const [loading, setLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)
  const [fecha, setFecha] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })
  const [rutaId, setRutaId] = useState<string>('')
  const [rutas, setRutas] = useState<Ruta[]>([])

  const loadPagos = useCallback(async () => {
    setLoading(true)
    setMapError(null)
    try {
      const d = fecha ? new Date(fecha + 'T12:00:00') : new Date()
      const data = await pagosService.getCobrosDelDia(d)
      setPagos((data || []) as PagoConCoords[])
    } catch (e) {
      console.error(e)
      setPagos([])
      setMapError('Error al cargar cobros')
    } finally {
      setLoading(false)
    }
  }, [fecha])

  useEffect(() => {
    perfilesService.esAdmin().then(setIsAdmin)
  }, [])

  useEffect(() => {
    if (isAdmin) {
      rutasService.getAllRutas().then(setRutas).catch(() => setRutas([]))
    }
  }, [isAdmin])

  useEffect(() => {
    if (isAdmin) loadPagos()
  }, [isAdmin, loadPagos])

  const pagosFiltrados = rutaId
    ? pagos.filter((p) => getRutaId(p) === rutaId)
    : pagos

  const conGps = pagosFiltrados.filter((p) => p.latitud_cobro != null && p.longitud_cobro != null)
  const sinGps = pagosFiltrados.filter((p) => p.latitud_cobro == null || p.longitud_cobro == null)

  if (isAdmin === false) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-amber-900">Acceso restringido</h2>
            <p className="text-amber-800 mt-1">
              Solo los administradores pueden ver el mapa de cobros del día.
            </p>
            <Link href="/dashboard" className="inline-block mt-4">
              <Button variant="secondary">Volver al Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5 mr-2 inline" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-7 h-7 text-emerald-600" />
            Mapa de Cobros del Día
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Route className="w-5 h-5 text-gray-500" />
            <select
              value={rutaId}
              onChange={(e) => setRutaId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[160px] focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todas las rutas</option>
              {rutas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>
          <Button variant="secondary" onClick={loadPagos} disabled={loading}>
            <RefreshCw className={`w-5 h-5 mr-2 inline ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow" />
          Con GPS ({conGps.length})
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-gray-400 border-2 border-white shadow" />
          Sin señal ({sinGps.length})
        </span>
        <span className="text-gray-500">Total: {pagosFiltrados.length} cobros</span>
        {rutaId && (
          <span className="text-emerald-600 font-medium">
            Filtro: {rutas.find((r) => r.id === rutaId)?.nombre || 'Ruta'}
          </span>
        )}
      </div>

      <MapaCobros pagos={pagos} rutaId={rutaId || undefined} onError={setMapError} />

      {mapError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {mapError}
        </div>
      )}

      {!loading && pagos.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Lista de cobros ({pagosFiltrados.length})
            {rutaId && (
              <span className="text-gray-500 font-normal ml-2">
                — {rutas.find((r) => r.id === rutaId)?.nombre || 'Ruta seleccionada'}
              </span>
            )}
          </h3>
          <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coordenadas</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {pagosFiltrados.map((p) => {
                  const lat = p.latitud_cobro
                  const lng = p.longitud_cobro
                  const tieneGps = lat != null && lng != null
                  return (
                    <tr key={p.id} className={tieneGps ? '' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-sm text-gray-900">{getClienteNombre(p)}</td>
                      <td className="px-4 py-2 text-sm text-right font-medium">${p.monto?.toLocaleString('es-DO')}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {tieneGps ? (
                          <span>{Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}</span>
                        ) : (
                          <span className="text-gray-400">Sin señal</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {tieneGps && (
                          <a
                            href={`https://www.google.com/maps?q=${lat},${lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Ver en mapa
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-4 space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-56 bg-gray-100 rounded" />
              </div>
              <div className="h-6 w-20 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
