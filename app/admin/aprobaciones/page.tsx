'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, RefreshCw, FileText, RotateCcw, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/Button'
import { solicitudesService } from '@/lib/services/solicitudes'
import { perfilesService } from '@/lib/services/perfiles'
import type { Venta, SolicitudCambio } from '@/types'
import Link from 'next/link'

export default function AprobacionesPage() {
  const [ventasPendientes, setVentasPendientes] = useState<Venta[]>([])
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<SolicitudCambio[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [aprobarId, setAprobarId] = useState<string | null>(null)
  const [rechazarId, setRechazarId] = useState<string | null>(null)
  const [tipoAccion, setTipoAccion] = useState<'venta' | 'solicitud'>('venta')

  useEffect(() => {
    perfilesService.esAdmin().then(setIsAdmin)
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [ventas, solicitudes] = await Promise.all([
        solicitudesService.getVentasPendientes(),
        solicitudesService.getSolicitudesPendientes(),
      ])
      setVentasPendientes(ventas)
      setSolicitudesPendientes(solicitudes)
    } catch (error: any) {
      console.error('Error cargando aprobaciones:', error)
      alert(`Error: ${error.message || 'No se pudieron cargar las solicitudes'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) loadData()
  }, [isAdmin])

  async function handleAprobar(id: string, tipo: 'venta' | 'solicitud') {
    try {
      setAprobarId(id)
      setTipoAccion(tipo)
      if (tipo === 'venta') {
        await solicitudesService.aprobarVenta(id)
      } else {
        await solicitudesService.aprobarSolicitud(id)
      }
      await loadData()
    } catch (error: any) {
      alert(`Error al aprobar: ${error.message}`)
    } finally {
      setAprobarId(null)
    }
  }

  async function handleRechazar(id: string, tipo: 'venta' | 'solicitud') {
    const motivo = prompt('Motivo del rechazo (opcional):')
    try {
      setRechazarId(id)
      setTipoAccion(tipo)
      if (tipo === 'venta') {
        await solicitudesService.rechazarVenta(id)
      } else {
        await solicitudesService.rechazarSolicitud(id, motivo || undefined)
      }
      await loadData()
    } catch (error: any) {
      alert(`Error al rechazar: ${error.message}`)
    } finally {
      setRechazarId(null)
    }
  }

  const totalPendientes = ventasPendientes.length + solicitudesPendientes.length

  if (isAdmin === false) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-lg flex items-start gap-4">
          <ShieldAlert className="w-10 h-10 flex-shrink-0 text-amber-600" />
          <div>
            <h2 className="text-lg font-semibold text-amber-900">Acceso restringido</h2>
            <p className="text-amber-800 mt-1">
              Solo los administradores pueden aprobar o rechazar préstamos. Contacta al administrador si necesitas que se apruebe una solicitud.
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Aprobaciones</h1>
          <p className="text-gray-600">
            Préstamos nuevos y renovaciones pendientes de aprobación
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 inline ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Link href="/admin">
            <Button variant="secondary">Volver al Admin</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : totalPendientes === 0 ? (
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
          <p className="text-green-800 font-medium">No hay solicitudes pendientes</p>
          <p className="text-green-700 text-sm mt-2">
            Todas las solicitudes han sido procesadas.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Préstamos nuevos pendientes */}
          {ventasPendientes.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Préstamos nuevos ({ventasPendientes.length})
              </h2>
              <div className="grid gap-4">
                {ventasPendientes.map((v: any) => (
                  <div
                    key={v.id}
                    className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm text-gray-500">#{v.numero_prestamo || v.id.slice(0, 8)}</p>
                      <h3 className="font-semibold text-gray-900 truncate">
                        {v.cliente?.nombre_completo || 'Cliente'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {v.motor?.marca} {v.motor?.modelo} · ${(v.monto_total || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {v.created_at ? new Date(v.created_at).toLocaleString('es-DO') : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleRechazar(v.id, 'venta')}
                        disabled={rechazarId === v.id}
                      >
                        <XCircle className="w-4 h-4 mr-2 inline" />
                        Rechazar
                      </Button>
                      <Button
                        onClick={() => handleAprobar(v.id, 'venta')}
                        disabled={aprobarId === v.id}
                      >
                        <CheckCircle className="w-4 h-4 mr-2 inline" />
                        {aprobarId === v.id ? 'Aprobando...' : 'Aprobar'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Solicitudes de renovación */}
          {solicitudesPendientes.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                Renovaciones ({solicitudesPendientes.length})
              </h2>
              <div className="grid gap-4">
                {solicitudesPendientes.map((s: any) => {
                  const venta = s.venta || {}
                  return (
                    <div
                      key={s.id}
                      className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm text-gray-500">#{venta.numero_prestamo || venta.id?.slice(0, 8)}</p>
                        <h3 className="font-semibold text-gray-900 truncate">
                          {venta.cliente?.nombre_completo || 'Cliente'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {venta.motor?.marca} {venta.motor?.modelo}
                          {s.monto_solicitado && ` · $${s.monto_solicitado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {s.created_at ? new Date(s.created_at).toLocaleString('es-DO') : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => handleRechazar(s.id, 'solicitud')}
                          disabled={rechazarId === s.id}
                        >
                          <XCircle className="w-4 h-4 mr-2 inline" />
                          Rechazar
                        </Button>
                        <Button
                          onClick={() => handleAprobar(s.id, 'solicitud')}
                          disabled={aprobarId === s.id}
                        >
                          <CheckCircle className="w-4 h-4 mr-2 inline" />
                          {aprobarId === s.id ? 'Aprobando...' : 'Aprobar'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
