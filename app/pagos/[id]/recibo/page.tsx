'use client'

import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Printer, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/Button'
import { pagosService } from '@/lib/services/pagos'
import { ventasService } from '@/lib/services/ventas'
import { authService } from '@/lib/services/auth'
import { supabase } from '@/lib/supabase'
import { EMPRESA } from '@/lib/constants'
import type { Pago, Venta } from '@/types'
import { formatDateCustom, formatTime12Hours, formatDate } from '@/lib/utils/dateFormat'
import { formatearPlazoVenta } from '@/lib/utils/plazoVenta'

export default function ReciboPagoPage() {
  const params = useParams()
  const router = useRouter()
  const pagoId = params.id as string
  const [pago, setPago] = useState<Pago | null>(null)
  const [venta, setVenta] = useState<Venta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
    // Resetear completamente el estado cuando cambia el pagoId
    setPago(null)
    setVenta(null)
    setNombreEmpresa(null)
    setLoading(true)
    setError(null)
    
    if (pagoId) {
      loadData()
      loadUserInfo()
    } else {
      setLoading(false)
      setError('ID de pago no proporcionado')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagoId])

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
    // Validar que tenemos un pagoId válido
    if (!pagoId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Resetear estados previos
      setPago(null)
      setVenta(null)
      
      // Intentar cargar el pago, con reintentos si es necesario
      let pagoData = await pagosService.getById(pagoId)
      
      // Si no se encuentra, esperar un momento y reintentar (útil en producción)
      if (!pagoData && pagoId) {
        await new Promise(resolve => setTimeout(resolve, 500))
        pagoData = await pagosService.getById(pagoId)
      }
      
      // Si aún no se encuentra después del reintento, lanzar error
      if (!pagoData) {
        throw new Error(`Pago con ID ${pagoId} no encontrado`)
      }
      
      // Verificar que el pago tiene el ID correcto
      if (pagoData.id !== pagoId) {
        console.warn('El ID del pago no coincide con el ID solicitado')
      }
      
      setPago(pagoData)
      
      // La venta viene incluida en la relación
      let ventaData: Venta | null = null
      
      if (pagoData.venta) {
        // La venta viene como objeto o array (dependiendo de cómo Supabase lo devuelva)
        const venta = Array.isArray(pagoData.venta) ? pagoData.venta[0] : pagoData.venta
        ventaData = venta as Venta
      }
      
      // Siempre obtener la venta completa para asegurar que tenga todas las relaciones
      if (pagoData.venta_id) {
        try {
          const ventaCompleta = await ventasService.getById(pagoData.venta_id)
          if (ventaCompleta) {
            // Combinar datos: usar la venta completa pero mantener datos de la relación si existen
            ventaData = {
              ...ventaCompleta,
              // Mantener relaciones de la venta completa (que deberían estar cargadas)
              motor: ventaCompleta.motor || ventaData?.motor,
              cliente: ventaCompleta.cliente || ventaData?.cliente,
            }
          }
        } catch (error) {
          console.error('Error obteniendo venta completa:', error)
          // Continuar con la venta de la relación si existe
        }
      }
      
      if (!ventaData) {
        throw new Error('Venta no encontrada para este pago')
      }
      
      // Verificar que la venta tenga las relaciones necesarias
      if (!ventaData.motor || !ventaData.cliente) {
        console.warn('La venta no tiene todas las relaciones necesarias', {
          tieneMotor: !!ventaData.motor,
          tieneCliente: !!ventaData.cliente,
          ventaId: ventaData.id
        })
        
        // Intentar obtener las relaciones faltantes una vez más
        if (ventaData.id && (!ventaData.motor || !ventaData.cliente)) {
          try {
            const ventaReintento = await ventasService.getById(ventaData.id)
            if (ventaReintento) {
              ventaData.motor = ventaReintento.motor || ventaData.motor
              ventaData.cliente = ventaReintento.cliente || ventaData.cliente
            }
          } catch (error) {
            console.error('Error en reintento de obtener relaciones:', error)
          }
        }
      }
      
      setVenta(ventaData)

      // Cargar nombre de la empresa desde la tabla empresas (evitar mostrar ID en el recibo)
      const empresaId = (pagoData as { empresa_id?: string }).empresa_id ?? (ventaData as { empresa_id?: string }).empresa_id
      if (empresaId) {
        try {
          const { data: emp } = await supabase.from('empresas').select('nombre').eq('id', empresaId).single() as { data: { nombre?: string } | null }
          if (emp?.nombre) setNombreEmpresa(emp.nombre)
        } catch (e) {
          console.warn('No se pudo cargar nombre de empresa para recibo:', e)
        }
      }

      setError(null) // Limpiar cualquier error previo
    } catch (error: any) {
      console.error('Error cargando datos del recibo:', error)
      // Resetear estados en caso de error
      setPago(null)
      setVenta(null)
      const errorMessage = error?.message || 'Error desconocido'
      setError(errorMessage)
      // Solo mostrar alert si no es un error de "no encontrado" (para evitar spam)
      if (!errorMessage.includes('no encontrado')) {
        alert(`Error al cargar los datos del recibo: ${errorMessage}\n\nPor favor, intente nuevamente.`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Función para recargar los datos manualmente
  function handleReload() {
    if (pagoId) {
      loadData()
    }
  }

  function handlePrint(e?: MouseEvent<HTMLButtonElement>) {
    // Prevenir comportamiento por defecto si hay evento
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    console.log('handlePrint llamado', { pago: !!pago, venta: !!venta })
    
    try {
      // Verificar que los datos estén cargados antes de imprimir
      if (!pago || !venta) {
        const errorMsg = `Error: No se puede imprimir. El recibo no está cargado completamente. Pago: ${!!pago}, Venta: ${!!venta}`
        console.error(errorMsg)
        alert(errorMsg)
        return
      }
      
      // Verificar que window.print existe
      if (typeof window === 'undefined' || typeof window.print !== 'function') {
        const errorMsg = 'Error: window.print no está disponible en este entorno.'
        console.error(errorMsg)
        alert(errorMsg)
        return
      }
      
      console.log('Intentando imprimir...')
      
      // Usar requestAnimationFrame para asegurar que el DOM esté completamente renderizado
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            console.log('Llamando a window.print()')
            window.print()
            console.log('window.print() llamado exitosamente')
          } catch (error) {
            console.error('Error al llamar window.print():', error)
            alert(`Error al abrir el diálogo de impresión: ${error instanceof Error ? error.message : 'Error desconocido'}`)
          }
        }, 200) // Aumentado a 200ms para producción
      })
    } catch (error) {
      console.error('Error en handlePrint:', error)
      alert(`Error al preparar la impresión: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando recibo...</p>
        </div>
      </div>
    )
  }

  if (!pago || !venta) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {error || 'Pago no encontrado'}
          </p>
          {error && (
            <div className="mb-4">
              <Button variant="secondary" onClick={handleReload} className="mr-2">
                Reintentar
              </Button>
            </div>
          )}
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5 mr-2 inline" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  // Validar que los datos necesarios existan
  const cliente = venta.cliente || null
  const motor = venta.motor || null

  // Nombre de empresa para el recibo: desde BD; si user_metadata.compania es UUID no usarlo
  const esUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  const displayNombreEmpresa =
    nombreEmpresa ??
    (userInfo?.compania && !esUuid(userInfo.compania) ? userInfo.compania : null) ??
    EMPRESA.nombre

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="no-print mb-4 flex justify-between items-center">
        <Button variant="secondary" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 mr-2 inline" />
          Volver
        </Button>
        <Button 
          onClick={handlePrint}
          type="button"
          aria-label="Imprimir recibo de pago"
        >
          <Printer className="w-5 h-5 mr-2 inline" />
          Imprimir Recibo
        </Button>
      </div>

      <div className="bg-white shadow-lg p-8 print:shadow-none print:p-6">
        {/* Encabezado de la Empresa */}
        <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            JASICORPORATIONS
          </h1>
          {(userInfo || displayNombreEmpresa) && (
            <div className="text-sm text-gray-600 space-y-1 mt-4">
              {displayNombreEmpresa && !/jasicorporation/i.test(displayNombreEmpresa) && (
                <p className="text-3xl font-bold text-gray-900 mb-2">{displayNombreEmpresa}</p>
              )}
              {(userInfo?.nombre || userInfo?.apellido) && (
                <p>
                  {userInfo.nombre} {userInfo.apellido}
                </p>
              )}
              {userInfo?.direccion && (
                <p>{userInfo.direccion}</p>
              )}
              {userInfo?.rnc && (
                <p>RNC: {userInfo.rnc}</p>
              )}
              {userInfo?.telefono && (
                <p>Teléfono: {userInfo.telefono}</p>
              )}
              {userInfo?.email && (
                <p>Email: {userInfo.email}</p>
              )}
            </div>
          )}
        </div>

        {/* Título del Recibo */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">RECIBO DE PAGO</h2>
          <p className="text-gray-600 mt-2">Número de Recibo: {pago.id.slice(0, 8).toUpperCase()}</p>
        </div>

        {/* Información del Pago */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Fecha de Pago:</p>
              <p className="font-semibold text-lg">
                {formatDateCustom(pago.fecha_pago, 'dd/MM/yyyy')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Hora:</p>
              <p className="font-semibold text-lg">
                {formatTime12Hours(pago.fecha_pago)}
              </p>
            </div>
          </div>
        </div>

        {/* Información del Cliente */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Datos del Cliente</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Nombre Completo:</p>
              <p className="font-medium">{cliente?.nombre_completo || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cédula:</p>
              <p className="font-medium">{cliente?.cedula || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-600">Dirección:</p>
              <p className="font-medium">{cliente?.direccion || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Información del Producto Vendido */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Detalles del Producto Vendido</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Producto:</p>
              <p className="font-medium">
                {motor ? `${motor.marca} ${motor.modelo ? `- ${motor.modelo}` : ''} (${motor.numero_chasis})` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">No. de Producto:</p>
              <p className="font-medium">{motor?.numero_chasis || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Monto Total del Producto:</p>
              <p className="font-medium">${venta.monto_total.toLocaleString('es-DO')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Plazo:</p>
              <p className="font-medium">{formatearPlazoVenta(venta)}</p>
            </div>
          </div>
        </div>

        {/* Detalles del Pago */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Detalles del Pago</h3>
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Monto del Pago:</p>
                <p className="font-bold text-2xl text-green-600">
                  ${pago.monto.toLocaleString('es-DO')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Número de Cuota:</p>
                <p className="font-semibold text-lg">
                  {pago.numero_cuota || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Saldo Pendiente */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <div className="bg-blue-50 p-4 rounded-md">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Saldo Anterior:</p>
                <p className="font-semibold">
                  ${(venta.saldo_pendiente + pago.monto).toLocaleString('es-DO')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Saldo Pendiente:</p>
                <p className="font-semibold text-lg text-red-600">
                  ${venta.saldo_pendiente.toLocaleString('es-DO')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Firmas */}
        <div className="mt-8 grid grid-cols-2 gap-8">
          <div className="border-t-2 border-gray-300 pt-4">
            <p className="text-sm text-gray-600 mb-2">Firma del Cliente</p>
            <div className="h-20 border-b border-gray-300"></div>
            <p className="text-xs text-gray-500 mt-2">
              {cliente?.nombre_completo || 'Cliente'}
            </p>
          </div>
          <div className="border-t-2 border-gray-300 pt-4">
            <p className="text-sm text-gray-600 mb-2">Firma del Representante</p>
            <div className="h-20 border-b border-gray-300"></div>
            <p className="text-xs text-gray-500 mt-2">
              {displayNombreEmpresa}
            </p>
          </div>
        </div>

        {/* Pie de página */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>Gracias por su pago</p>
          <p className="mt-2">{displayNombreEmpresa}</p>
          <p className="mt-1">Fecha de impresión: {formatDate(new Date())} {formatTime12Hours(new Date())}</p>
        </div>
      </div>
    </div>
  )
}

