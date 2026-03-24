'use client'

import { useEffect, useState } from 'react'
import { Plus, FileText, Receipt, Edit, Trash2, Search, X } from 'lucide-react'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { VentaForm } from '@/components/forms/VentaForm'
import { useCompania } from '@/lib/contexts/CompaniaContext'
import { ventasService } from '@/lib/services/ventas'
import { pagosService } from '@/lib/services/pagos'
import { calcularTotalCargosMora } from '@/lib/services/mora'
import { subscriptionService } from '@/lib/services/subscription'
import { formatearPlazoVenta } from '@/lib/utils/plazoVenta'
import { perfilesService } from '@/lib/services/perfiles'
import { authService } from '@/lib/services/auth'
import type { Venta } from '@/types'
import type { PlanType } from '@/lib/config/planes'
import { formatCurrency } from '@/lib/utils/currency'
import { toast } from '@/lib/toast'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function VentasPage() {
  const { loading: companiaLoading, compania } = useCompania()
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVenta, setEditingVenta] = useState<Venta | null>(null)
  const [ventasConPagos, setVentasConPagos] = useState<Set<string>>(new Set())
  const [planType, setPlanType] = useState<PlanType | null>(null)
  const [trialFinanciamientosCreados, setTrialFinanciamientosCreados] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [ventaToDelete, setVentaToDelete] = useState<Venta | null>(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    verificarAdmin()
  }, [])

  useEffect(() => {
    if (!companiaLoading) {
      loadVentas()
    }
  }, [companiaLoading, compania])

  useEffect(() => {
    subscriptionService.getCurrentPlan().then(setPlanType)
  }, [])

  async function verificarAdmin() {
    try {
      const esAdmin = await perfilesService.esAdmin()
      setIsAdmin(esAdmin)
    } catch {
      setIsAdmin(false)
    }
  }

  useEffect(() => {
    if (planType === 'TRIAL') {
      subscriptionService.getTrialFinanciamientosCreados().then(setTrialFinanciamientosCreados)
    } else {
      setTrialFinanciamientosCreados(0)
    }
  }, [planType])

  async function loadVentas() {
    try {
      setLoading(true)
      const data = await ventasService.getAll()
      
      // Calcular cargos por mora para cada venta
      const ventasConCargos = await Promise.all(
        data.map(async (venta) => {
          if (venta.saldo_pendiente > 0) {
            try {
              const cargosMora = await calcularTotalCargosMora(venta.id)
              return { ...venta, cargosMora }
            } catch (error) {
              console.error(`Error calculando cargos para venta ${venta.id}:`, error)
              return { ...venta, cargosMora: 0 }
            }
          }
          return { ...venta, cargosMora: 0 }
        })
      )
      
      setVentas(ventasConCargos)
      
      // Obtener todos los pagos y crear un set de ventas que tienen pagos
      try {
        const todosLosPagos = await pagosService.getAll()
        const ventasConPagosSet = new Set(
          todosLosPagos.map(pago => pago.venta_id).filter(Boolean)
        )
        setVentasConPagos(ventasConPagosSet)
      } catch (error) {
        // Si hay error, simplemente no mostrar los iconos de recibos
        console.error('Error cargando pagos:', error)
      }
    } catch (error) {
      console.error('Error cargando financiamientos emitidos:', error)
      toast.error('Error al cargar los financiamientos emitidos')
    } finally {
      setLoading(false)
    }
  }

  function handleCreate() {
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    setIsModalOpen(false)
    setEditingVenta(null)
  }

  function handleEdit(venta: Venta) {
    if (!isAdmin) return
    setEditingVenta(venta)
    setIsModalOpen(true)
  }

  async function handleDeleteClick(venta: Venta) {
    if (!isAdmin) {
      toast.warning('Solo los administradores pueden eliminar financiamientos.')
      return
    }
    setVentaToDelete(venta)
    setAdminPassword('')
    setIsDeleteModalOpen(true)
  }

  function handleCloseDeleteModal() {
    setIsDeleteModalOpen(false)
    setVentaToDelete(null)
    setAdminPassword('')
  }

  async function handleConfirmDelete() {
    if (!ventaToDelete) return
    if (!adminPassword.trim()) {
      toast.warning('Por favor, ingresa tu contraseña de administrador para confirmar la eliminación')
      return
    }
    try {
      setDeleting(true)
      const user = await authService.getCurrentUser()
      if (!user?.email) throw new Error('No se pudo obtener la información del administrador')
      try {
        await authService.signIn(user.email, adminPassword)
      } catch (signInError: any) {
        if (
          signInError.message?.includes('Invalid login credentials') ||
          signInError.message?.includes('contraseña') ||
          signInError.message?.includes('password')
        ) {
          throw new Error('Contraseña incorrecta. No se puede eliminar el financiamiento.')
        }
        throw signInError
      }
      await ventasService.eliminar(ventaToDelete.id)
      handleCloseDeleteModal()
      loadVentas()
      if (planType === 'TRIAL') {
        subscriptionService.getTrialFinanciamientosCreados().then(setTrialFinanciamientosCreados)
      }
      toast.success('Financiamiento eliminado correctamente')
    } catch (error: any) {
      toast.error(error?.message || 'Error al eliminar el financiamiento')
    } finally {
      setDeleting(false)
      setAdminPassword('')
    }
  }

  function handleSuccess() {
    handleCloseModal()
    loadVentas()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dashboard:refresh-mora'))
    }
    if (planType === 'TRIAL') {
      subscriptionService.getTrialFinanciamientosCreados().then(setTrialFinanciamientosCreados)
    }
  }

  const isTrial = planType === 'TRIAL'
  const trialLimiteAlcanzado = isTrial && trialFinanciamientosCreados >= subscriptionService.TRIAL_MAX_FINANCIAMIENTOS

  const [busqueda, setBusqueda] = useState('')
  const ventasFiltradas = busqueda.trim()
    ? ventas.filter((v) => {
        const q = busqueda.trim().toLowerCase()
        return (
          (v.cliente?.nombre_completo || '').toLowerCase().includes(q) ||
          (v.motor?.marca || '').toLowerCase().includes(q) ||
          (v.motor?.modelo || '').toLowerCase().includes(q) ||
          (v.numero_prestamo || '').toLowerCase().includes(q) ||
          (v.motor?.numero_chasis || '').toLowerCase().includes(q)
        )
      })
    : ventas

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {trialLimiteAlcanzado && (
        <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800 font-medium">
            Plan de prueba: solo puedes emitir {subscriptionService.TRIAL_MAX_FINANCIAMIENTOS} financiamientos en total.
          </p>
          <p className="text-sm text-amber-700 mt-0.5">
            Ya utilizaste tu cupo. Aunque borres un financiamiento, no podrás emitir más hasta que contrates un plan (Plata, Oro o Infinito).
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Financiamientos
          {!loading && ventas.length > 0 && (
            <span className="ml-2 text-lg font-normal text-gray-400">({ventas.length})</span>
          )}
        </h1>
        <Button
          onClick={handleCreate}
          disabled={trialLimiteAlcanzado}
          title={trialLimiteAlcanzado ? 'En plan de prueba solo puedes emitir 3 financiamientos. Ya utilizaste tu cupo.' : undefined}
        >
          <Plus className="w-5 h-5 mr-2 inline" />
          Emitir Nuevo
        </Button>
      </div>

      {!loading && ventas.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, producto o nº préstamo…"
            className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {(companiaLoading || loading) ? (
        <div className="animate-pulse space-y-3">
          <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100">
              {['w-28','w-28','w-20','w-24','w-16','w-28','w-20','w-16'].map((w, i) => (
                <div key={i} className={`h-3 ${w} bg-gray-200 rounded`} />
              ))}
            </div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
                <div className="w-28 space-y-1.5">
                  <div className="h-3.5 bg-gray-200 rounded" />
                  <div className="h-4 w-16 bg-gray-100 rounded-full" />
                </div>
                <div className="w-28 h-3 bg-gray-100 rounded" />
                <div className="w-20 h-3 bg-gray-100 rounded" />
                <div className="w-20 h-3 bg-gray-100 rounded" />
                <div className="w-12 h-3 bg-gray-100 rounded" />
                <div className="w-24 h-3 bg-gray-100 rounded" />
                <div className="w-20 h-3 bg-gray-100 rounded" />
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gray-100" />
                  <div className="w-7 h-7 rounded-lg bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
          <div className="sm:hidden space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex justify-between mb-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-36 bg-gray-200 rounded" />
                    <div className="h-3 w-28 bg-gray-100 rounded" />
                  </div>
                  <div className="space-y-1 items-end flex flex-col">
                    <div className="h-5 w-16 bg-gray-200 rounded-full" />
                    <div className="h-3 w-20 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[...Array(4)].map((_, j) => <div key={j} className="h-16 bg-gray-50 rounded-lg" />)}
                </div>
                <div className="h-8 bg-gray-50 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>{ventasFiltradas.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-12 text-gray-500 px-4">
            {busqueda
              ? `Sin resultados para «${busqueda}». Prueba otro nombre o número.`
              : 'Aún no tienes préstamos registrados. ¡Comienza haciendo clic en el botón de arriba para emitir tu primer desembolso y hacer crecer tu cartera!'}
          </div>
        ) : (
          <>
            {/* Cards — visible solo en móvil */}
            <div className="sm:hidden space-y-3">
              {ventasFiltradas.map((venta) => {
                const estadoBadge = venta.saldo_pendiente <= 0
                  ? { label: 'Pagado', cls: 'bg-gray-100 text-gray-500' }
                  : venta.cargosMora && venta.cargosMora > 0
                    ? { label: 'En mora', cls: 'bg-red-100 text-red-700' }
                    : { label: 'Al día', cls: 'bg-green-100 text-green-700' }
                return (
                <div key={venta.id} className="bg-white rounded-xl shadow border border-gray-100 p-4">
                  {/* Cabecera */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate text-base">
                        {venta.cliente?.nombre_completo || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {venta.motor?.marca}{venta.motor?.modelo ? ` ${venta.motor.modelo}` : ''}
                        {venta.motor?.numero_chasis ? ` · ${venta.motor.numero_chasis}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${estadoBadge.cls}`}>
                        {estadoBadge.label}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(venta.fecha_venta).toLocaleDateString('es-DO')}
                      </span>
                    </div>
                  </div>

                  {/* Datos financieros */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-xs text-gray-500 mb-0.5">Monto total</p>
                      <p className="font-semibold text-gray-900 text-sm">${formatCurrency(venta.monto_total)}</p>
                    </div>
                    <div className={`rounded-lg p-2.5 ${venta.saldo_pendiente > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                      <p className="text-xs text-gray-500 mb-0.5">Saldo pendiente</p>
                      <p className={`font-semibold text-sm ${venta.saldo_pendiente > 0 ? 'text-red-700' : 'text-green-700'}`}>
                        ${formatCurrency(venta.saldo_pendiente)}
                      </p>
                      {venta.cargosMora && venta.cargosMora > 0 && (
                        <p className="text-xs text-red-600 font-medium flex items-center gap-0.5 mt-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          +${formatCurrency(venta.cargosMora)} mora
                        </p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-xs text-gray-500 mb-0.5">Plazo</p>
                      <p className="font-medium text-gray-900 text-sm">{formatearPlazoVenta(venta) || 'N/A'}</p>
                      {venta.porcentaje_interes !== undefined && venta.porcentaje_interes !== 0 && (
                        <p className={`text-xs ${venta.tipo_interes === 'descuento' ? 'text-green-600' : 'text-orange-600'}`}>
                          {venta.tipo_interes === 'descuento' ? '↓' : '↑'} {Math.abs(venta.porcentaje_interes)}%
                        </p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-xs text-gray-500 mb-0.5">Cuotas</p>
                      <p className="font-medium text-gray-900 text-sm">{venta.cantidad_cuotas ?? '—'}</p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                    <Link href={`/ventas/${venta.id}/factura`} className="flex items-center gap-1.5 text-blue-600 text-sm font-medium" title="Comprobante">
                      <FileText className="w-4 h-4" /> Comprobante
                    </Link>
                    {ventasConPagos.has(venta.id) && (
                      <Link href={`/ventas/${venta.id}/pagos`} className="flex items-center gap-1.5 text-green-600 text-sm font-medium" title="Recibos">
                        <Receipt className="w-4 h-4" /> Recibos
                      </Link>
                    )}
                    {isAdmin && (
                      <div className="ml-auto flex items-center gap-2">
                        <button onClick={() => handleEdit(venta)} className="text-blue-500 hover:text-blue-700" title="Editar">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteClick(venta)} className="text-red-500 hover:text-red-700" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
              })}
            </div>

            {/* Tabla — visible solo en sm+ */}
            <div className="hidden sm:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plazo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuotas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Pendiente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {ventasFiltradas.map((venta) => {
                      const estadoBadge = venta.saldo_pendiente <= 0
                        ? { label: 'Pagado', cls: 'bg-gray-100 text-gray-500' }
                        : venta.cargosMora && venta.cargosMora > 0
                          ? { label: 'En mora', cls: 'bg-red-100 text-red-700' }
                          : { label: 'Al día', cls: 'bg-green-100 text-green-700' }
                      return (
                      <tr key={venta.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{venta.cliente?.nombre_completo || 'N/A'}</div>
                          <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${estadoBadge.cls}`}>
                            {estadoBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {venta.motor?.marca} {venta.motor?.modelo ? `- ${venta.motor.modelo}` : ''} {venta.motor?.numero_chasis ? `(${venta.motor.numero_chasis})` : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(venta.plazo_meses ?? venta.cantidad_cuotas) ? (
                            <div>
                              <div>{formatearPlazoVenta(venta)}</div>
                              {venta.porcentaje_interes !== undefined && venta.porcentaje_interes !== 0 && (
                                <div className={`text-xs ${venta.tipo_interes === 'descuento' ? 'text-green-600' : 'text-orange-600'}`}>
                                  {venta.tipo_interes === 'descuento' ? '↓' : '↑'} {Math.abs(venta.porcentaje_interes)}%
                                </div>
                              )}
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${formatCurrency(venta.monto_total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {venta.cantidad_cuotas}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-900">${formatCurrency(venta.saldo_pendiente)}</span>
                            {venta.cargosMora && venta.cargosMora > 0 && (
                              <span className="flex items-center text-red-600 font-semibold" title={`Cargo por mora: $${formatCurrency(venta.cargosMora)}`}>
                                <AlertTriangle className="w-4 h-4 mr-1" />
                                +${formatCurrency(venta.cargosMora)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(venta.fecha_venta).toLocaleDateString('es-DO')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Link href={`/ventas/${venta.id}/factura`} className="text-primary-600 hover:text-primary-900 inline-block" title="Ver Comprobante">
                            <FileText className="w-5 h-5 inline" />
                          </Link>
                          {ventasConPagos.has(venta.id) && (
                            <Link href={`/ventas/${venta.id}/pagos`} className="text-green-600 hover:text-green-900 inline-block" title="Ver Recibos de Pago">
                              <Receipt className="w-5 h-5 inline" />
                            </Link>
                          )}
                          {isAdmin && (
                            <>
                              <button onClick={() => handleEdit(venta)} className="text-blue-600 hover:text-blue-900 inline-block" title="Editar Financiamiento">
                                <Edit className="w-5 h-5 inline" />
                              </button>
                              <button onClick={() => handleDeleteClick(venta)} className="text-red-600 hover:text-red-900 inline-block" title="Eliminar Financiamiento">
                                <Trash2 className="w-5 h-5 inline" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}</>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingVenta ? 'Editar Financiamiento' : 'Emitir Nuevo Financiamiento'}
        size="lg"
      >
        <VentaForm
          venta={editingVenta}
          onSuccess={handleSuccess}
          onCancel={handleCloseModal}
        />
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Eliminar Financiamiento"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
            <p className="text-sm text-red-700 font-semibold mb-2">Esta acción no se puede deshacer</p>
            <p className="text-sm text-red-700">
              El financiamiento, todos sus pagos asociados y las cuotas detalladas serán eliminados permanentemente.
            </p>
          </div>
          {ventaToDelete && (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-700 mb-2"><strong>Financiamiento a eliminar:</strong></p>
              <p className="text-sm text-gray-600"><strong>Cliente:</strong> {ventaToDelete.cliente?.nombre_completo || 'N/A'}</p>
              <p className="text-sm text-gray-600"><strong>Producto:</strong> {ventaToDelete.motor?.marca} {ventaToDelete.motor?.modelo || ''}</p>
              <p className="text-sm text-gray-600"><strong>Monto:</strong> ${ventaToDelete.monto_total != null ? formatCurrency(ventaToDelete.monto_total) : 'N/A'}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña de Administrador <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Ingresa tu contraseña para confirmar"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Por seguridad, debes ingresar tu contraseña para confirmar la eliminación.
            </p>
          </div>
          <div className="btn-actions">
            <Button variant="secondary" onClick={handleCloseDeleteModal} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting || !adminPassword.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Eliminando...' : 'Eliminar Financiamiento'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


