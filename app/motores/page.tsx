'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Printer } from 'lucide-react'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { MotorForm } from '@/components/forms/MotorForm'
import { motoresService } from '@/lib/services/motores'
import type { Motor } from '@/types'
import { especificacionesAListado, getDescripcionProductoListado } from '@/lib/utils/especificacionesProducto'
import { toast } from '@/lib/toast'

export default function MotoresPage() {
  const [motores, setMotores] = useState<Motor[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMotor, setEditingMotor] = useState<Motor | null>(null)

  useEffect(() => {
    loadMotores()
  }, [])

  async function loadMotores() {
    try {
      setLoading(true)
      const data = await motoresService.getAll()
      setMotores(data)
    } catch (error) {
      console.error('Error cargando productos:', error)
      toast.error('Error al cargar los productos')
    } finally {
      setLoading(false)
    }
  }

  function handleCreate() {
    setEditingMotor(null)
    setIsModalOpen(true)
  }

  function handleEdit(motor: Motor) {
    setEditingMotor(motor)
    setIsModalOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Está seguro de eliminar este producto?')) return

    try {
      await motoresService.delete(id)
      loadMotores()
      toast.success('Producto eliminado exitosamente')
    } catch (error: any) {
      console.error('Error eliminando producto:', error)
      toast.error(error?.message || 'Error al eliminar el producto')
    }
  }

  function handleCloseModal() {
    setIsModalOpen(false)
    setEditingMotor(null)
  }

  function handleSuccess() {
    handleCloseModal()
    loadMotores()
  }

  // Filtrar motores en existencia (cantidad > 0)
  const motoresEnExistencia = motores.filter(m => (m.cantidad || 0) > 0)
  const totalEnExistencia = motoresEnExistencia.reduce((sum, m) => sum + (m.cantidad || 0), 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8 no-print">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Inventario</h1>
        <div className="flex gap-2">
          <Button onClick={() => window.print()} variant="secondary">
            <Printer className="w-5 h-5 mr-2 inline" />
            Imprimir Stock Disponible
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-5 h-5 mr-2 inline" />
            Añadir Producto
          </Button>
        </div>
      </div>

      {/* Encabezado para impresión */}
      <div className="print-only mb-4 text-center">
        <h1 className="text-2xl font-bold mb-2">Inventario de Artículos</h1>
        <p className="text-sm text-gray-600 mb-1">Fecha: {new Date().toLocaleDateString('es-DO')}</p>
        <p className="text-sm text-gray-600">
          Total de artículos en stock: {totalEnExistencia}
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-48" />
                <div className="h-3 bg-gray-100 rounded w-32" />
              </div>
              <div className="h-4 w-10 bg-gray-100 rounded" />
              <div className="h-4 w-20 bg-gray-100 rounded" />
              <div className="h-6 w-16 bg-gray-100 rounded-full" />
              <div className="flex gap-3">
                <div className="h-5 w-5 bg-gray-100 rounded" />
                <div className="h-5 w-5 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden print:shadow-none">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="min-w-full divide-y divide-gray-100 print:table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto / Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider no-print">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {motores.map((motor) => {
                  const tieneExistencia = (motor.cantidad || 0) > 0
                  const estadoLabel =
                    motor.estado === 'Disponible'
                      ? 'Nuevo'
                      : motor.estado === 'Reacondicionado'
                        ? 'Reacondicionado (Open Box)'
                        : motor.estado
                  const estadoDisponible = ['Nuevo', 'Reacondicionado', 'Usado', 'Disponible'].includes(motor.estado)
                  const stock = motor.cantidad ?? 0
                  return (
                  <tr 
                    key={motor.id}
                    className={!tieneExistencia ? 'print:hidden' : ''}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{getDescripcionProductoListado(motor)}</div>
                        {motor.numero_chasis && (
                          <div className="text-xs text-gray-500 mt-0.5">Código: {motor.numero_chasis}</div>
                        )}
                        {motor.numero_chasis_real && (
                          <div className="text-xs text-gray-500 mt-0.5">Serie: {motor.numero_chasis_real}</div>
                        )}
                        {motor.especificaciones && typeof motor.especificaciones === 'object' && Object.keys(motor.especificaciones).length > 0 && (
                          <div className="text-xs text-gray-600 mt-1.5 flex flex-wrap gap-1.5">
                            {especificacionesAListado(motor.especificaciones).map(({ label, value }, idx) => {
                              const displayValue = String(value).length > 35 ? `${String(value).slice(0, 32)}…` : value
                              return (
                                <span
                                  key={`${label}-${idx}`}
                                  className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-gray-700"
                                  title={String(value)}
                                >
                                  <span className="font-medium text-gray-500">{label}:</span>{' '}
                                  {displayValue}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={stock > 0 ? 'font-medium text-gray-900' : 'text-red-600'}>
                        {stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${(motor.precio_venta || 0).toLocaleString('es-DO', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          estadoDisponible && (motor.cantidad || 0) > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {estadoLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium no-print">
                      <button
                        onClick={() => handleEdit(motor)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        <Edit className="w-5 h-5 inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(motor.id)}
                        className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                        disabled={motor.estado === 'Vendido'}
                        title={motor.estado === 'Vendido' ? 'No se puede eliminar un producto vendido' : 'Eliminar producto'}
                      >
                        <Trash2 className="w-5 h-5 inline" />
                      </button>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
            {motores.length === 0 && (
              <div className="text-center py-8 text-gray-500 px-4">
                Aún no tienes unidades en inventario. Agrega tu primer motor o producto con el botón de arriba para poder emitir financiamientos.
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingMotor ? 'Editar Producto' : 'Añadir Producto'}
        size="md"
      >
        <MotorForm
          motor={editingMotor}
          onSuccess={handleSuccess}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  )
}


