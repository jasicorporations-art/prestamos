'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, AlertCircle, Calendar, Users, RefreshCw, Printer, Search, Receipt, FileText, FileCheck, Database, Shield, DollarSign } from 'lucide-react'
import { obtenerCuotasPendientes, type CuotaPendiente } from '@/lib/services/cuotas'
import { generarMensajeWhatsApp, generarUrlWhatsApp } from '@/lib/services/whatsapp'
import { ventasService } from '@/lib/services/ventas'
import { pagosService } from '@/lib/services/pagos'
import { calcularTotalCargosMora } from '@/lib/services/mora'
import { obtenerInfoBackup, formatearFechaBackup } from '@/lib/services/backups'
import { generarCartaSaldo } from '@/lib/services/cartaSaldo'
import { generarContrato } from '@/lib/services/contrato'
import type { Venta, Pago } from '@/types'
import { FeatureButton } from '@/components/FeatureButton'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { subscriptionService } from '@/lib/services/subscription'
import type { PlanType } from '@/lib/config/planes'

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function getRowClassName(estado: string, diasAtraso: number): string {
  if (estado === 'vencida' && diasAtraso > 0) {
    return 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500'
  }
  if (estado === 'por_vencer') {
    return 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-500'
  }
  return 'bg-white hover:bg-gray-50'
}

function abrirWhatsApp(cuota: CuotaPendiente) {
  const mensaje = generarMensajeWhatsApp(cuota)
  const url = generarUrlWhatsApp(cuota.telefono, mensaje)
  window.open(url, '_blank')
}

interface ClienteConVenta extends Venta {
  montoCuota: number // Monto que paga por cuota
  cuotasPagadas: number
  cuotasPendientes: number
  cargosMora: number // Cargos por mora
}

export default function AdminPanel() {
  const router = useRouter()
  const [cuotas, setCuotas] = useState<CuotaPendiente[]>([])
  const [clientes, setClientes] = useState<ClienteConVenta[]>([])
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingClientes, setLoadingClientes] = useState(true)
  const [loadingPagos, setLoadingPagos] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<'cuotas' | 'clientes' | 'pagos' | 'amortizacion'>('cuotas')
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loadingVentas, setLoadingVentas] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [ultimoBackup, setUltimoBackup] = useState<string | null>(null)
  const [loadingBackup, setLoadingBackup] = useState(false)
  const [generandoCarta, setGenerandoCarta] = useState<string | null>(null)
  const [generandoContrato, setGenerandoContrato] = useState<string | null>(null)
  const [planType, setPlanType] = useState<PlanType | null>(null)

  useEffect(() => {
    subscriptionService.getCurrentPlan().then(setPlanType)
  }, [])

  useEffect(() => {
    // Solo cargar datos de la pestaña activa inicialmente
    if (activeTab === 'cuotas') {
      loadCuotas()
    } else if (activeTab === 'clientes') {
      loadClientes()
    } else if (activeTab === 'pagos') {
      loadPagos()
    }
    
    // Cargar backup info de forma asíncrona sin bloquear la carga principal
    setTimeout(() => {
      loadBackupInfo()
    }, 3000) // Esperar 3 segundos después de cargar los datos principales
    
    // Recargar cada 60 segundos (menos frecuente para mejorar rendimiento)
    const interval = setInterval(() => {
      if (activeTab === 'cuotas') {
        loadCuotas()
      } else if (activeTab === 'clientes') {
        loadClientes()
      } else if (activeTab === 'pagos') {
        loadPagos()
      }
    }, 60000) // Aumentado a 60 segundos
    return () => clearInterval(interval)
  }, [activeTab])

  async function loadBackupInfo() {
    try {
      setLoadingBackup(true)
      const info = await obtenerInfoBackup()
      setUltimoBackup(info.ultimo_backup)
    } catch (error) {
      console.error('Error cargando información de backup:', error)
    } finally {
      setLoadingBackup(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'pagos') {
      loadPagos()
    } else if (activeTab === 'amortizacion') {
      loadVentas()
    }
  }, [activeTab])

  async function loadVentas() {
    try {
      setLoadingVentas(true)
      const allVentas = await ventasService.getAll()
      // Ordenar por fecha de venta (más recientes primero)
      allVentas.sort((a, b) => {
        const dateA = new Date(a.fecha_venta).getTime()
        const dateB = new Date(b.fecha_venta).getTime()
        return dateB - dateA
      })
      setVentas(allVentas)
    } catch (error) {
      console.error('Error cargando ventas:', error)
      setVentas([])
    } finally {
      setLoadingVentas(false)
    }
  }

  async function loadCuotas() {
    try {
      setLoading(true)
      setError(null)
      const data = await obtenerCuotasPendientes()
      setCuotas(data)
      setUltimaActualizacion(new Date())
    } catch (err: any) {
      console.error('Error cargando cuotas:', err)
      setError(err.message || 'Error al cargar las cuotas pendientes')
    } finally {
      setLoading(false)
    }
  }

  async function loadPagos() {
    try {
      setLoadingPagos(true)
      // Limitar a 500 pagos más recientes para mejorar rendimiento
      const allPagos = await pagosService.getAll(500)
      // Ordenar por fecha y hora (más recientes primero)
      // Usar fecha_hora si existe (más preciso), sino created_at, sino fecha_pago
      allPagos.sort((a, b) => {
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
      setPagos(allPagos)
    } catch (err: any) {
      console.error('Error cargando pagos:', err)
    } finally {
      setLoadingPagos(false)
    }
  }

  async function loadClientes() {
    try {
      setLoadingClientes(true)
      
      // Obtener compañía actual para debugging
      const { getCompaniaActual } = await import('@/lib/utils/compania')
      const companiaActual = getCompaniaActual()
      
      const ventas = await ventasService.getAll()
      
      // Limitar a ventas con saldo pendiente para reducir procesamiento
      
      console.log('📊 Ventas cargadas:', ventas.length)
      if (ventas.length > 0) {
        console.log('📋 Ejemplo de venta:', {
          id: ventas[0].id,
          compania_id: ventas[0].compania_id,
          tieneMotor: !!ventas[0].motor,
          tieneCliente: !!ventas[0].cliente,
          saldo_pendiente: ventas[0].saldo_pendiente
        })
      }
      
      // Filtrar solo ventas con saldo pendiente
      const ventasConSaldo = ventas.filter(v => v.saldo_pendiente > 0)
      console.log('💰 Ventas con saldo pendiente:', ventasConSaldo.length)
      
      // Limitar número de ventas a procesar para mejorar rendimiento
      const ventasLimitadas = ventasConSaldo.slice(0, 100) // Máximo 100 ventas
      const cuotaFijaPorVentaId = new Map<string, number>()
      if (ventasLimitadas.length > 0) {
        const ventaIds = ventasLimitadas.map((venta) => venta.id)
        const { data: cuotasData } = await supabase
          .from('cuotas_detalladas')
          .select('venta_id, cuota_fija')
          .in('venta_id', ventaIds)
          .order('numero_cuota', { ascending: true })
        ;((cuotasData || []) as { venta_id: string; cuota_fija?: number }[]).forEach((cuota) => {
          if (!cuotaFijaPorVentaId.has(cuota.venta_id)) {
            cuotaFijaPorVentaId.set(cuota.venta_id, Number(cuota.cuota_fija || 0))
          }
        })
      }
      
      // Procesar información, intentando cargar relaciones faltantes
      // Usar Promise.all pero limitar la concurrencia procesando en lotes
      const clientesConVentas = await Promise.all(
        ventasLimitadas
          .map(async (venta) => {
            // Si faltan relaciones, intentar cargar la venta completa
            if (!venta.motor || !venta.cliente) {
              try {
                const ventaCompleta = await ventasService.getById(venta.id)
                if (ventaCompleta) {
                  venta.motor = ventaCompleta.motor || venta.motor
                  venta.cliente = ventaCompleta.cliente || venta.cliente
                }
              } catch (error) {
                console.error(`Error cargando relaciones para venta ${venta.id}:`, error)
              }
            }
            
            // Solo procesar si tiene cliente y motor
            if (!venta.cliente || !venta.motor) {
              console.warn(`⚠️ Venta ${venta.id} sin relaciones completas:`, {
                tieneCliente: !!venta.cliente,
                tieneClienteId: !!venta.cliente_id,
                tieneMotor: !!venta.motor,
                tieneMotorId: !!venta.motor_id,
                compania_id: venta.compania_id
              })
              
              // Intentar cargar relaciones manualmente si tenemos los IDs
              if (venta.cliente_id && !venta.cliente) {
                try {
                  const { clientesService } = await import('@/lib/services/clientes')
                  const cliente = await clientesService.getById(venta.cliente_id)
                  if (cliente) {
                    venta.cliente = cliente
                    console.log('✅ Cliente cargado manualmente para venta', venta.id)
                  }
                } catch (error) {
                  console.error('Error cargando cliente manualmente:', error)
                }
              }
              
              if (venta.motor_id && !venta.motor) {
                try {
                  const { motoresService } = await import('@/lib/services/motores')
                  const motor = await motoresService.getById(venta.motor_id)
                  if (motor) {
                    venta.motor = motor
                    console.log('✅ Motor cargado manualmente para venta', venta.id)
                  }
                } catch (error) {
                  console.error('Error cargando motor manualmente:', error)
                }
              }
              
              // Si aún faltan relaciones, no procesar esta venta
              if (!venta.cliente || !venta.motor) {
                return null
              }
            }
            try {
              // Limitar pagos a los más recientes (solo necesitamos contar cuotas)
              const pagos = await pagosService.getByVenta(venta.id, 100)
              
              // Contar cuotas únicas pagadas (excluyendo pagos iniciales)
              const cuotasPagadasSet = new Set(
                pagos
                  .map(p => p.numero_cuota)
                  .filter((n): n is number => n !== null && n !== undefined)
              )
              const cuotasPagadas = cuotasPagadasSet.size
              
              // Si el saldo pendiente es 0 o menor, no hay cuotas pendientes
              // independientemente de cuántas cuotas se hayan pagado
              const cuotasPendientes = venta.saldo_pendiente <= 0 
                ? 0 
                : Math.max(0, venta.cantidad_cuotas - cuotasPagadas)
              
              // Calcular monto por cuota actual (usar cuota fija si existe)
              const cuotaFija = cuotaFijaPorVentaId.get(venta.id) || 0
              const montoCuota = cuotaFija > 0
                ? cuotaFija
                : cuotasPendientes > 0
                  ? Math.round((venta.saldo_pendiente / cuotasPendientes) * 100) / 100
                  : 0
              
              // Calcular cargos por mora
              let cargosMora = 0
              try {
                const cargos = await calcularTotalCargosMora(venta.id)
                cargosMora = cargos || 0
              } catch (error) {
                console.error(`Error calculando cargos por mora para venta ${venta.id}:`, error)
                cargosMora = 0
              }
              
              return {
                ...venta,
                montoCuota,
                cuotasPagadas,
                cuotasPendientes,
                cargosMora: cargosMora, // Asegurar que siempre sea un número
              } as ClienteConVenta
            } catch (error) {
              console.error(`Error procesando venta ${venta.id}:`, error)
              return null
            }
          })
      )
      
      // Filtrar valores null
      const clientesValidos = clientesConVentas.filter((c): c is ClienteConVenta => c !== null)
      console.log('Clientes válidos procesados:', clientesValidos.length)
      
      // Ordenar por nombre de cliente
      clientesValidos.sort((a, b) => 
        (a.cliente?.nombre_completo || '').localeCompare(b.cliente?.nombre_completo || '')
      )
      
      setClientes(clientesValidos)
    } catch (err: any) {
      console.error('Error cargando clientes:', err)
    } finally {
      setLoadingClientes(false)
    }
  }

  const cuotasVencidas = cuotas.filter(c => c.estado === 'vencida').length
  const cuotasPorVencer = cuotas.filter(c => c.estado === 'por_vencer').length
  const totalPendiente = cuotas.reduce((sum, c) => sum + c.totalAPagar, 0)

  // Filtrar pagos por término de búsqueda
  const pagosFiltrados = pagos.filter((pago) => {
    if (!searchTerm.trim()) return true
    const nombreCliente = pago.venta?.cliente?.nombre_completo?.toLowerCase() || ''
    const cedula = pago.venta?.cliente?.cedula?.toLowerCase() || ''
    const termino = searchTerm.toLowerCase()
    return nombreCliente.includes(termino) || cedula.includes(termino)
  })
  
  // Nota: El panel solo muestra cuotas vencidas o próximas a vencer (dentro de 3 días)
  // Las cuotas vigentes que aún no están cerca de vencer no se muestran

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center no-print">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
          <p className="text-gray-600">Gestión de clientes y cuotas pendientes</p>
          {ultimaActualizacion && (
            <p className="text-xs text-gray-500 mt-1">
              Última actualización: {ultimaActualizacion.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </p>
          )}
          {/* Información de Seguridad y Backups */}
          <div className="mt-3 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1 text-green-600">
              <Shield className="w-4 h-4" />
              <span>Conexión HTTPS Segura</span>
            </div>
            {!loadingBackup && ultimoBackup && (
              <div className="flex items-center gap-1 text-blue-600">
                <Database className="w-4 h-4" />
                <span>Último respaldo de seguridad: {formatearFechaBackup(ultimoBackup)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/admin/aprobaciones')}
            className="px-4 py-2 bg-amber-100 text-amber-800 rounded-md hover:bg-amber-200 transition-colors flex items-center"
            title="Préstamos y renovaciones pendientes de aprobación"
          >
            <FileCheck className="w-4 h-4 mr-2" />
            Aprobaciones
          </button>
          {planType !== 'BRONCE' && (
            <>
              <button
                onClick={() => router.push('/admin/tesoreria')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center"
                title="Consolidado de caja"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Tesorería
              </button>
              <button
                onClick={() => router.push('/admin/migracion')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center"
                title="Migrar cartera desde otro software"
              >
                <Database className="w-4 h-4 mr-2" />
                Migrar Cartera
              </button>
            </>
          )}
          <button
            onClick={() => {
              loadCuotas()
              loadClientes()
            }}
            disabled={loading || loadingClientes}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading || loadingClientes ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 no-print">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('cuotas')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'cuotas'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Cuotas Pendientes
          </button>
          <button
            onClick={() => setActiveTab('clientes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'clientes'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Todos los Préstamos Activos ({clientes.length})
          </button>
          <button
            onClick={() => setActiveTab('pagos')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pagos'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Receipt className="w-4 h-4 inline mr-2" />
            Facturas Pagadas ({pagos.length})
          </button>
          <button
            onClick={() => setActiveTab('amortizacion')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'amortizacion'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Printer className="w-4 h-4 inline mr-2" />
            Amortización de Préstamos ({ventas.length})
          </button>
        </nav>
      </div>

      {/* Resumen - Solo mostrar en tab de cuotas */}
      {activeTab === 'cuotas' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cuotas Vencidas</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{cuotasVencidas}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Por Vencer (3 días)</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{cuotasPorVencer}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Calendar className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pendiente</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ${totalPendiente.toLocaleString('es-DO', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <MessageCircle className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Cuotas Pendientes */}
      {activeTab === 'cuotas' && (
        <>
          {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando cuotas pendientes...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadCuotas}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      ) : cuotas.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-2">No hay cuotas vencidas o próximas a vencer</p>
          <p className="text-sm text-gray-400">
            Solo se muestran cuotas vencidas o que vencen en los próximos 3 días
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Tabla Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motor (Modelo)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cuota Base
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Vencimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Penalidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total a Pagar
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cuotas.map((cuota) => (
                  <tr key={cuota.id} className={getRowClassName(cuota.estado, cuota.diasAtraso)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {cuota.cliente.nombre_completo}
                      </div>
                      <div className="text-xs text-gray-500">Cuota #{cuota.numeroCuota}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cuota.telefono}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {cuota.motor.marca} (Préstamo: {cuota.motor.numero_chasis})
                      </div>
                      <div className="text-xs text-gray-500">Préstamo: {cuota.motor.numero_chasis}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${cuota.cuotaBase.toLocaleString('es-DO', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(cuota.fechaVencimiento)}</div>
                      {cuota.diasAtraso > 0 && (
                        <div className="text-xs text-red-600 font-medium">
                          {cuota.diasAtraso} día{cuota.diasAtraso !== 1 ? 's' : ''} de atraso
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {cuota.penalidad > 0 ? (
                          <span className="text-red-600 font-medium">
                            ${cuota.penalidad.toLocaleString('es-DO', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        ${cuota.totalAPagar.toLocaleString('es-DO', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <FeatureButton
                        feature="whatsapp_automatico"
                        onClick={() => abrirWhatsApp(cuota)}
                        variant="primary"
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                        title="Enviar mensaje por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp
                      </FeatureButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vista Móvil */}
          <div className="md:hidden divide-y divide-gray-200">
            {cuotas.map((cuota) => (
              <div
                key={cuota.id}
                className={`p-4 ${getRowClassName(cuota.estado, cuota.diasAtraso)}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {cuota.cliente.nombre_completo}
                    </h3>
                    <p className="text-xs text-gray-500">Cuota #{cuota.numeroCuota}</p>
                  </div>
                  {cuota.estado === 'vencida' && (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                      Vencida
                    </span>
                  )}
                  {cuota.estado === 'por_vencer' && (
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                      Por vencer
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Teléfono:</span>
                    <span className="text-gray-900">{cuota.telefono}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Motor:</span>
                    <span className="text-gray-900 font-medium">
                      {cuota.motor.marca} {cuota.motor.matricula}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cuota Base:</span>
                    <span className="text-gray-900">
                      ${cuota.cuotaBase.toLocaleString('es-DO', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Vencimiento:</span>
                    <span className="text-gray-900">{formatDate(cuota.fechaVencimiento)}</span>
                  </div>
                  {cuota.diasAtraso > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Días de atraso:</span>
                      <span className="text-red-600 font-medium">
                        {cuota.diasAtraso} día{cuota.diasAtraso !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {cuota.penalidad > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Penalidad:</span>
                      <span className="text-red-600 font-medium">
                        ${cuota.penalidad.toLocaleString('es-DO', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-200">
                    <span className="text-gray-900">Total a Pagar:</span>
                    <span className="text-gray-900">
                      ${cuota.totalAPagar.toLocaleString('es-DO', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                <FeatureButton
                  feature="whatsapp_automatico"
                  onClick={() => abrirWhatsApp(cuota)}
                  variant="primary"
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar WhatsApp
                </FeatureButton>
              </div>
            ))}
          </div>
        </div>
          )}
        </>
      )}

      {/* Tabla de Todos los Préstamos Activos */}
      {activeTab === 'clientes' && (
        <>
          <div className="mb-4 btn-actions no-print">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              title="Imprimir préstamos activos"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir Clientes
            </button>
          </div>
          {loadingClientes ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando clientes...</p>
            </div>
          ) : clientes.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No hay clientes con préstamos activos</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none print:p-0">
              <div className="overflow-x-auto print:overflow-visible">
                <div className="print-only mb-2 text-center print:text-xs">
                  <h1 className="text-2xl font-bold mb-2 print:text-base print:mb-1">Préstamos Activos</h1>
                  <p className="text-sm text-gray-600 print:text-xs">Fecha: {new Date().toLocaleDateString('es-DO')}</p>
                </div>
                <table className="min-w-full divide-y divide-gray-200 print:table-auto print:w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-2 print:text-xs">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-2 print:text-xs">
                        Cédula
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-2 print:text-xs">
                        Dirección
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-2 print:text-xs">
                        Monto Tomado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-2 print:text-xs">
                        Cuota que Paga
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-2 print:text-xs">
                        Cuota por Pagar
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-2 print:text-xs">
                        Monto Adeudado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clientes.map((venta) => (
                      <tr key={venta.id} className="hover:bg-gray-50 print:hover:bg-white">
                        <td className="px-6 py-4 whitespace-nowrap print:px-2 print:py-2 print:whitespace-normal">
                          <div className="text-sm font-medium text-gray-900 print:text-xs">
                            {venta.cliente?.nombre_completo || 'N/A'}
                          </div>
                          {venta.cliente?.celular && (
                            <div className="text-xs text-gray-500 print:text-xxs">
                              📱 {venta.cliente.celular}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap print:px-2 print:py-2 print:whitespace-normal">
                          <div className="text-sm text-gray-900 print:text-xs">
                            {venta.cliente?.cedula || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 print:px-2 print:py-2">
                          <div className="text-sm text-gray-900 max-w-xs truncate print:max-w-none print:truncate-none print:text-xs" title={venta.cliente?.direccion}>
                            {venta.cliente?.direccion || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap print:px-2 print:py-2 print:whitespace-normal">
                          <div className="text-sm font-medium text-gray-900 print:text-xs">
                            ${venta.monto_total.toLocaleString('es-DO', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap print:px-2 print:py-2 print:whitespace-normal">
                          <div className="text-sm font-medium text-primary-600 print:text-xs">
                            ${venta.montoCuota.toLocaleString('es-DO', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-xs text-gray-500 print:text-xxs print:hidden">
                            por cuota
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap print:px-2 print:py-2 print:whitespace-normal">
                          <div className="text-sm font-medium text-gray-900 print:text-xs">
                            {venta.cuotasPendientes}
                          </div>
                          <div className="text-xs text-gray-500 print:text-xxs print:hidden">
                            cuotas restantes
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap print:px-2 print:py-2 print:whitespace-normal">
                          <div className="text-sm font-bold text-red-600 print:text-xs">
                            ${venta.saldo_pendiente.toLocaleString('es-DO', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          {venta.cargosMora && venta.cargosMora > 0 && (
                            <div className="text-xs text-red-500 print:text-xxs">
                              +${venta.cargosMora.toLocaleString('es-DO', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} mora
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tabla de Facturas Pagadas */}
      {activeTab === 'pagos' && (
        <>
          <div className="mb-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center no-print">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre de cliente o cédula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              title="Imprimir historial de pagos"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir Historial
            </button>
          </div>
          {loadingPagos ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando pagos...</p>
            </div>
          ) : pagos.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No hay pagos registrados</p>
            </div>
          ) : pagosFiltrados.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No se encontraron pagos con el término de búsqueda &quot;{searchTerm}&quot;</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none print:p-0">
              <div className="overflow-x-auto print:overflow-visible">
                <div className="print-only mb-2 text-center print:text-xs">
                  <h1 className="text-2xl font-bold mb-2 print:text-base print:mb-1">Historial de Pagos</h1>
                  <p className="text-sm text-gray-600 print:text-xs">
                    Fecha: {new Date().toLocaleDateString('es-DO')}
                    {searchTerm && ` | Búsqueda: ${searchTerm}`}
                  </p>
                </div>
                <table className="min-w-full divide-y divide-gray-200 print:table-auto print:w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-2 print:text-xs">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-2 print:text-xs">
                        Cédula
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-2 print:text-xs">
                        Fecha de Pago
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-2 print:text-xs">
                        Monto Pagado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-2 print:text-xs">
                        Cuota
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-2 print:text-xs">
                        Préstamo
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-2 print:text-xs no-print">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pagosFiltrados.map((pago) => {
                      const fechaPago = new Date(pago.fecha_pago)
                      const cliente = pago.venta?.cliente
                      const motor = pago.venta?.motor
                      return (
                        <tr key={pago.id} className="hover:bg-gray-50 print:hover:bg-white">
                          <td className="px-6 py-4 whitespace-nowrap print:px-2 print:py-2 print:whitespace-normal">
                            <div className="text-sm font-medium text-gray-900 print:text-xs">
                              {cliente?.nombre_completo || 'N/A'}
                            </div>
                            {cliente?.celular && (
                              <div className="text-xs text-gray-500 print:text-xxs print:hidden">
                                📱 {cliente.celular}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap print:px-2 print:py-2 print:whitespace-normal">
                            <div className="text-sm text-gray-900 print:text-xs">
                              {cliente?.cedula || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap print:px-2 print:py-2 print:whitespace-normal">
                            <div className="text-sm text-gray-900 print:text-xs">
                              {formatDate(fechaPago)}
                            </div>
                            <div className="text-xs text-gray-500 print:text-xxs print:hidden">
                              {fechaPago.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap print:px-2 print:py-2 print:whitespace-normal">
                            <div className="text-sm font-bold text-green-600 print:text-xs">
                              ${pago.monto.toLocaleString('es-DO', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap print:px-2 print:py-2 print:whitespace-normal">
                            <div className="text-sm text-gray-900 print:text-xs">
                              {pago.numero_cuota !== null && pago.numero_cuota !== undefined
                                ? `Cuota #${pago.numero_cuota}`
                                : 'Pago Inicial'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap print:px-2 print:py-2 print:whitespace-normal">
                            <div className="text-sm text-gray-900 print:text-xs">
                              {motor?.marca || 'N/A'}
                            </div>
                            {motor?.numero_chasis && (
                              <div className="text-xs text-gray-500 print:text-xxs">
                                {motor.numero_chasis}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center no-print">
                            <button
                              onClick={() => router.push(`/pagos/${pago.id}/recibo`)}
                              className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
                              title="Ver recibo"
                            >
                              Ver Recibo
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'amortizacion' && (
        <>
          <div className="mb-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center no-print">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre de cliente, cédula o número de producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          {loadingVentas ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando productos...</p>
            </div>
          ) : ventas.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Aún no hay unidades en inventario. Agrega motores o productos desde la sección de inventario.</p>
            </div>
          ) : (
            (() => {
              const ventasFiltradas = ventas.filter((venta) => {
                if (!searchTerm.trim()) return true
                const term = searchTerm.toLowerCase()
                const nombreCliente = venta.cliente?.nombre_completo?.toLowerCase() || ''
                const cedulaCliente = venta.cliente?.cedula?.toLowerCase() || ''
                const numeroPrestamo = venta.motor?.numero_chasis?.toLowerCase() || ''
                return nombreCliente.includes(term) || cedulaCliente.includes(term) || numeroPrestamo.includes(term)
              })

              return ventasFiltradas.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-500">No se encontraron préstamos con el término de búsqueda &quot;{searchTerm}&quot;</p>
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
                            Cédula
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            No. de Producto
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Monto Total
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cuotas
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tipo de Plazo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha de Emisión
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acción
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {ventasFiltradas.map((venta) => (
                          <tr key={venta.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {venta.cliente?.nombre_completo || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {venta.cliente?.cedula || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {venta.motor?.numero_chasis || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${venta.monto_total.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {venta.cantidad_cuotas}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {venta.tipo_plazo === 'semanal' ? 'Semanal' : 
                               venta.tipo_plazo === 'quincenal' ? 'Quincenal' : 
                               'Mensual'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(new Date(venta.fecha_venta))}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    const url = `/ventas/${venta.id}/amortizacion`
                                    window.open(url, '_blank')
                                  }}
                                  className="text-primary-600 hover:text-primary-900 inline-flex items-center"
                                  title="Ver amortización"
                                >
                                  <Printer className="w-4 h-4 mr-1" />
                                  Ver Amortización
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      setGenerandoContrato(venta.id)
                                      await generarContrato(venta)
                                      alert('Contrato generado exitosamente. Se abrirá en una nueva ventana para impresión.')
                                    } catch (error: any) {
                                      console.error('Error generando contrato:', error)
                                      alert(`Error: ${error.message || 'No se pudo generar el contrato'}`)
                                    } finally {
                                      setGenerandoContrato(null)
                                    }
                                  }}
                                  disabled={generandoContrato === venta.id}
                                  className="text-blue-600 hover:text-blue-900 inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Imprimir Contrato"
                                >
                                  <FileCheck className={`w-4 h-4 mr-1 ${generandoContrato === venta.id ? 'animate-spin' : ''}`} />
                                  {generandoContrato === venta.id ? 'Generando...' : 'Imprimir Contrato'}
                                </button>
                                {venta.saldo_pendiente === 0 && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        setGenerandoCarta(venta.id)
                                        await generarCartaSaldo(venta)
                                        alert('Carta de Saldo generada exitosamente')
                                      } catch (error: any) {
                                        console.error('Error generando carta de saldo:', error)
                                        alert(`Error: ${error.message || 'No se pudo generar la carta de saldo'}`)
                                      } finally {
                                        setGenerandoCarta(null)
                                      }
                                    }}
                                    disabled={generandoCarta === venta.id}
                                    className="text-green-600 hover:text-green-900 inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Generar Carta de Saldo"
                                  >
                                    <FileText className={`w-4 h-4 mr-1 ${generandoCarta === venta.id ? 'animate-spin' : ''}`} />
                                    {generandoCarta === venta.id ? 'Generando...' : 'Generar Carta de Saldo'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()
          )}
        </>
      )}
    </div>
  )
}

