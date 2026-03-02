'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Lock, Unlock, Plus, Minus, Printer, RefreshCw, Building2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Modal } from '@/components/Modal'
import { Select } from '@/components/Select'
import { cajasService } from '@/lib/services/cajas'
import { perfilesService } from '@/lib/services/perfiles'
import type { Caja, MovimientoCaja, MovimientoCajaResumen, ResumenTotalesCaja, Sucursal } from '@/types'

export default function CajaPage() {
  const router = useRouter()
  const [caja, setCaja] = useState<Caja | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([])
  const [historialMovimientos, setHistorialMovimientos] = useState<MovimientoCajaResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [isAbriendoCaja, setIsAbriendoCaja] = useState(false)
  const [isAperturaModalOpen, setIsAperturaModalOpen] = useState(false)
  const [isCerrandoCaja, setIsCerrandoCaja] = useState(false)
  const [isCerrarModalOpen, setIsCerrarModalOpen] = useState(false)
  const [isRegistrandoMovimiento, setIsRegistrandoMovimiento] = useState(false)
  const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false)
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false)
  const [historialLoading, setHistorialLoading] = useState(false)
  const [historialFilters, setHistorialFilters] = useState({
    fechaInicio: '',
    fechaFin: '',
  })
  const [historialTotales, setHistorialTotales] = useState<ResumenTotalesCaja | null>(null)
  const [ingresosDia, setIngresosDia] = useState(0)
  const [salidasDia, setSalidasDia] = useState(0)
  
  // Estado para admin: selector de sucursal
  const [esAdmin, setEsAdmin] = useState(false)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<string | null>(null)
  const [puedeEditar, setPuedeEditar] = useState(true)

  // Formulario de apertura
  const [montoApertura, setMontoApertura] = useState('')
  const [observacionesApertura, setObservacionesApertura] = useState('')

  // Formulario de cierre
  const [montoCierreReal, setMontoCierreReal] = useState('')
  const [observacionesCierre, setObservacionesCierre] = useState('')

  // Formulario de movimiento
  const [tipoMovimiento, setTipoMovimiento] = useState<'Entrada' | 'Salida'>('Entrada')
  const [montoMovimiento, setMontoMovimiento] = useState('')
  const [conceptoMovimiento, setConceptoMovimiento] = useState('')
  const [observacionesMovimiento, setObservacionesMovimiento] = useState('')

  const loadCaja = useCallback(async () => {
    try {
      setLoading(true)
      const sucursalId = sucursalSeleccionada || null
      const cajaActual = await cajasService.getCajaAbiertaActual(sucursalId || undefined)
      setCaja(cajaActual)

      if (cajaActual) {
        // Usar siempre la sucursal de la caja para cargar pagos/ingresos (así se reflejan correctamente)
        const sucursalParaPagos = cajaActual.sucursal_id || sucursalId || undefined

        // Cargar movimientos
        const movimientosCaja = await cajasService.getMovimientosCaja(cajaActual.id)
        const pagosMovimientos = await cajasService.getPagosDelDiaMovimientos(
          cajaActual.id,
          cajaActual.fecha,
          sucursalParaPagos
        )
        const movimientosData = [...movimientosCaja, ...pagosMovimientos].sort((a, b) => {
          const fechaA = new Date(a.fecha_hora).getTime()
          const fechaB = new Date(b.fecha_hora).getTime()
          return fechaA - fechaB
        })
        setMovimientos(movimientosData)

        // Calcular ingresos y salidas del mismo día que la caja (misma sucursal)
        const ingresosPagos = await cajasService.getIngresosDelDia(cajaActual.fecha, sucursalParaPagos)
        const ingresosMovimientos = movimientosCaja
          .filter((m) => m.tipo === 'Entrada')
          .reduce((sum, m) => sum + (m.monto || 0), 0)
        const salidas = await cajasService.getSalidasDelDia(cajaActual.id)
        setIngresosDia(ingresosPagos + ingresosMovimientos)
        setSalidasDia(salidas)
      } else {
        setMovimientos([])
        setIngresosDia(0)
        setSalidasDia(0)
      }
    } catch (error: any) {
      console.error('Error cargando caja:', error)
      // No mostrar alerta si es simplemente que no hay caja abierta
      if (error.code !== 'PGRST116' && error.message && !error.message.includes('No hay caja abierta')) {
        console.warn('⚠️ Error cargando caja (posible problema de RLS):', error.message)
        // Continuar sin mostrar alerta para permitir que el usuario intente abrir la caja
      }
    } finally {
      setLoading(false)
    }
  }, [sucursalSeleccionada])

  // Cargar información de admin y sucursales
  useEffect(() => {
    async function loadAdminInfo() {
      try {
        const admin = await perfilesService.esAdmin()
        setEsAdmin(admin)
        
        if (admin) {
          const sucursalesData = await perfilesService.getSucursales()
          setSucursales(sucursalesData)
          
          // Si no hay sucursal seleccionada, usar la del usuario actual
          if (!sucursalSeleccionada) {
            const sucursalActual = await perfilesService.getSucursalActual()
            setSucursalSeleccionada(sucursalActual)
          }
        } else {
          // Si no es admin, usar la sucursal del usuario
          const sucursalActual = await perfilesService.getSucursalActual()
          setSucursalSeleccionada(sucursalActual)
        }
      } catch (error) {
        console.error('Error cargando información de admin:', error)
      }
    }
    
    loadAdminInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Verificar permisos de edición cuando cambia la sucursal seleccionada
  useEffect(() => {
    async function verificarPermisosEdicion() {
      if (esAdmin && sucursalSeleccionada) {
        const sucursalActual = await perfilesService.getSucursalActual()
        setPuedeEditar(sucursalSeleccionada === sucursalActual)
      } else {
        setPuedeEditar(true)
      }
    }
    verificarPermisosEdicion()
  }, [esAdmin, sucursalSeleccionada])

  useEffect(() => {
    loadCaja()

    // Actualizar cada 30 segundos (solo si hay caja)
    const interval = setInterval(() => {
      loadCaja()
    }, 30000)

    return () => clearInterval(interval)
  }, [loadCaja]) // Removido 'caja' de las dependencias para evitar loop infinito

  useEffect(() => {
    if (!isHistorialModalOpen) return
    const hoy = new Date()
    const inicio = new Date()
    inicio.setDate(hoy.getDate() - 7)
    const toDate = (d: Date) => d.toISOString().split('T')[0]
    setHistorialFilters((prev) => ({
      ...prev,
      fechaInicio: prev.fechaInicio || toDate(inicio),
      fechaFin: prev.fechaFin || toDate(hoy),
    }))
  }, [isHistorialModalOpen])

  async function handleAbrirCaja() {
    try {
      // Verificar si el admin está viendo otra sucursal
      if (esAdmin && sucursalSeleccionada) {
        const sucursalActual = await perfilesService.getSucursalActual()
        if (sucursalSeleccionada !== sucursalActual) {
          alert('⚠️ Solo puedes actualizar el fondo de caja de tu propia sucursal. Cambia a tu sucursal para realizar esta acción.')
          return
        }
      }

      const monto = parseFloat(montoApertura)
      if (isNaN(monto) || monto < 0) {
        alert('Debe ingresar un monto válido')
        return
      }

      setIsAbriendoCaja(true)
      const cajaAbierta = await cajasService.abrirCaja(
        monto,
        observacionesApertura || undefined
      )
      
      setCaja(cajaAbierta)
      setMontoApertura('')
      setObservacionesApertura('')
      setIsAbriendoCaja(false)
      setIsAperturaModalOpen(false)
      alert('✅ Fondo de caja actualizado exitosamente')
      loadCaja()
    } catch (error: any) {
      console.error('Error abriendo caja:', error)
      alert(`Error: ${error.message || 'Error al abrir la caja'}`)
      setIsAbriendoCaja(false)
    }
  }

  async function handleCerrarCaja() {
    try {
      // Verificar si el admin está viendo otra sucursal
      if (esAdmin && sucursalSeleccionada) {
        const sucursalActual = await perfilesService.getSucursalActual()
        if (sucursalSeleccionada !== sucursalActual) {
          alert('⚠️ Solo puedes cerrar la caja de tu propia sucursal. Cambia a tu sucursal para realizar esta acción.')
          return
        }
      }

      const monto = parseFloat(montoCierreReal)
      if (isNaN(monto) || monto < 0) {
        alert('Debe ingresar un monto válido')
        return
      }

      if (!caja) {
        alert('No hay caja abierta para cerrar')
        return
      }

      const diferencia = monto - montoEsperado
      const confirmacion = `¿Confirmar cierre de caja?\n\nMonto esperado: $${montoEsperado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}\nMonto real: $${monto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}\nDiferencia: $${diferencia >= 0 ? '+' : ''}${diferencia.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`

      if (!confirm(confirmacion)) {
        return
      }

      setIsCerrandoCaja(true)
      const cajaCerrada = await cajasService.cerrarCaja(
        monto,
        observacionesCierre || undefined
      )
      
      setCaja(cajaCerrada)
      setMontoCierreReal('')
      setObservacionesCierre('')
      setIsCerrandoCaja(false)
      setIsCerrarModalOpen(false)
      
      if (cajaCerrada.diferencia && cajaCerrada.diferencia < 0) {
        alert(`⚠️ Caja cerrada. Hay un FALTANTE de $${Math.abs(cajaCerrada.diferencia).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`)
      } else if (cajaCerrada.diferencia && cajaCerrada.diferencia > 0) {
        alert(`✅ Caja cerrada. Hay un SOBRANTE de $${cajaCerrada.diferencia.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`)
      } else {
        alert('✅ Caja cerrada correctamente. No hay diferencia.')
      }
      
      loadCaja()
    } catch (error: any) {
      console.error('Error cerrando caja:', error)
      alert(`Error: ${error.message || 'Error al cerrar la caja'}`)
      setIsCerrandoCaja(false)
    }
  }

  async function handleRegistrarMovimiento() {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    try {
      // Verificar si el admin está viendo otra sucursal
      if (esAdmin && sucursalSeleccionada) {
        const sucursalActual = await perfilesService.getSucursalActual()
        if (sucursalSeleccionada !== sucursalActual) {
          alert('⚠️ Solo puedes registrar movimientos en la caja de tu propia sucursal. Cambia a tu sucursal para realizar esta acción.')
          return
        }
      }

      const monto = parseFloat(montoMovimiento)
      if (isNaN(monto) || monto <= 0) {
        alert('Debe ingresar un monto válido mayor a 0')
        return
      }

      if (!conceptoMovimiento.trim()) {
        alert('Debe ingresar un concepto')
        return
      }

      if (!caja) {
        alert('No hay caja abierta')
        return
      }

      setIsRegistrandoMovimiento(true)
      const movimientoPromise = cajasService.registrarMovimiento(
        caja.id,
        tipoMovimiento,
        monto,
        conceptoMovimiento.trim(),
        observacionesMovimiento || undefined
      )
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Tiempo de espera agotado al registrar el movimiento. Intenta nuevamente.'))
        }, 20000)
      })
      await Promise.race([movimientoPromise, timeoutPromise])
      
      setMontoMovimiento('')
      setConceptoMovimiento('')
      setObservacionesMovimiento('')
      setIsMovimientoModalOpen(false)
      alert('✅ Movimiento registrado exitosamente')
      loadCaja()
    } catch (error: any) {
      console.error('Error registrando movimiento:', error)
      alert(`Error: ${error.message || 'Error al registrar el movimiento'}`)
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      setIsRegistrandoMovimiento(false)
    }
  }

  async function cargarHistorialMovimientos() {
    try {
      setHistorialLoading(true)
      const data = await cajasService.getMovimientosResumen({
        sucursalId: sucursalSeleccionada || undefined,
        fechaInicio: historialFilters.fechaInicio || undefined,
        fechaFin: historialFilters.fechaFin || undefined,
      })
      setHistorialMovimientos(data.movimientos)
      setHistorialTotales(data.totales)
    } catch (error: any) {
      console.error('Error cargando historial de movimientos:', error)
      alert(`Error: ${error.message || 'No se pudieron cargar los movimientos'}`)
    } finally {
      setHistorialLoading(false)
    }
  }

  function handleImprimirReporte() {
    if (!caja || caja.estado !== 'Cerrada') {
      alert('Solo se puede imprimir el reporte de una caja cerrada')
      return
    }

    // Abrir ventana de impresión
    const ventanaImpresion = window.open('', '_blank')
    if (!ventanaImpresion) {
      alert('Por favor, permite ventanas emergentes para imprimir')
      return
    }

    const contenido = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte de Cierre de Caja</title>
        <style>
          body { font-family: monospace; font-size: 12px; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .line { border-top: 1px dashed #000; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; margin: 5px 0; }
          .total { font-weight: bold; font-size: 14px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>REPORTE DE CIERRE DE CAJA</h2>
          <p>${caja.sucursal?.nombre || 'Sucursal'}</p>
          <p>Fecha: ${new Date(caja.fecha).toLocaleDateString('es-DO')}</p>
        </div>
        <div class="line"></div>
        <div class="row">
          <span>Monto de Apertura:</span>
          <span>$${caja.monto_apertura.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="row">
          <span>Ingresos del Día:</span>
          <span>$${ingresosDia.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="row">
          <span>Salidas del Día:</span>
          <span>$${salidasDia.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="line"></div>
        <div class="row total">
          <span>Monto Esperado:</span>
          <span>$${montoEsperado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="row">
          <span>Monto Real:</span>
          <span>$${caja.monto_cierre_real?.toLocaleString('es-DO', { minimumFractionDigits: 2 }) || '0.00'}</span>
        </div>
        <div class="line"></div>
        <div class="row total">
          <span>Diferencia:</span>
          <span>$${caja.diferencia && caja.diferencia >= 0 ? '+' : ''}${caja.diferencia?.toLocaleString('es-DO', { minimumFractionDigits: 2 }) || '0.00'}</span>
        </div>
        ${caja.observaciones ? `<p><strong>Observaciones:</strong> ${caja.observaciones}</p>` : ''}
      </body>
      </html>
    `

    ventanaImpresion.document.write(contenido)
    ventanaImpresion.document.close()
    ventanaImpresion.focus()
    setTimeout(() => {
      ventanaImpresion.print()
    }, 250)
  }

  const montoEsperado = caja ? caja.monto_apertura + ingresosDia - salidasDia : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Gestión de Caja
            </h1>
            <p className="text-gray-600">
              Control de efectivo y cuadre diario
            </p>
          </div>
          <div className="flex gap-4">
            {caja && caja.estado === 'Abierta' && (
              <Button
                variant="secondary"
                onClick={loadCaja}
                className="text-sm px-3 py-1"
              >
                <RefreshCw className="w-4 h-4 mr-2 inline" />
                Actualizar
              </Button>
            )}
            <Button variant="secondary" onClick={() => setIsHistorialModalOpen(true)}>
              Ver Movimientos
            </Button>
            <Button variant="secondary" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5 mr-2 inline" />
              Volver
            </Button>
          </div>
        </div>
        
        {/* Selector de sucursal para admins */}
        {esAdmin && sucursales.length > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md mb-4">
            <div className="flex items-center gap-4">
              <Building2 className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ver Caja de Sucursal:
                </label>
                <Select
                  value={sucursalSeleccionada || ''}
                  onChange={(e) => {
                    setSucursalSeleccionada(e.target.value || null)
                  }}
                  options={sucursales.map(s => ({
                    value: s.id,
                    label: s.nombre
                  }))}
                  className="w-full md:w-64"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando información de caja...</p>
        </div>
      ) : (
        // Caja abierta o cerrada - Mostrar panel de cuadre
        <div className="space-y-6">
          {/* Estado de la caja */}
          {caja && (
            <div className="rounded-lg shadow p-6 bg-green-50 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Unlock className="w-8 h-8 text-green-600 mr-4" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Caja del Día
                    </h2>
                    <p className="text-sm text-gray-600">
                      Fecha: {new Date(caja.fecha).toLocaleDateString('es-DO')}
                      {caja.sucursal && ` - ${caja.sucursal.nombre}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      La caja se crea automáticamente y está siempre disponible
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {puedeEditar && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => setIsAperturaModalOpen(true)}
                      >
                        Actualizar Fondo
                      </Button>
                      {caja.estado === 'Abierta' && (
                        <Button
                          variant="secondary"
                          onClick={() => setIsCerrarModalOpen(true)}
                          className="border-amber-500 text-amber-700 hover:bg-amber-50"
                        >
                          Cerrar Caja
                        </Button>
                      )}
                    </>
                  )}
                  {caja && caja.estado === 'Cerrada' && (
                    <Button
                      variant="secondary"
                      onClick={handleImprimirReporte}
                    >
                      <Printer className="w-5 h-5 mr-2 inline" />
                      Imprimir Reporte
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Panel de cuadre */}
          {caja && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Monto de Apertura */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Apertura</span>
                  <DollarSign className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  ${caja.monto_apertura.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Ingresos del día */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Ingresos</span>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-600">
                  +${ingresosDia.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Salidas del día */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Salidas</span>
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-red-600">
                  -${salidasDia.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Monto Esperado */}
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm opacity-90">Esperado en Caja</span>
                  <DollarSign className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold">
                  ${montoEsperado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}

          {/* Caja cerrada - Mostrar resumen final */}
          {caja && caja.estado === 'Cerrada' && caja.monto_cierre_real && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Cierre</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Monto Esperado</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${montoEsperado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Monto Real</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${caja.monto_cierre_real.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Diferencia</p>
                  <p className={`text-xl font-bold ${caja.diferencia && caja.diferencia < 0 ? 'text-red-600' : caja.diferencia && caja.diferencia > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {caja.diferencia && caja.diferencia >= 0 ? '+' : ''}
                    ${caja.diferencia?.toLocaleString('es-DO', { minimumFractionDigits: 2 }) || '0.00'}
                    {caja.diferencia && caja.diferencia < 0 && ' (FALTANTE)'}
                    {caja.diferencia && caja.diferencia > 0 && ' (SOBRANTE)'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botón para registrar movimiento (solo si está abierta y puede editar) */}
          {caja && caja.estado === 'Abierta' && puedeEditar && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Registrar Movimiento</h3>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsRegistrandoMovimiento(false)
                    setIsMovimientoModalOpen(true)
                  }}
                >
                  <Plus className="w-5 h-5 mr-2 inline" />
                  Nuevo Movimiento
                </Button>
              </div>
            </div>
          )}
          
          {/* Mensaje informativo si el admin está viendo otra sucursal */}
          {esAdmin && !puedeEditar && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-md">
              <p className="text-sm text-yellow-700">
                <strong>Modo de Visualización:</strong> Estás viendo la caja de otra sucursal. Solo puedes consultar información. Para realizar acciones (actualizar fondo, cerrar caja, registrar movimientos), cambia a tu sucursal en el selector arriba.
              </p>
            </div>
          )}

          {/* Lista de movimientos */}
          {movimientos.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Movimientos del Día</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {movimientos.map((movimiento) => (
                      <tr key={movimiento.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(movimiento.fecha_hora).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {movimiento.usuario?.nombre_completo ||
                            (movimiento as any).usuario_nombre ||
                            movimiento.usuario?.email ||
                            (movimiento as any).usuario_email ||
                            (movimiento.usuario_id === 'sistema' ? 'Sistema' : movimiento.usuario_id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            movimiento.tipo === 'Entrada'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {movimiento.tipo === 'Entrada' ? (
                              <Plus className="w-3 h-3 mr-1 inline" />
                            ) : (
                              <Minus className="w-3 h-3 mr-1 inline" />
                            )}
                            {movimiento.tipo}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{movimiento.concepto}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          movimiento.tipo === 'Entrada' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {movimiento.tipo === 'Entrada' ? '+' : '-'}
                          ${movimiento.monto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {movimiento.observaciones || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Actualización de Fondo de Caja */}
      <Modal
        isOpen={isAperturaModalOpen}
        onClose={() => {
          setIsAperturaModalOpen(false)
          setMontoApertura('')
          setObservacionesApertura('')
        }}
        title="Actualizar Fondo de Caja"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
            <p className="text-sm text-blue-700">
              Actualiza el monto inicial del fondo de caja. Este será el punto de partida para calcular el cuadre diario.
            </p>
            <p className="text-xs text-blue-600 mt-2">
              Nota: La caja se crea automáticamente y está siempre disponible para registrar movimientos.
            </p>
          </div>

              <Input
            label="Fondo de Caja (Monto Inicial)"
            type="number"
            step="0.01"
            min="0"
            value={montoApertura}
            onChange={(e) => setMontoApertura(e.target.value)}
            placeholder={caja?.monto_apertura?.toString() || "0.00"}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones (opcional)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              value={observacionesApertura}
              onChange={(e) => setObservacionesApertura(e.target.value)}
              placeholder="Notas adicionales sobre la apertura..."
            />
          </div>

          <div className="btn-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAperturaModalOpen(false)
                setMontoApertura('')
                setObservacionesApertura('')
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleAbrirCaja} disabled={isAbriendoCaja}>
              {isAbriendoCaja ? 'Actualizando...' : 'Actualizar Fondo'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Cierre de Caja */}
      <Modal
        isOpen={isCerrarModalOpen}
        onClose={() => {
          if (!isCerrandoCaja) {
            setIsCerrarModalOpen(false)
            setMontoCierreReal('')
            setObservacionesCierre('')
          }
        }}
        title="Cerrar Caja"
      >
        {caja && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-md">
              <p className="text-sm text-yellow-700 mb-2">
                <strong>Paso 1:</strong> Cuenta físicamente el dinero en la caja.
              </p>
              <p className="text-sm text-yellow-700">
                <strong>Paso 2:</strong> Ingresa el monto real contado.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-md space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Monto de Apertura:</span>
                <span className="font-medium">${caja.monto_apertura.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Ingresos del día:</span>
                <span className="font-medium text-green-600">+${ingresosDia.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Salidas del día:</span>
                <span className="font-medium text-red-600">-${salidasDia.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-gray-300 pt-2 flex justify-between">
                <span className="text-sm font-semibold text-gray-900">Monto Esperado:</span>
                <span className="text-lg font-bold text-primary-600">
                  ${montoEsperado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <Input
              label="Monto Real Contado"
              type="number"
              step="0.01"
              min="0"
              value={montoCierreReal}
              onChange={(e) => setMontoCierreReal(e.target.value)}
              placeholder={montoEsperado.toFixed(2)}
              required
            />

            {montoCierreReal && !isNaN(parseFloat(montoCierreReal)) && (
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-sm font-semibold text-blue-900 mb-1">Diferencia Calculada:</p>
                <p className={`text-xl font-bold ${
                  parseFloat(montoCierreReal) - montoEsperado < 0 ? 'text-red-600' : 
                  parseFloat(montoCierreReal) - montoEsperado > 0 ? 'text-green-600' : 
                  'text-gray-900'
                }`}>
                  {parseFloat(montoCierreReal) - montoEsperado >= 0 ? '+' : ''}
                  ${(parseFloat(montoCierreReal) - montoEsperado).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  {parseFloat(montoCierreReal) - montoEsperado < 0 && ' (FALTANTE)'}
                  {parseFloat(montoCierreReal) - montoEsperado > 0 && ' (SOBRANTE)'}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones (opcional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                value={observacionesCierre}
                onChange={(e) => setObservacionesCierre(e.target.value)}
                placeholder="Notas sobre el cierre, diferencias, etc..."
              />
            </div>

            <div className="btn-actions">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsCerrarModalOpen(false)
                  setMontoCierreReal('')
                  setObservacionesCierre('')
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleCerrarCaja} disabled={isCerrandoCaja}>
                {isCerrandoCaja ? 'Cerrando...' : 'Cerrar Caja'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Registrar Movimiento */}
      <Modal
        isOpen={isMovimientoModalOpen}
        onClose={() => {
          setIsMovimientoModalOpen(false)
          setIsRegistrandoMovimiento(false)
          setTipoMovimiento('Entrada')
          setMontoMovimiento('')
          setConceptoMovimiento('')
          setObservacionesMovimiento('')
        }}
        title="Registrar Movimiento de Caja"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
            <p className="text-sm text-blue-700">
              Registra entradas o salidas de efectivo que no están relacionadas con pagos de clientes.
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Ejemplos: Pago de servicios, compras, aportes de capital, etc.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Movimiento <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={tipoMovimiento}
              onChange={(e) => setTipoMovimiento(e.target.value as 'Entrada' | 'Salida')}
            >
              <option value="Entrada">Entrada (Dinero que entra)</option>
              <option value="Salida">Salida (Dinero que sale)</option>
            </select>
          </div>

          <Input
            label="Concepto"
            type="text"
            value={conceptoMovimiento}
            onChange={(e) => setConceptoMovimiento(e.target.value)}
            placeholder="Ej: Pago de luz, Compra de café, Aporte de capital..."
            required
          />

          <Input
            label="Monto"
            type="number"
            step="0.01"
            min="0.01"
            value={montoMovimiento}
            onChange={(e) => setMontoMovimiento(e.target.value)}
            placeholder="0.00"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones (opcional)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              value={observacionesMovimiento}
              onChange={(e) => setObservacionesMovimiento(e.target.value)}
              placeholder="Detalles adicionales..."
            />
          </div>

          <div className="btn-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setIsMovimientoModalOpen(false)
                setIsRegistrandoMovimiento(false)
                setTipoMovimiento('Entrada')
                setMontoMovimiento('')
                setConceptoMovimiento('')
                setObservacionesMovimiento('')
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleRegistrarMovimiento} disabled={isRegistrandoMovimiento}>
              {isRegistrandoMovimiento ? 'Registrando...' : 'Registrar Movimiento'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isHistorialModalOpen}
        onClose={() => {
          setIsHistorialModalOpen(false)
          setHistorialMovimientos([])
          setHistorialTotales(null)
        }}
        title="Historial de Movimientos"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha inicio
              </label>
              <Input
                type="date"
                value={historialFilters.fechaInicio}
                onChange={(e) => setHistorialFilters((prev) => ({ ...prev, fechaInicio: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha fin
              </label>
              <Input
                type="date"
                value={historialFilters.fechaFin}
                onChange={(e) => setHistorialFilters((prev) => ({ ...prev, fechaFin: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={cargarHistorialMovimientos} disabled={historialLoading}>
              {historialLoading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>

          {historialTotales && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {([
                { label: 'Día', data: historialTotales.dia },
                { label: 'Semana', data: historialTotales.semana },
                { label: 'Mes', data: historialTotales.mes },
                { label: 'Año', data: historialTotales.anio },
              ] as const).map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-md p-3 border">
                  <p className="text-xs text-gray-500 uppercase">{item.label}</p>
                  <p className="text-sm text-green-700">
                    Ingresos: ${item.data.ingresos.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-red-700">
                    Salidas: ${item.data.salidas.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    Neto: ${item.data.neto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          )}

          {historialLoading ? (
            <p className="text-sm text-gray-500">Cargando movimientos...</p>
          ) : historialMovimientos.length === 0 ? (
            <p className="text-sm text-gray-500">No hay movimientos para los filtros seleccionados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Usuario</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Monto</th>
                    <th className="px-3 py-2 text-left">Concepto</th>
                    <th className="px-3 py-2 text-left">Día</th>
                    <th className="px-3 py-2 text-left">Semana</th>
                    <th className="px-3 py-2 text-left">Mes</th>
                    <th className="px-3 py-2 text-left">Año</th>
                    <th className="px-3 py-2 text-left">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historialMovimientos.map((mov) => (
                    <tr key={mov.id} className="border-b">
                      <td className="px-3 py-2">
                        {mov.fecha_hora ? new Date(mov.fecha_hora).toLocaleString('es-DO') : ''}
                      </td>
                      <td className="px-3 py-2">
                        {mov.usuario?.nombre_completo || mov.usuario_nombre || mov.usuario_id}
                      </td>
                      <td className="px-3 py-2">{mov.tipo}</td>
                      <td className="px-3 py-2">
                        {Number(mov.monto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2">{mov.concepto}</td>
                      <td className="px-3 py-2">
                        {mov.ingresos_dia !== undefined
                          ? Number(mov.ingresos_dia).toLocaleString('es-DO', { minimumFractionDigits: 2 })
                          : '-'}
                      </td>
                      <td className="px-3 py-2">
                        {mov.ingresos_semana !== undefined
                          ? Number(mov.ingresos_semana).toLocaleString('es-DO', { minimumFractionDigits: 2 })
                          : '-'}
                      </td>
                      <td className="px-3 py-2">
                        {mov.ingresos_mes !== undefined
                          ? Number(mov.ingresos_mes).toLocaleString('es-DO', { minimumFractionDigits: 2 })
                          : '-'}
                      </td>
                      <td className="px-3 py-2">
                        {mov.ingresos_anio !== undefined
                          ? Number(mov.ingresos_anio).toLocaleString('es-DO', { minimumFractionDigits: 2 })
                          : '-'}
                      </td>
                      <td className="px-3 py-2">{mov.observaciones || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

