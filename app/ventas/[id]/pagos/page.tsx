'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileText } from 'lucide-react'
import { Button } from '@/components/Button'
import { pagosService } from '@/lib/services/pagos'
import { ventasService } from '@/lib/services/ventas'
import { obtenerCargosMora } from '@/lib/services/mora'
import type { Pago, Venta } from '@/types'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function PagosVentaPage() {
  const params = useParams()
  const router = useRouter()
  const ventaId = params.id as string
  const [venta, setVenta] = useState<Venta | null>(null)
  const [pagos, setPagos] = useState<Pago[]>([])
  const [cargosMora, setCargosMora] = useState<any[]>([])
  const [totalCargosMora, setTotalCargosMora] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ventaId) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventaId])

  async function loadData() {
    try {
      setLoading(true)
      const [ventaData, pagosData] = await Promise.all([
        ventasService.getById(ventaId),
        pagosService.getByVenta(ventaId),
      ])
      setVenta(ventaData)
      // Ordenar pagos por fecha y hora (más recientes primero)
      // Usar fecha_hora si existe (más preciso), sino created_at, sino fecha_pago
      const pagosOrdenados = [...(pagosData || [])].sort((a, b) => {
        // Prioridad 1: fecha_hora (más preciso - fecha y hora exacta del pago)
        const fechaHoraA = a.fecha_hora ? new Date(a.fecha_hora).getTime() : 0
        const fechaHoraB = b.fecha_hora ? new Date(b.fecha_hora).getTime() : 0
        if (fechaHoraA !== fechaHoraB && fechaHoraA > 0 && fechaHoraB > 0) {
          return fechaHoraB - fechaHoraA // Descendente (más reciente primero)
        }
        
        // Prioridad 2: created_at (cuando se creó el registro)
        const createdA = a.created_at ? new Date(a.created_at).getTime() : 0
        const createdB = b.created_at ? new Date(b.created_at).getTime() : 0
        if (createdB !== createdA) {
          return createdB - createdA // Descendente (más reciente primero)
        }
        
        // Prioridad 3: fecha_pago (fecha del pago sin hora)
        const fechaA = new Date(a.fecha_pago).getTime()
        const fechaB = new Date(b.fecha_pago).getTime()
        return fechaB - fechaA // Descendente (más reciente primero)
      })
      setPagos(pagosOrdenados)
      
      // Calcular cargos por mora
      if (ventaData && ventaData.saldo_pendiente > 0) {
        try {
          const cargos = await obtenerCargosMora(ventaId)
          setCargosMora(cargos)
          const total = cargos.reduce((sum, cargo) => sum + cargo.montoCargo, 0)
          setTotalCargosMora(total)
        } catch (error) {
          console.error('Error calculando cargos por mora:', error)
          setCargosMora([])
          setTotalCargosMora(0)
        }
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
      alert('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!venta) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Venta no encontrada</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Button variant="secondary" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 mr-2 inline" />
          Volver a Financiamientos Emitidos
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Recibos de Pago</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Cliente:</p>
              <p className="font-semibold">{venta.cliente?.nombre_completo || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Producto:</p>
              <p className="font-semibold">
                {venta.motor?.marca} {venta.motor?.modelo ? `- ${venta.motor.modelo}` : ''} {venta.motor?.numero_chasis ? `(${venta.motor.numero_chasis})` : ''}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Monto Total:</p>
              <p className="font-semibold">${venta.monto_total.toLocaleString('es-DO')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Saldo Pendiente:</p>
              <p className="font-semibold text-red-600">
                ${venta.saldo_pendiente.toLocaleString('es-DO')}
              </p>
              {totalCargosMora > 0 && (
                <p className="text-sm text-red-600 mt-1 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Cargos por mora: ${totalCargosMora.toLocaleString('es-DO')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {cargosMora.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg shadow p-6 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-3">
                Pagos Atrasados - Cargos por Mora
              </h3>
              <div className="space-y-2">
                {cargosMora.map((cargo, index) => {
                  const fechaVenc = new Date(cargo.fechaVencimiento)
                  return (
                    <div key={index} className="bg-white rounded-md p-3 border border-red-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Cuota #{cargo.cuotaVencida} - Vencida el {fechaVenc.toLocaleDateString('es-DO')}
                          </p>
                          <p className="text-xs text-gray-600">
                            {cargo.diasAtraso} días de atraso
                          </p>
                        </div>
                        <p className="text-lg font-bold text-red-600">
                          +${cargo.montoCargo.toLocaleString('es-DO')}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-red-200">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-red-900">Total de Cargos por Mora:</p>
                  <p className="text-xl font-bold text-red-600">
                    ${totalCargosMora.toLocaleString('es-DO')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {pagos.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No hay pagos registrados para esta venta</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Historial de Pagos ({pagos.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cuota
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
                      <div>{new Date(pago.fecha_pago).toLocaleDateString('es-DO')}</div>
                      <div className="text-xs text-gray-500">
                        {pago.created_at 
                          ? new Date(pago.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })
                          : new Date(pago.fecha_pago).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${pago.monto.toLocaleString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pago.numero_cuota !== null && pago.numero_cuota !== undefined 
                        ? pago.numero_cuota 
                        : <span className="text-blue-600 font-medium">Pago Inicial</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/pagos/${pago.id}/recibo`}
                        className="text-primary-600 hover:text-primary-900"
                        target="_blank"
                      >
                        <FileText className="w-5 h-5 inline mr-1" />
                        Ver Recibo
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

