'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Printer } from 'lucide-react'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { MotorForm } from '@/components/forms/MotorForm'
import { motoresService } from '@/lib/services/motores'
import type { Motor } from '@/types'

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
      alert('Error al cargar los productos')
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
      alert('Producto eliminado exitosamente')
    } catch (error: any) {
      console.error('Error eliminando producto:', error)
      const mensaje = error?.message || 'Error al eliminar el producto'
      alert(mensaje)
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
            Añadir Préstamo
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
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="min-w-full divide-y divide-gray-200 print:table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código / Serie
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
              <tbody className="bg-white divide-y divide-gray-200">
                {motores.map((motor) => {
                  const tieneExistencia = (motor.cantidad || 0) > 0
                  const estadoLabel =
                    motor.estado === 'Disponible'
                      ? 'Nuevo'
                      : motor.estado === 'Reacondicionado'
                        ? 'Reacondicionado (Open Box)'
                        : motor.estado
                  const estadoDisponible = ['Nuevo', 'Reacondicionado', 'Usado', 'Disponible'].includes(motor.estado)
                  return (
                  <tr 
                    key={motor.id}
                    className={!tieneExistencia ? 'print:hidden' : ''}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">Producto: {motor.numero_chasis}</div>
                        {motor.numero_chasis_real && (
                          <div className="text-xs text-gray-600 mt-1">Serie: {motor.numero_chasis_real}</div>
                        )}
                      </div>
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
        title={editingMotor ? 'Editar Préstamo' : 'Añadir Préstamo'}
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


