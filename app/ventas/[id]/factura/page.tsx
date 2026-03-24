'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Printer } from 'lucide-react'
import { Button } from '@/components/Button'
import { ventasService } from '@/lib/services/ventas'
import { pagosService } from '@/lib/services/pagos'
import { authService } from '@/lib/services/auth'
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/lib/utils/compania'
import type { Venta, Pago } from '@/types'
import { formatDateCustom } from '@/lib/utils/dateFormat'
import { formatearPlazoVenta } from '@/lib/utils/plazoVenta'
import { formatCurrency } from '@/lib/utils/currency'
import { toast } from '@/lib/toast'

export default function FacturaPage() {
  const params = useParams()
  const ventaId = params.id as string
  const [venta, setVenta] = useState<Venta | null>(null)
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)
  const [cuotaFija, setCuotaFija] = useState<number | null>(null)
  const [userInfo, setUserInfo] = useState<{
    nombre?: string
    apellido?: string
    direccion?: string
    compania?: string
    rnc?: string
    telefono?: string
    email?: string
  } | null>(null)
  const [nombreEmpresa, setNombreEmpresa] = useState<string | null>(null)

  useEffect(() => {
    if (ventaId) {
      loadData()
      loadUserInfo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventaId])

  async function loadUserInfo() {
    try {
      const user = await authService.getCurrentUser()
      if (user?.user_metadata) {
        setUserInfo({
          nombre: user.user_metadata.nombre,
          apellido: user.user_metadata.apellido,
          direccion: user.user_metadata.direccion,
          compania: user.user_metadata.compania,
          rnc: user.user_metadata.rnc,
          telefono: user.user_metadata.telefono,
          email: user.email,
        })
      }
    } catch (error) {
      console.error('Error cargando información del usuario:', error)
    }
  }

  async function loadData() {
    try {
      setLoading(true)
      const [ventaData, pagosData, cuotaResponse] = await Promise.all([
        ventasService.getById(ventaId),
        pagosService.getByVenta(ventaId),
        supabase
          .from('cuotas_detalladas')
          .select('cuota_fija')
          .eq('venta_id', ventaId)
          .order('numero_cuota', { ascending: true })
          .limit(1),
      ])
      setVenta(ventaData)
      setPagos(pagosData || [])
      setCuotaFija((cuotaResponse as any)?.data?.[0]?.cuota_fija ?? null)
      // Nombre de empresa desde BD para impresión (nunca mostrar UUID)
      const empresaId = (ventaData as { empresa_id?: string; compania_id?: string })?.empresa_id ?? (ventaData as { empresa_id?: string; compania_id?: string })?.compania_id
      if (empresaId) {
        try {
          const { data: emp } = await supabase.from('empresas').select('nombre').eq('id', empresaId).single() as { data: { nombre?: string } | null }
          if (emp?.nombre) setNombreEmpresa(emp.nombre)
        } catch (e) {
          console.warn('No se pudo cargar nombre de empresa para factura:', e)
        }
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar los datos del comprobante')
    } finally {
      setLoading(false)
    }
  }

  function handlePrint(e?: React.MouseEvent<HTMLButtonElement>) {
    // Prevenir comportamiento por defecto si hay evento
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    console.log('handlePrint (factura) llamado', { venta: !!venta })
    
    try {
      // Verificar que los datos estén cargados antes de imprimir
      if (!venta) {
        toast.error('No se puede imprimir. El comprobante no está cargado completamente.')
        return
      }

      if (typeof window === 'undefined' || typeof window.print !== 'function') {
        toast.error('window.print no está disponible en este entorno.')
        return
      }

      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            window.print()
          } catch (error) {
            console.error('Error al llamar window.print():', error)
            toast.error(`Error al abrir el diálogo de impresión: ${error instanceof Error ? error.message : 'Error desconocido'}`)
          }
        }, 200)
      })
    } catch (error) {
      console.error('Error en handlePrint:', error)
      toast.error(`Error al preparar la impresión: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando comprobante...</p>
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

  const totalPagado = pagos.reduce((sum, pago) => sum + pago.monto, 0)
  const saldoPendienteInicial = venta ? venta.saldo_pendiente + totalPagado : 0
  // Nombre para impresión: solo desde BD o texto que no sea UUID
  const displayNombreEmpresa =
    nombreEmpresa ??
    (userInfo?.compania && !isValidUUID(userInfo.compania) ? userInfo.compania : null) ??
    'JASICORPORATIONS'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="no-print mb-4">
        <Button 
          onClick={handlePrint}
          type="button"
          aria-label="Imprimir comprobante de préstamo"
        >
          <Printer className="w-5 h-5 mr-2 inline" />
          Imprimir Comprobante
        </Button>
      </div>

      <div className="bg-white shadow-lg p-8 print:shadow-none">
        {/* Encabezado */}
        <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            JASICORPORATIONS
          </h1>
          {(userInfo || displayNombreEmpresa) && (
            <div className="text-sm text-gray-600 space-y-1 mt-4">
              {displayNombreEmpresa && !/jasicorporation/i.test(displayNombreEmpresa) && (
                <p className="text-3xl font-bold text-gray-900 mb-2">{displayNombreEmpresa}</p>
              )}
              {(userInfo.nombre || userInfo.apellido) && (
                <p>
                  {userInfo.nombre} {userInfo.apellido}
                </p>
              )}
              {userInfo.direccion && (
                <p>{userInfo.direccion}</p>
              )}
              {userInfo.rnc && (
                <p>RNC: {userInfo.rnc}</p>
              )}
              {userInfo.telefono && (
                <p>Teléfono: {userInfo.telefono}</p>
              )}
              {userInfo.email && (
                <p>Email: {userInfo.email}</p>
              )}
            </div>
          )}
          <p className="text-gray-600 mt-4">Comprobante de Financiamiento Emitido</p>
        </div>

        {/* Información del Producto Vendido */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Número de Comprobante:</p>
              <p className="font-semibold">{venta.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Fecha de Emisión:</p>
              <p className="font-semibold">
                {formatDateCustom(venta.fecha_venta, 'dd/MM/yyyy')}
              </p>
            </div>
          </div>
        </div>

        {/* Detalles del Producto */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Detalles del Producto</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Marca:</p>
              <p className="font-medium">{venta.motor?.marca || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">No. de Producto:</p>
              <p className="font-medium">{venta.motor?.numero_chasis || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Detalles del Cliente */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Información del Cliente</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Nombre Completo:</p>
              <p className="font-medium">{venta.cliente?.nombre_completo || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cédula:</p>
              <p className="font-medium">{venta.cliente?.cedula || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-600">Dirección:</p>
              <p className="font-medium">{venta.cliente?.direccion || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-600">Garante:</p>
              <p className="font-medium">{venta.cliente?.nombre_garante || 'N/A'}</p>
            </div>
          </div>
        </div>

            {/* Términos de Financiamiento */}
            <div className="mb-6 border-b border-gray-200 pb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Términos de Financiamiento</h2>
              <div className="grid grid-cols-2 gap-4">
                {(venta.plazo_meses ?? venta.cantidad_cuotas) && (
                  <div>
                    <p className="text-sm text-gray-600">Plazo de Financiamiento:</p>
                    <p className="font-medium">
                      {formatearPlazoVenta(venta)}
                    </p>
                  </div>
                )}
                {venta.porcentaje_interes !== undefined && venta.porcentaje_interes !== 0 && (
                  <div>
                    <p className="text-sm text-gray-600">
                      {venta.tipo_interes === 'descuento' ? 'Descuento' : 'Interés'} Aplicado:
                    </p>
                    <p className={`font-medium ${
                      venta.tipo_interes === 'descuento' ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {venta.porcentaje_interes > 0 ? '+' : ''}
                      {venta.porcentaje_interes}%
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Monto Total:</p>
                  <p className="font-medium text-lg">${formatCurrency(venta.monto_total)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cantidad de Cuotas:</p>
                  <p className="font-medium text-lg">{venta.cantidad_cuotas}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Saldo a Financiar:</p>
                  <p className="font-medium text-lg">
                    ${formatCurrency(saldoPendienteInicial)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valor por Cuota:</p>
                  <p className="font-medium">
                    ${formatCurrency(cuotaFija ?? (venta.cantidad_cuotas > 0 ? saldoPendienteInicial / venta.cantidad_cuotas : 0))}
                  </p>
                </div>
              </div>
            </div>

        {/* Historial de Pagos */}
        {pagos.length > 0 && (
          <div className="mb-6 border-b border-gray-200 pb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Historial de Pagos</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Cuota
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Monto
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {pagos.map((pago) => (
                    <tr key={pago.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {formatDateCustom(pago.fecha_pago, 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {pago.numero_cuota || 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        ${formatCurrency(pago.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Resumen de Pagos */}
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Pagado:</p>
              <p className="font-semibold text-lg text-green-600">
                ${formatCurrency(totalPagado)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Saldo Pendiente:</p>
              <p className="font-semibold text-lg text-red-600">
                ${formatCurrency(venta.saldo_pendiente)}
              </p>
            </div>
          </div>
        </div>

        {/* Pie de página */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>Gracias por su compra</p>
          <p className="mt-2">JASICORPORATIONS</p>
        </div>
      </div>
    </div>
  )
}

