'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, RefreshCw, FileText, RotateCcw, ShieldAlert, Globe, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/Button'
import { toast } from '@/lib/toast'
import { solicitudesService } from '@/lib/services/solicitudes'
import { perfilesService } from '@/lib/services/perfiles'
import { authService } from '@/lib/services/auth'
import type { MetodoInteres, TipoPlazo } from '@/lib/services/interes'
import type { Venta, SolicitudCambio } from '@/types'
import Link from 'next/link'

type CalculoAprobacion = {
  montoSolicitado: number
  cantidadCuotas: number
  tipoPlazo: TipoPlazo
  metodoInteres: MetodoInteres
  interesPrestamo: number
  gastoCierreMonto: number
}

function round2(v: number) {
  return Math.round(v * 100) / 100
}

function calcularResumenAprobacion(input: CalculoAprobacion) {
  const monto = Math.max(0, Number(input.montoSolicitado || 0))
  const gastos = Math.max(0, Number(input.gastoCierreMonto || 0))
  const n = Math.max(1, Math.floor(Number(input.cantidadCuotas || 1)))
  const i = Math.max(0, Number(input.interesPrestamo || 0)) / 100
  const capital = round2(monto + gastos)
  if (input.metodoInteres === 'fijo') {
    const intereses = round2(capital * i * n)
    const total = round2(capital + intereses)
    return { cuota: round2(total / n), total, intereses, capital }
  }
  if (i === 0) return { cuota: round2(capital / n), total: capital, intereses: 0, capital }
  const factor = Math.pow(1 + i, n)
  const cuota = round2((capital * i * factor) / (factor - 1))
  const total = round2(cuota * n)
  const intereses = round2(total - capital)
  return { cuota, total, intereses, capital }
}

export default function AprobacionesPage() {
  const [ventasPendientes, setVentasPendientes] = useState<Venta[]>([])
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<SolicitudCambio[]>([])
  const [solicitudesWebPendientes, setSolicitudesWebPendientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [aprobarId, setAprobarId] = useState<string | null>(null)
  const [rechazarId, setRechazarId] = useState<string | null>(null)
  const [tipoAccion, setTipoAccion] = useState<'venta' | 'solicitud' | 'solicitud_web'>('venta')
  const [calcBySolicitudId, setCalcBySolicitudId] = useState<Record<string, CalculoAprobacion>>({})
  // Modal rechazo
  const [rechazarPendiente, setRechazarPendiente] = useState<{ id: string; tipo: 'venta' | 'solicitud' | 'solicitud_web' } | null>(null)
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('')
  const [motivoPersonalizado, setMotivoPersonalizado] = useState('')

  useEffect(() => {
    perfilesService.esAdmin().then(setIsAdmin)
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [ventas, solicitudes, solicitudesWeb] = await Promise.all([
        solicitudesService.getVentasPendientes(),
        solicitudesService.getSolicitudesPendientes(),
        solicitudesService.getSolicitudesWebPendientes(),
      ])
      setVentasPendientes(ventas)
      setSolicitudesPendientes(solicitudes)
      setSolicitudesWebPendientes(solicitudesWeb)
      setCalcBySolicitudId((prev) => {
        const next = { ...prev }
        for (const s of solicitudesWeb) {
          if (next[s.id]) continue
          const dc = s?.datos_cliente || {}
          const monto = Number(s?.monto_solicitado || 0)
          const cuotasRaw = Number(dc?.cantidad_cuotas || 12)
          const cuotas = Number.isFinite(cuotasRaw) && cuotasRaw > 0 ? Math.floor(cuotasRaw) : 12
          const tipoRaw = String(dc?.tipo_plazo || 'mensual').toLowerCase()
          const tipoPlazo = (['diario', 'semanal', 'quincenal', 'mensual'].includes(tipoRaw) ? tipoRaw : 'mensual') as TipoPlazo
          const interes = 0.2
          next[s.id] = {
            montoSolicitado: monto,
            cantidadCuotas: cuotas,
            tipoPlazo,
            metodoInteres: 'fijo',
            interesPrestamo: interes,
            gastoCierreMonto: Math.round(monto * 0.045 * 100) / 100,
          }
        }
        return next
      })
    } catch (error: any) {
      console.error('Error cargando aprobaciones:', error)
      toast.error(error.message || 'No se pudieron cargar las solicitudes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) loadData()
  }, [isAdmin])

  async function handleAprobar(id: string, tipo: 'venta' | 'solicitud' | 'solicitud_web') {
    let ventaId: string | undefined = tipo === 'venta' ? id : solicitudesPendientes.find((s) => s.id === id)?.venta_id
    try {
      setAprobarId(id)
      setTipoAccion(tipo)
      if (tipo === 'venta') {
        await solicitudesService.aprobarVenta(id)
      } else if (tipo === 'solicitud') {
        const out = await solicitudesService.aprobarSolicitud(id)
        ventaId = out?.venta_id || ventaId
      } else {
        const calc = calcBySolicitudId[id]
        const out = await solicitudesService.aprobarSolicitudWeb(id, calc ? {
          monto_solicitado: calc.montoSolicitado,
          cantidad_cuotas: calc.cantidadCuotas,
          tipo_plazo: calc.tipoPlazo,
          metodo_interes: calc.metodoInteres,
          interes_prestamo: calc.interesPrestamo,
          gasto_cierre_monto: calc.gastoCierreMonto,
        } : undefined)
        ventaId = out?.venta_id || undefined
      }
      await loadData()
      // Envío automático de amortización por correo al cliente (igual que al crear el préstamo)
      if (ventaId) {
        ;(async () => {
          try {
            const session = await authService.getSession()
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
            await fetch('/api/enviar-amortizacion-email', {
              method: 'POST',
              headers,
              body: JSON.stringify({ venta_id: ventaId }),
              credentials: 'include',
            })
          } catch (e) {
            console.warn('Amortización email tras aprobación:', e)
          }
        })()
        ;(async () => {
          try {
            const session = await authService.getSession()
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
            await fetch('/api/enviar-amortizacion-whatsapp', {
              method: 'POST',
              headers,
              body: JSON.stringify({ venta_id: ventaId }),
              credentials: 'include',
            })
          } catch (e) {
            console.warn('Amortización WhatsApp tras aprobación:', e)
          }
        })()
      }
    } catch (error: any) {
      toast.error(`Error al aprobar: ${error.message}`)
    } finally {
      setAprobarId(null)
    }
  }

  function handleRechazar(id: string, tipo: 'venta' | 'solicitud' | 'solicitud_web') {
    setMotivoSeleccionado('')
    setMotivoPersonalizado('')
    setRechazarPendiente({ id, tipo })
  }

  async function confirmarRechazo() {
    if (!rechazarPendiente) return
    const { id, tipo } = rechazarPendiente
    const motivo = motivoSeleccionado === 'Otro'
      ? (motivoPersonalizado.trim() || undefined)
      : (motivoSeleccionado || undefined)
    try {
      setRechazarId(id)
      setTipoAccion(tipo)
      setRechazarPendiente(null)
      if (tipo === 'venta') {
        await solicitudesService.rechazarVenta(id)
      } else if (tipo === 'solicitud') {
        await solicitudesService.rechazarSolicitud(id, motivo)
      } else {
        await solicitudesService.rechazarSolicitudWeb(id, motivo)
      }
      await loadData()
    } catch (error: any) {
      toast.error(`Error al rechazar: ${error.message}`)
    } finally {
      setRechazarId(null)
    }
  }

  const totalPendientes = ventasPendientes.length + solicitudesPendientes.length + solicitudesWebPendientes.length

  if (isAdmin === false) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          </div>
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
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 bg-gray-100 rounded" />
                <div className="h-4 w-44 bg-gray-200 rounded" />
                <div className="h-3 w-56 bg-gray-100 rounded" />
                <div className="h-3 w-32 bg-gray-100 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-24 bg-gray-100 rounded-lg" />
                <div className="h-9 w-24 bg-gray-200 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : totalPendientes === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
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
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
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
                      className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
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

          {/* Solicitudes Web (Portal Externo) */}
          {solicitudesWebPendientes.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Solicitudes Web ({solicitudesWebPendientes.length})
              </h2>
              <div className="grid gap-4">
                {solicitudesWebPendientes.map((s: any) => {
                  const dc = s.datos_cliente || {}
                  const fotos: string[] = Array.isArray(s.fotos_producto) ? s.fotos_producto : []
                  const calc = calcBySolicitudId[s.id]
                  const simulacion = calc ? calcularResumenAprobacion(calc) : null
                  const montoFinal = simulacion?.capital || 0
                  const netoCliente = calc ? Math.max(0, calc.montoSolicitado - (s?.saldo_pendiente ? Number(s.saldo_pendiente) : 0)) : 0
                  return (
                    <div
                      key={s.id}
                      className="bg-white rounded-xl border border-cyan-200 shadow-sm p-4 sm:p-5 flex flex-col gap-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-sm text-gray-500">#{String(s.id).slice(0, 8)}</p>
                          <h3 className="font-semibold text-gray-900 truncate">
                            {dc.nombre_completo || dc.nombre || 'Cliente'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Cedula: {dc.cedula || '-'} · Tel: {dc.celular || dc.telefono || '-'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Monto solicitado: ${(s.monto_solicitado || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </p>
                          {s.descripcion && (
                            <p className="text-sm text-gray-600 mt-1">{s.descripcion}</p>
                          )}
                        </div>
                        {s.creado_por_cliente && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200">
                            <Globe className="w-3 h-3" />
                            Solicitud Web
                          </span>
                        )}
                      </div>

                      {s.riesgo_multi_solicitud && (
                        <div className="rounded-md border border-red-300 bg-red-50 text-red-700 text-sm p-3">
                          Posible intento de fraude o sobre-endeudamiento (Multi-solicitud detectada).
                          {s.riesgo_total_48h ? ` ${s.riesgo_total_48h} solicitudes en 48h` : ''}
                          {s.riesgo_empresas_48h ? ` en ${s.riesgo_empresas_48h} empresas.` : ''}
                        </div>
                      )}

                      {fotos.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5" />
                            Fotos del cliente
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {fotos.map((url: string, idx: number) => (
                              <a key={`${s.id}-foto-${idx}`} href={url} target="_blank" rel="noreferrer">
                                <img
                                  src={url}
                                  alt={`foto-${idx + 1}`}
                                  className="w-full h-24 object-cover rounded-md border border-gray-200"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {calc && simulacion && (
                        <div className="rounded-md border border-indigo-200 bg-indigo-50/40 p-3 space-y-3">
                          <p className="text-sm font-medium text-indigo-900">Calculadora financiera (previa aprobación)</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="number"
                              min="1"
                              step="0.01"
                              value={calc.montoSolicitado}
                              onChange={(e) => setCalcBySolicitudId((prev) => ({ ...prev, [s.id]: { ...prev[s.id], montoSolicitado: Number(e.target.value || 0) } }))}
                              className="border rounded-md px-3 py-2 text-sm"
                              placeholder="Monto solicitado"
                            />
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={calc.cantidadCuotas}
                              onChange={(e) => setCalcBySolicitudId((prev) => ({ ...prev, [s.id]: { ...prev[s.id], cantidadCuotas: Math.max(1, Math.floor(Number(e.target.value || 0))) } }))}
                              className="border rounded-md px-3 py-2 text-sm"
                              placeholder="Cuotas"
                            />
                            <select
                              value={calc.tipoPlazo}
                              onChange={(e) => setCalcBySolicitudId((prev) => ({ ...prev, [s.id]: { ...prev[s.id], tipoPlazo: e.target.value as TipoPlazo } }))}
                              className="border rounded-md px-3 py-2 text-sm"
                            >
                              <option value="diario">Diario</option>
                              <option value="semanal">Semanal</option>
                              <option value="quincenal">Quincenal</option>
                              <option value="mensual">Mensual</option>
                            </select>
                            <select
                              value={calc.metodoInteres}
                              onChange={(e) => setCalcBySolicitudId((prev) => ({ ...prev, [s.id]: { ...prev[s.id], metodoInteres: e.target.value as MetodoInteres } }))}
                              className="border rounded-md px-3 py-2 text-sm"
                            >
                              <option value="fijo">Interés fijo</option>
                              <option value="sobre_saldo">Sobre saldo</option>
                            </select>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={calc.interesPrestamo}
                              onChange={(e) => setCalcBySolicitudId((prev) => ({ ...prev, [s.id]: { ...prev[s.id], interesPrestamo: Number(e.target.value || 0) } }))}
                              className="border rounded-md px-3 py-2 text-sm"
                              placeholder="Interés por período (%)"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={calc.gastoCierreMonto}
                              onChange={(e) => setCalcBySolicitudId((prev) => ({ ...prev, [s.id]: { ...prev[s.id], gastoCierreMonto: Number(e.target.value || 0) } }))}
                              className="border rounded-md px-3 py-2 text-sm"
                              placeholder="Gastos de cierre"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                            <p><strong>Monto final a financiar:</strong> ${montoFinal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
                            <p><strong>Cuota estimada:</strong> ${Number(simulacion.cuota || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
                            <p><strong>Total con interés:</strong> ${Number(simulacion.total || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
                            <p><strong>Neto estimado cliente:</strong> ${netoCliente.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => handleRechazar(s.id, 'solicitud_web')}
                          disabled={rechazarId === s.id}
                        >
                          <XCircle className="w-4 h-4 mr-2 inline" />
                          Rechazar
                        </Button>
                        <Button
                          onClick={() => handleAprobar(s.id, 'solicitud_web')}
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

      {/* Modal rechazo */}
      {rechazarPendiente && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setRechazarPendiente(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 460, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <XCircle style={{ color: '#dc2626', width: 22, height: 22, flexShrink: 0 }} />
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>Rechazar solicitud</h2>
            </div>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
              Selecciona un motivo o escribe uno personalizado (opcional).
            </p>

            {/* Motivos predefinidos */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {['Capacidad de pago insuficiente', 'Documentación incompleta', 'Historial de mora', 'Solicitud duplicada', 'Información incorrecta', 'Otro'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivoSeleccionado(m === motivoSeleccionado ? '' : m)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 999,
                    fontSize: 13,
                    border: motivoSeleccionado === m ? '2px solid #dc2626' : '2px solid #e5e7eb',
                    background: motivoSeleccionado === m ? '#fef2f2' : '#f9fafb',
                    color: motivoSeleccionado === m ? '#dc2626' : '#374151',
                    cursor: 'pointer',
                    fontWeight: motivoSeleccionado === m ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Campo libre si selecciona Otro */}
            {motivoSeleccionado === 'Otro' && (
              <textarea
                placeholder="Describe el motivo..."
                value={motivoPersonalizado}
                onChange={(e) => setMotivoPersonalizado(e.target.value)}
                rows={3}
                style={{ width: '100%', border: '1.5px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, resize: 'vertical', outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
              />
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: motivoSeleccionado === 'Otro' ? 0 : 8 }}>
              <button
                type="button"
                onClick={() => setRechazarPendiente(null)}
                style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #d1d5db', background: '#fff', fontSize: 14, cursor: 'pointer', color: '#374151' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarRechazo}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
