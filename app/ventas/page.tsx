'use client'

import { useEffect, useState } from 'react'
import { Plus, FileText, Receipt, Edit, Trash2 } from 'lucide-react'
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
      alert('Error al cargar los financiamientos emitidos')
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
      alert('Solo los administradores pueden eliminar financiamientos.')
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
      alert('Por favor, ingresa tu contraseña de administrador para confirmar la eliminación')
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
      alert('Financiamiento eliminado correctamente')
    } catch (error: any) {
      alert(error?.message || 'Error al eliminar el financiamiento')
    } finally {
      setDeleting(false)
      setAdminPassword('')
    }
  }

  function handleSuccess() {
    handleCloseModal()
    loadVentas()
    if (planType === 'TRIAL') {
      subscriptionService.getTrialFinanciamientosCreados().then(setTrialFinanciamientosCreados)
    }
  }

  const isTrial = planType === 'TRIAL'
  const trialLimiteAlcanzado = isTrial && trialFinanciamientosCreados >= subscriptionService.TRIAL_MAX_FINANCIAMIENTOS

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

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Emitir Financiamiento</h1>
        <Button
          onClick={handleCreate}
          disabled={trialLimiteAlcanzado}
          title={trialLimiteAlcanzado ? 'En plan de prueba solo puedes emitir 3 financiamientos. Ya utilizaste tu cupo.' : undefined}
        >
          <Plus className="w-5 h-5 mr-2 inline" />
          Emitir Nuevo Financiamiento
        </Button>
      </div>

      {(companiaLoading || loading) ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {companiaLoading ? 'Cargando tu empresa...' : 'Cargando...'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plazo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cuotas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo Pendiente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ventas.map((venta) => (
                  <tr key={venta.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venta.cliente?.nombre_completo || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venta.motor?.marca} {venta.motor?.modelo ? `- ${venta.motor.modelo}` : ''} {venta.motor?.numero_chasis ? `(${venta.motor.numero_chasis})` : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(venta.plazo_meses ?? venta.cantidad_cuotas) ? (
                        <div>
                          <div>{formatearPlazoVenta(venta)}</div>
                          {venta.porcentaje_interes !== undefined && venta.porcentaje_interes !== 0 && (
                            <div className={`text-xs ${
                              venta.tipo_interes === 'descuento' ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              {venta.tipo_interes === 'descuento' ? '↓' : '↑'} {Math.abs(venta.porcentaje_interes)}%
                            </div>
                          )}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>${venta.monto_total.toLocaleString('es-DO')}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venta.cantidad_cuotas}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900">
                          ${venta.saldo_pendiente.toLocaleString('es-DO')}
                        </span>
                        {venta.cargosMora && venta.cargosMora > 0 && (
                          <span className="flex items-center text-red-600 font-semibold" title={`Cargo por mora: $${venta.cargosMora.toLocaleString('es-DO')}`}>
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            +${venta.cargosMora.toLocaleString('es-DO')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(venta.fecha_venta).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Link
                        href={`/ventas/${venta.id}/factura`}
                        className="text-primary-600 hover:text-primary-900 inline-block"
                        title="Ver Comprobante"
                      >
                        <FileText className="w-5 h-5 inline" />
                      </Link>
                      {ventasConPagos.has(venta.id) && (
                        <Link
                          href={`/ventas/${venta.id}/pagos`}
                          className="text-green-600 hover:text-green-900 inline-block"
                          title="Ver Recibos de Pago"
                        >
                          <Receipt className="w-5 h-5 inline" />
                        </Link>
                      )}
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleEdit(venta)}
                            className="text-blue-600 hover:text-blue-900 inline-block"
                            title="Editar Financiamiento"
                          >
                            <Edit className="w-5 h-5 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(venta)}
                            className="text-red-600 hover:text-red-900 inline-block"
                            title="Eliminar Financiamiento"
                          >
                            <Trash2 className="w-5 h-5 inline" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ventas.length === 0 && (
              <div className="text-center py-8 text-gray-500 px-4">
                Aún no tienes préstamos registrados. ¡Comienza haciendo clic en el botón de arriba para emitir tu primer desembolso y hacer crecer tu cartera!
              </div>
            )}
          </div>
        </div>
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
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <p className="text-sm text-red-700 font-semibold mb-2">⚠️ Esta acción no se puede deshacer</p>
            <p className="text-sm text-red-700">
              El financiamiento, todos sus pagos asociados y las cuotas detalladas serán eliminados permanentemente.
            </p>
          </div>
          {ventaToDelete && (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-700 mb-2"><strong>Financiamiento a eliminar:</strong></p>
              <p className="text-sm text-gray-600"><strong>Cliente:</strong> {ventaToDelete.cliente?.nombre_completo || 'N/A'}</p>
              <p className="text-sm text-gray-600"><strong>Producto:</strong> {ventaToDelete.motor?.marca} {ventaToDelete.motor?.modelo || ''}</p>
              <p className="text-sm text-gray-600"><strong>Monto:</strong> ${ventaToDelete.monto_total?.toLocaleString('es-DO')}</p>
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


