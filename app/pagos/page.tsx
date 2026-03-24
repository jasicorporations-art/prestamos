'use client'

import { useEffect, useState } from 'react'
import { Plus, FileText, AlertTriangle, CheckCircle, MessageCircle, Search, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { PagoForm } from '@/components/forms/PagoForm'
import { useCompania } from '@/lib/contexts/CompaniaContext'
import { perfilesService } from '@/lib/services/perfiles'
import { pagosService } from '@/lib/services/pagos'
import { ventasService } from '@/lib/services/ventas'
import { generarUrlWhatsApp, generarMensajeConfirmacionPago } from '@/lib/services/whatsapp'
import { empresaInfoService } from '@/lib/services/empresaInfo'
import { formatCurrency } from '@/lib/utils/currency'
import { formatCalendarDateDominican, formatTime12Dominican } from '@/lib/utils/dateFormat'
import type { Pago, Venta } from '@/types'
import { SucursalRutaBadge } from '@/components/SucursalRutaBadge'
import { toast } from '@/lib/toast'

export default function PagosPage() {
  const { loading: companiaLoading, compania } = useCompania()
  const [pagos, setPagos] = useState<Pago[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [pagoToDelete, setPagoToDelete] = useState<Pago | null>(null)
  const [codigoConfirmacion, setCodigoConfirmacion] = useState<string>('')
  const [codigoIngresado, setCodigoIngresado] = useState<string>('')
  const [errorCodigo, setErrorCodigo] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isCobrador, setIsCobrador] = useState(false)

  useEffect(() => {
    perfilesService.esCobrador().then(setIsCobrador)
  }, [])

  useEffect(() => {
    if (!companiaLoading) {
      loadData()
    }
  }, [companiaLoading, compania])

  async function loadData() {
    try {
      setLoading(true)
      const [pagosData, ventasData] = await Promise.all([
        pagosService.getAll(),
        ventasService.getAll(),
      ])
      // Ordenar pagos por fecha y hora (m?s recientes primero)
      // Usar fecha_hora si existe (m?s preciso), sino created_at, sino fecha_pago
      const pagosOrdenados = [...pagosData].sort((a, b) => {
        // Prioridad 1: fecha_hora (m?s preciso - fecha y hora exacta del pago)
        const fechaHoraA = a.fecha_hora ? new Date(a.fecha_hora).getTime() : 0
        const fechaHoraB = b.fecha_hora ? new Date(b.fecha_hora).getTime() : 0
        if (fechaHoraA !== fechaHoraB && fechaHoraA > 0 && fechaHoraB > 0) {
          return fechaHoraB - fechaHoraA // Descendente (m?s reciente primero)
        }
        
        // Prioridad 2: created_at (cuando se cre? el registro)
        const createdA = a.created_at ? new Date(a.created_at).getTime() : 0
        const createdB = b.created_at ? new Date(b.created_at).getTime() : 0
        if (createdB !== createdA) {
          return createdB - createdA // Descendente (m?s reciente primero)
        }
        
        // Prioridad 3: fecha_pago (fecha del pago sin hora)
        const fechaA = new Date(a.fecha_pago).getTime()
        const fechaB = new Date(b.fecha_pago).getTime()
        return fechaB - fechaA // Descendente (m?s reciente primero)
      })
      setPagos(pagosOrdenados)
      setVentas(ventasData.filter((v) => v.saldo_pendiente > 0))
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  function handleCreate() {
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    setIsModalOpen(false)
  }

  function handleSuccess() {
    handleCloseModal()
    setSuccessMessage('¡Excelente! El saldo se ha actualizado correctamente.')
    loadData()
    setTimeout(() => setSuccessMessage(null), 5000)
  }

  function generarCodigoConfirmacion(): string {
    // Generar un c?digo de 4 d?gitos aleatorio
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  function handleDeleteClick(pago: Pago) {
    const codigo = generarCodigoConfirmacion()
    setCodigoConfirmacion(codigo)
    setCodigoIngresado('')
    setErrorCodigo('')
    setPagoToDelete(pago)
    setIsDeleteModalOpen(true)
  }

  function handleCloseDeleteModal() {
    setIsDeleteModalOpen(false)
    setPagoToDelete(null)
    setCodigoConfirmacion('')
    setCodigoIngresado('')
    setErrorCodigo('')
  }

  async function handleConfirmDelete() {
    if (!pagoToDelete) return

    // Validar que el c?digo ingresado coincida
    if (codigoIngresado !== codigoConfirmacion) {
      setErrorCodigo('El c?digo de confirmaci?n no coincide')
      return
    }

    try {
      await pagosService.delete(pagoToDelete.id, pagoToDelete.venta_id)
      handleCloseDeleteModal()
      loadData()
    } catch (error: any) {
      console.error('Error eliminando pago:', error)
      toast.error(error?.message || 'Error al eliminar el pago')
    }
  }

  async function abrirWhatsAppPago(pago: Pago) {
    const telefono = pago.venta?.cliente?.celular || pago.venta?.cliente?.telefono || ''
    if (!telefono || telefono.trim() === '') {
      toast.warning('Este cliente no tiene número de teléfono registrado. Agrega un celular en su ficha para enviar por WhatsApp.')
      return
    }
    const nombreCliente = pago.venta?.cliente?.nombre_completo || 'Cliente'
    const montoPagado = pago.monto
    const saldoRestante = pago.venta?.saldo_pendiente ?? 0
    const numeroPrestamo = pago.venta?.numero_prestamo || pago.venta_id.slice(0, 8)
    const numeroCuota = pago.numero_cuota ?? undefined
    const nombreEmpresa = await empresaInfoService.getNombreEmpresa()
    const mensajeEncoded = generarMensajeConfirmacionPago(
      nombreCliente,
      montoPagado,
      saldoRestante,
      numeroPrestamo,
      numeroCuota,
      nombreEmpresa
    )
    const url = generarUrlWhatsApp(telefono, mensajeEncoded)
    window.open(url, '_blank')
  }

  const [busqueda, setBusqueda] = useState('')
  const pagosFiltrados = busqueda.trim()
    ? pagos.filter((p) => {
        const q = busqueda.trim().toLowerCase()
        return (
          (p.venta?.cliente?.nombre_completo || '').toLowerCase().includes(q) ||
          (p.venta?.motor?.marca || '').toLowerCase().includes(q) ||
          (p.venta?.numero_prestamo || '').toLowerCase().includes(q)
        )
      })
    : pagos

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Cobros
          {!loading && pagos.length > 0 && (
            <span className="ml-2 text-lg font-normal text-gray-400">({pagos.length})</span>
          )}
        </h1>
        <Button onClick={handleCreate} disabled={ventas.length === 0}>
          <Plus className="w-5 h-5 mr-2 inline" />
          Registrar cobro
        </Button>
      </div>

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0 text-green-600" />
          {successMessage}
        </div>
      )}

      {(companiaLoading || loading) ? (
        <div className="animate-pulse space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow border border-gray-100 p-4 flex gap-4 items-center">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-40" />
                <div className="h-3 bg-gray-100 rounded w-24" />
              </div>
              <div className="h-6 w-20 bg-gray-100 rounded" />
              <div className="h-4 w-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {pagos.length > 0 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por cliente o nº préstamo…"
                className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {busqueda && (
                <button type="button" onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {pagosFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-12 text-gray-500 px-4">
              {busqueda
                ? `Sin resultados para «${busqueda}».`
                : 'Aún no tienes cobros registrados. Usa el botón "Registrar cobro" para empezar.'}
            </div>
          ) : (
            <>
              {/* Cards — móvil */}
              <div className="sm:hidden space-y-3">
                {pagosFiltrados.map((pago) => (
                  <div key={pago.id} className="bg-white rounded-xl shadow border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {pago.venta?.cliente?.nombre_completo || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {pago.venta?.motor?.marca}{pago.venta?.motor?.modelo ? ` ${pago.venta.motor.modelo}` : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900">${formatCurrency(pago.monto)}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(pago.fecha_pago).toLocaleDateString('es-DO')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 font-medium">
                        {pago.numero_cuota != null ? `Cuota ${pago.numero_cuota}` : 'Pago Inicial'}
                      </span>
                      {pago.venta && <SucursalRutaBadge venta={pago.venta} className="max-w-full" />}
                    </div>

                    <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                      <Link href={`/pagos/${pago.id}/recibo`} target="_blank" className="flex items-center gap-1 text-blue-600 text-sm font-medium">
                        <FileText className="w-4 h-4" /> Recibo
                      </Link>
                      <button type="button" onClick={() => abrirWhatsAppPago(pago)} className="flex items-center gap-1 text-green-600 text-sm font-medium">
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </button>
                      {!isCobrador && (
                        <button onClick={() => handleDeleteClick(pago)} className="ml-auto text-red-500 text-sm font-medium hover:text-red-700">
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabla — sm+ */}
              <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuota</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de Pago</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {pagosFiltrados.map((pago) => (
                        <tr key={pago.id}>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-[14rem]">
                            <div className="font-medium text-gray-900">{pago.venta?.cliente?.nombre_completo || 'N/A'}</div>
                            {pago.venta && <div className="mt-1"><SucursalRutaBadge venta={pago.venta} className="max-w-full" /></div>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {pago.venta?.motor?.marca} {pago.venta?.motor?.modelo ? `- ${pago.venta.motor.modelo}` : ''} {pago.venta?.motor?.numero_chasis ? `(${pago.venta.motor.numero_chasis})` : ''}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatCurrency(pago.monto)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {pago.numero_cuota !== null && pago.numero_cuota !== undefined
                              ? pago.numero_cuota
                              : <span className="text-blue-600 font-medium">Pago Inicial</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>{new Date(pago.fecha_pago).toLocaleDateString('es-DO')}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(pago.created_at || pago.fecha_pago).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link href={`/pagos/${pago.id}/recibo`} className="text-primary-600 hover:text-primary-900 mr-3 inline-flex items-center" target="_blank" title="Ver recibo">
                              <FileText className="w-5 h-5" />
                            </Link>
                            <button type="button" onClick={() => abrirWhatsAppPago(pago)} className="text-green-600 hover:text-green-800 mr-3 inline-flex items-center" title="Enviar por WhatsApp">
                              <MessageCircle className="w-5 h-5" />
                            </button>
                            {!isCobrador && (
                              <button onClick={() => handleDeleteClick(pago)} className="text-red-600 hover:text-red-900">Eliminar</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Registrar cobro"
        size="md"
      >
        <PagoForm
          ventas={ventas}
          onSuccess={handleSuccess}
          onCancel={handleCloseModal}
        />
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Confirmar Eliminaci?n"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800 mb-2">
                  ¿Estás seguro? Esta acción es definitiva y protege la integridad de tus datos. El cobro se eliminará y el saldo del financiamiento se recalculará.
                </h3>
                {pagoToDelete && (
                  <div className="text-sm text-red-700 space-y-1">
                    <p><strong>Cliente:</strong> {pagoToDelete.venta?.cliente?.nombre_completo || 'N/A'}</p>
                    <p><strong>Monto:</strong> ${formatCurrency(pagoToDelete.monto)}</p>
                    <p><strong>Cuota:</strong> {pagoToDelete.numero_cuota || 'N/A'}</p>
                    <p><strong>Fecha:</strong> {formatCalendarDateDominican(pagoToDelete.fecha_pago)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm text-yellow-800 mb-3">
              <strong>Para confirmar, ingrese el siguiente código:</strong>
            </p>
            <div className="bg-white border-2 border-yellow-300 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-yellow-900 tracking-widest">
                {codigoConfirmacion}
              </p>
            </div>
          </div>

          <Input
            label="C?digo de Confirmaci?n"
            type="text"
            value={codigoIngresado}
            onChange={(e) => {
              setCodigoIngresado(e.target.value)
              setErrorCodigo('')
            }}
            placeholder="Ingrese el c?digo mostrado arriba"
            error={errorCodigo}
            autoFocus
          />

          <div className="btn-actions">
            <Button type="button" variant="secondary" onClick={handleCloseDeleteModal}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              disabled={codigoIngresado !== codigoConfirmacion}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, eliminar cobro
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


