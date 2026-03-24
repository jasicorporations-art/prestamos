'use client'

import { useEffect, useState, useCallback } from 'react'
import { MapPin, Phone, RefreshCw, ArrowLeft, CheckCircle, AlertCircle, Target, Navigation } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { PagoForm } from '@/components/forms/PagoForm'
import { rutasService, type VentaEnRuta } from '@/lib/services/rutas'
import { getMapsNavigationUrl } from '@/lib/utils/mapsNavigation'
import { ventasService } from '@/lib/services/ventas'
import type { Venta } from '@/types'
import { AvatarCliente } from '@/components/AvatarCliente'
import { toast } from '@/lib/toast'

export default function MiRutaDeHoyPage() {
  const [ruta, setRuta] = useState<VentaEnRuta[]>([])
  const [cobradosHoy, setCobradosHoy] = useState<VentaEnRuta[]>([])
  const [meta, setMeta] = useState(0)
  const [cobrado, setCobrado] = useState(0)
  const [pendiente, setPendiente] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pagoModalOpen, setPagoModalOpen] = useState(false)
  const [ventaParaPago, setVentaParaPago] = useState<Venta | null>(null)
  const [ventasParaPago, setVentasParaPago] = useState<Venta[]>([])
  const [clientePopoverId, setClientePopoverId] = useState<string | null>(null)

  useEffect(() => {
    function handleClickFueraPopover(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      if (!target) return
      const dentroPopover = target.closest('[data-ruta-popover="true"]')
      if (!dentroPopover) {
        setClientePopoverId(null)
      }
    }

    document.addEventListener('mousedown', handleClickFueraPopover)
    return () => document.removeEventListener('mousedown', handleClickFueraPopover)
  }, [])

  const loadRuta = useCallback(async () => {
    try {
      setLoading(true)
      const { items, cobradosHoy: cobradosLista, meta: m, cobrado: c, pendiente: p } = await rutasService.getMiRutaDeHoyFiltrada()
      setRuta(items)
      setCobradosHoy(cobradosLista)
      setMeta(m)
      setCobrado(c)
      setPendiente(p)
    } catch (error: any) {
      console.error('Error cargando ruta:', error)
      if (!error.message?.includes('mi_ruta_de_hoy')) {
        toast.error(`Error: ${error.message || 'No se pudo cargar la ruta'}`)
      }
      setRuta([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRuta()
  }, [loadRuta])

  async function handleRecogerPago(item: VentaEnRuta) {
    try {
      const venta = await ventasService.getById(item.id)
      if (!venta) {
        toast.warning('No se encontró el préstamo')
        return
      }
      setVentaParaPago(venta)
      setVentasParaPago([venta])
      setPagoModalOpen(true)
    } catch (error: any) {
      console.error('Error abriendo pago:', error)
      toast.error(`Error: ${error.message || 'No se pudo abrir el formulario'}`)
    }
  }

  function handlePagoSuccess() {
    setPagoModalOpen(false)
    setVentaParaPago(null)
    setVentasParaPago([])
    loadRuta()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Mi Ruta de Hoy</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Atrasados + hoy (fecha programada ≤ hoy) • Los morosos no salen hasta que paguen • Cobrados abajo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadRuta} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 inline ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Link href="/dashboard">
            <Button variant="secondary">
              <ArrowLeft className="w-4 h-4 mr-2 inline" />
              Volver
            </Button>
          </Link>
        </div>
      </div>

      {/* Panel de Resumen - Glow oscuro */}
      {!loading && (
        <div className="mb-6 rounded-2xl bg-slate-900 text-white p-5 shadow-[0_0_24px_rgba(0,0,0,0.4),0_0_48px_rgba(59,130,246,0.15)] border border-slate-700">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4 p-4 rounded-xl bg-slate-800/80">
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Target className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">Meta del día</p>
                <p className="text-xs text-slate-500 mt-0.5">Atrasados + hoy</p>
                <p className="text-2xl sm:text-3xl font-bold text-amber-100 tabular-nums">
                  ${meta.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 p-4 rounded-xl bg-slate-800/80">
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center shadow-[0_0_12px_rgba(34,197,94,0.3)]">
                <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-green-400" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">Cobrado</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-300 tabular-nums">
                  ${cobrado.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 p-4 rounded-xl bg-slate-800/80">
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-orange-400" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">Pendiente</p>
                <p className="text-xs text-slate-500 mt-0.5">Por recuperar (atrasados + hoy)</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-300 tabular-nums">
                  ${pendiente.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
          {meta > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-base mb-2">
                <span className="text-slate-400 font-medium">Progreso de la ruta</span>
                <span className="font-bold text-slate-100 text-lg">
                  {Math.round((cobrado / meta) * 100)}%
                </span>
              </div>
              <div className="h-4 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, (cobrado / meta) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-56 bg-gray-100 rounded" />
              </div>
              <div className="h-8 w-20 bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : ruta.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <p className="text-amber-800 font-medium">No hay cobros pendientes</p>
          <p className="text-amber-700 text-sm mt-2">
            Se muestran clientes con cuota atrasada o programada para hoy (fecha ≤ hoy). Los morosos permanecen hasta que paguen.
          </p>
          <Link href="/caja" className="inline-block mt-4">
            <Button variant="secondary">Ir a Caja</Button>
          </Link>
        </div>
      ) : (
        <div>
        <div className="space-y-4">
          {(() => {
            const pagoInfoPorItem = new Map<string, { pagoNum: number; totalPagos: number }>()
            const totalPorCliente = new Map<string, number>()
            for (const i of ruta) {
              totalPorCliente.set(i.cliente_id, (totalPorCliente.get(i.cliente_id) || 0) + 1)
            }
            const indexPorCliente = new Map<string, number>()
            for (const i of ruta) {
              const idx = (indexPorCliente.get(i.cliente_id) || 0) + 1
              indexPorCliente.set(i.cliente_id, idx)
              const total = totalPorCliente.get(i.cliente_id) || 1
              if (total > 1) pagoInfoPorItem.set(i.id, { pagoNum: idx, totalPagos: total })
            }
            return ruta.map((item, index) => {
              const pagoInfo = pagoInfoPorItem.get(item.id)
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md overflow-visible transition-shadow"
                >
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-semibold text-sm">
                      {item.orden_visita ?? index + 1}
                    </span>
                    <span className="font-mono text-sm text-gray-500">
                      #{item.numero_prestamo || item.id.slice(0, 8)}
                    </span>
                    {item.ruta_nombre && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {item.ruta_nombre}
                      </span>
                    )}
                    {(item.diasAtraso ?? 0) > 0 ? (
                      <>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-red-700 bg-red-100 border border-red-200">
                          <AlertCircle className="w-3.5 h-3.5" />
                          MOROSO / ATRASADO
                        </span>
                        <span className="text-xs font-medium text-red-600">
                          {item.diasAtraso} {item.diasAtraso === 1 ? 'día' : 'días'} de atraso
                        </span>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-orange-700 bg-orange-100">
                        <AlertCircle className="w-3.5 h-3.5" />
                        PENDIENTE
                      </span>
                    )}
                    {item.indicadorRuta && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                        {item.indicadorRuta}
                      </span>
                    )}
                      </div>
                      <h3 className="font-semibold text-gray-900 truncate flex items-center gap-2 flex-wrap">
                        <div className="relative shrink-0" data-ruta-popover="true">
                          <button
                            type="button"
                            className="inline-flex rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                            title="Acciones del cliente"
                            aria-label="Acciones del cliente"
                            onClick={() => {
                              setClientePopoverId((prev) => (prev === item.id ? null : item.id))
                            }}
                          >
                            <AvatarCliente
                              nombreCompleto={item.cliente_nombre || 'Cliente'}
                              fotoUrl={item.cliente_foto_url || undefined}
                              size="lg"
                            />
                          </button>

                          {clientePopoverId === item.id && (
                            <div className="absolute left-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-[0_18px_40px_-14px_rgba(15,23,42,0.35)]">
                              <div className="px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  Acceso rápido
                                </p>
                                <p className="text-xs text-slate-400 truncate">{item.cliente_nombre || 'Cliente'}</p>
                              </div>
                              <div className="p-2 space-y-2">
                                <Link
                                  href={item.cliente_id ? `/ventas/nuevo?cliente_id=${encodeURIComponent(item.cliente_id)}` : '/ventas/nuevo'}
                                  className="block w-full min-w-0 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors text-center leading-snug"
                                  onClick={() => setClientePopoverId(null)}
                                >
                                  Nuevo Préstamo
                                </Link>
                                <Link
                                  href={item.cliente_id ? `/clientes/${item.cliente_id}` : '/clientes'}
                                  className="block w-full min-w-0 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors text-center leading-snug"
                                  onClick={() => setClientePopoverId(null)}
                                >
                                  Ver expediente
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                        <span>{item.cliente_nombre || 'Cliente'}</span>
                        {pagoInfo && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Pago {pagoInfo.pagoNum} de {pagoInfo.totalPagos}
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 truncate">
                        {item.motor_marca} {item.motor_modelo} {item.motor_matricula && `· ${item.motor_matricula}`}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                      {item.cliente_direccion && (
                        <a
                          href={getMapsNavigationUrl(item.cliente_direccion)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sky-600 hover:text-sky-700 hover:underline cursor-pointer"
                          title={`Cómo llegar: ${item.cliente_direccion}`}
                        >
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{item.cliente_direccion}</span>
                        </a>
                      )}
                      {item.cliente_celular && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          {item.cliente_celular}
                        </span>
                      )}
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
                      {item.cliente_direccion && (
                        <a
                          href={getMapsNavigationUrl(item.cliente_direccion)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-medium text-sm whitespace-nowrap"
                        >
                          <Navigation className="w-4 h-4" />
                          Cómo llegar
                        </a>
                      )}
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Saldo pendiente</p>
                        <p className="text-lg font-bold text-gray-900">
                          ${(item.saldo_pendiente ?? 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleRecogerPago(item)}
                        className="flex items-center gap-2 whitespace-nowrap"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Recoger Pago
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
        })()}
        </div>

        {cobradosHoy.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Cobrados hoy
            </h2>
            <p className="text-sm text-gray-500 mb-4">Estos clientes ya registraron pago hoy y salieron de pendientes.</p>
            <div className="space-y-3">
              {cobradosHoy.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative shrink-0" data-ruta-popover="true">
                        <button
                          type="button"
                          className="inline-flex rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                          title="Acciones del cliente"
                          aria-label="Acciones del cliente"
                          onClick={() => {
                            setClientePopoverId((prev) => (prev === item.id ? null : item.id))
                          }}
                        >
                          <AvatarCliente
                            nombreCompleto={item.cliente_nombre || 'Cliente'}
                            fotoUrl={item.cliente_foto_url || undefined}
                            size="lg"
                          />
                        </button>
                        {clientePopoverId === item.id && (
                          <div className="absolute left-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-[0_18px_40px_-14px_rgba(15,23,42,0.35)]">
                            <div className="px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                Acceso rápido
                              </p>
                              <p className="text-xs text-slate-400 truncate">{item.cliente_nombre || 'Cliente'}</p>
                            </div>
                            <div className="p-2 space-y-2">
                              <Link
                                href={item.cliente_id ? `/ventas/nuevo?cliente_id=${encodeURIComponent(item.cliente_id)}` : '/ventas/nuevo'}
                                className="block w-full min-w-0 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors text-center leading-snug"
                                onClick={() => setClientePopoverId(null)}
                              >
                                Nuevo Préstamo
                              </Link>
                              <Link
                                href={item.cliente_id ? `/clientes/${item.cliente_id}` : '/clientes'}
                                className="block w-full min-w-0 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors text-center leading-snug"
                                onClick={() => setClientePopoverId(null)}
                              >
                                Ver expediente
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-gray-900">{item.cliente_nombre || 'Cliente'}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-green-700 bg-green-100">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Cobrado
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {item.motor_marca} {item.motor_modelo} {item.motor_matricula && `· ${item.motor_matricula}`}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    Saldo pendiente: ${(item.saldo_pendiente ?? 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      )}

      <Modal
        isOpen={pagoModalOpen}
        onClose={() => {
          setPagoModalOpen(false)
          setVentaParaPago(null)
          setVentasParaPago([])
        }}
        title="Recoger Pago"
      >
        {ventasParaPago.length > 0 && ventaParaPago && (
          <PagoForm
            ventas={ventasParaPago}
            initialVentaId={ventaParaPago.id}
            onSuccess={handlePagoSuccess}
            onCancel={() => {
              setPagoModalOpen(false)
              setVentaParaPago(null)
              setVentasParaPago([])
            }}
          />
        )}
      </Modal>
    </div>
  )
}
