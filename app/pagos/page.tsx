'use client'

import { useEffect, useState } from 'react'
import { Plus, FileText, AlertTriangle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { PagoForm } from '@/components/forms/PagoForm'
import { useCompania } from '@/lib/contexts/CompaniaContext'
import { pagosService } from '@/lib/services/pagos'
import { ventasService } from '@/lib/services/ventas'
import type { Pago, Venta } from '@/types'

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
      alert('Error al cargar los datos')
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
      alert(error?.message || 'Error al eliminar el pago')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Cobros</h1>
        <Button onClick={handleCreate} disabled={ventas.length === 0}>
          <Plus className="w-5 h-5 mr-2 inline" />
          Registrar cobro
        </Button>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0 text-green-600" />
          {successMessage}
        </div>
      )}

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
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cuota
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagos.map((pago) => (
                  <tr key={pago.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pago.venta?.cliente?.nombre_completo || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pago.venta?.motor?.marca} {pago.venta?.motor?.modelo ? `- ${pago.venta.motor.modelo}` : ''} {pago.venta?.motor?.numero_chasis ? `(${pago.venta.motor.numero_chasis})` : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${pago.monto.toLocaleString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pago.numero_cuota !== null && pago.numero_cuota !== undefined 
                        ? pago.numero_cuota 
                        : <span className="text-blue-600 font-medium">Pago Inicial</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{new Date(pago.fecha_pago).toLocaleDateString('es-DO')}</div>
                      <div className="text-xs text-gray-400">
                        {pago.created_at 
                          ? new Date(pago.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })
                          : new Date(pago.fecha_pago).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/pagos/${pago.id}/recibo`}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                        target="_blank"
                      >
                        <FileText className="w-5 h-5 inline" />
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(pago)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagos.length === 0 && (
              <div className="text-center py-8 text-gray-500 px-4">
                Aún no tienes cobros registrados. Cuando registres un pago de cuota o un abono, aparecerá aquí. Usa el botón &quot;Registrar cobro&quot; para empezar.
              </div>
            )}
          </div>
        </div>
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
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800 mb-2">
                  ¿Estás seguro? Esta acción es definitiva y protege la integridad de tus datos. El cobro se eliminará y el saldo del financiamiento se recalculará.
                </h3>
                {pagoToDelete && (
                  <div className="text-sm text-red-700 space-y-1">
                    <p><strong>Cliente:</strong> {pagoToDelete.venta?.cliente?.nombre_completo || 'N/A'}</p>
                    <p><strong>Monto:</strong> ${pagoToDelete.monto.toLocaleString('es-DO')}</p>
                    <p><strong>Cuota:</strong> {pagoToDelete.numero_cuota || 'N/A'}</p>
                    <p><strong>Fecha:</strong> {new Date(pagoToDelete.fecha_pago).toLocaleDateString('es-DO')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800 mb-3">
              <strong>Para confirmar, ingrese el siguiente c?digo:</strong>
            </p>
            <div className="bg-white border-2 border-yellow-300 rounded-md p-3 text-center">
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


