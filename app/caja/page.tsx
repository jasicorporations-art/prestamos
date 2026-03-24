'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Lock, Unlock, Plus, Minus, Printer, RefreshCw, Building2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Modal } from '@/components/Modal'
import { Select } from '@/components/Select'
import { cajasService, getLocalDayRangeISO } from '@/lib/services/cajas'
import { perfilesService } from '@/lib/services/perfiles'
import { authService } from '@/lib/services/auth'
import type { Caja, MovimientoCaja, MovimientoCajaResumen, ResumenTotalesCaja, Sucursal } from '@/types'

const CAJA_TOKEN_COOKIE = 'sb-caja-token'

async function fetchDatosDelDia(params: URLSearchParams): Promise<Response> {
  const session = await authService.getSession()
  const headers: HeadersInit = { credentials: 'include' }
  if (session?.access_token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${session.access_token}`
    // Cookie de respaldo por si el header no llega (proxies, CORS, etc.)
    if (typeof document !== 'undefined') {
      document.cookie = `${CAJA_TOKEN_COOKIE}=${encodeURIComponent(session.access_token)}; path=/; max-age=120; SameSite=Lax`
    }
  }
  return fetch(`/api/caja/datos-del-dia?${params.toString()}`, headers)
}
import { formatCurrency } from '@/lib/utils/currency'

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
        const sucursalParaPagos = cajaActual.sucursal_id || sucursalId || undefined
        const hoyLocal = new Date()
        const fechaHoy = `${hoyLocal.getFullYear()}-${String(hoyLocal.getMonth() + 1).padStart(2, '0')}-${String(hoyLocal.getDate()).padStart(2, '0')}`
        const { startISO, endISO } = getLocalDayRangeISO(hoyLocal)

        // Usar API en servidor (admin) para que pagos e ingresos no queden vacíos por RLS
        const params = new URLSearchParams({ fecha: fechaHoy, cajaId: cajaActual.id })
        params.set('desde', startISO)
        params.set('hasta', endISO)
        if (sucursalParaPagos) params.set('sucursalId', sucursalParaPagos)
        let res = await fetchDatosDelDia(params)
        if (res.status === 401) {
          res = await fetchDatosDelDia(params)
        }
        const data = res.ok ? await res.json().catch(() => ({})) : {}

        const movimientosCaja = (data.movimientosCaja || []) as MovimientoCaja[]
        const pagosMovimientos = (data.pagosMovimientos || []) as MovimientoCaja[]
        // API usa movimientos_caja como fuente principal; ingresosPagos solo fallback (pagos viejos sin movimiento)
        const totalIngresos = Number(data.totalIngresosDia)
        const ingresosPagos = Number(data.ingresosPagos) || 0

        const movimientosData = [...movimientosCaja, ...pagosMovimientos].sort((a, b) => {
          const fechaA = new Date((a as any).fecha_hora).getTime()
          const fechaB = new Date((b as any).fecha_hora).getTime()
          return fechaA - fechaB
        })
        setMovimientos(movimientosData)

        const salidas = movimientosCaja
          .filter((m) => String(m.tipo || '').toLowerCase() === 'salida')
          .reduce((sum, m) => sum + (m.monto || 0), 0)
        setIngresosDia(Number.isFinite(totalIngresos) ? totalIngresos : ingresosPagos + movimientosCaja.filter((m) => String(m.tipo || '').toLowerCase() === 'entrada').reduce((sum, m) => sum + (m.monto || 0), 0))
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
          toast.warning('Solo puedes actualizar el fondo de caja de tu propia sucursal. Cambia a tu sucursal para realizar esta acción.')
          return
        }
      }

      const monto = parseFloat(montoApertura)
      if (isNaN(monto) || monto < 0) {
        toast.warning('Debe ingresar un monto válido')
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
      toast.success('Fondo de caja actualizado exitosamente')
      loadCaja()
    } catch (error: any) {
      console.error('Error abriendo caja:', error)
      toast.error(`Error: ${error.message || 'Error al abrir la caja'}`)
      setIsAbriendoCaja(false)
    }
  }

  async function handleCerrarCaja() {
    try {
      // Verificar si el admin está viendo otra sucursal
      if (esAdmin && sucursalSeleccionada) {
        const sucursalActual = await perfilesService.getSucursalActual()
        if (sucursalSeleccionada !== sucursalActual) {
          toast.warning('Solo puedes cerrar la caja de tu propia sucursal. Cambia a tu sucursal para realizar esta acción.')
          return
        }
      }

      const monto = parseFloat(montoCierreReal)
      if (isNaN(monto) || monto < 0) {
        toast.warning('Debe ingresar un monto válido')
        return
      }

      if (!caja) {
        toast.warning('No hay caja abierta para cerrar')
        return
      }

      const diferencia = monto - montoEsperado
      const confirmacion = `¿Confirmar cierre de caja?\n\nMonto esperado: $${formatCurrency(montoEsperado)}\nMonto real: $${formatCurrency(monto)}\nDiferencia: $${diferencia >= 0 ? '+' : ''}${formatCurrency(diferencia)}`

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
        toast.warning(`Caja cerrada. Hay un FALTANTE de $${formatCurrency(Math.abs(cajaCerrada.diferencia))}`)
      } else if (cajaCerrada.diferencia && cajaCerrada.diferencia > 0) {
        toast.success(`Caja cerrada. Hay un SOBRANTE de $${formatCurrency(cajaCerrada.diferencia)}`)
      } else {
        toast.success('Caja cerrada correctamente. No hay diferencia.')
      }
      
      loadCaja()
    } catch (error: any) {
      console.error('Error cerrando caja:', error)
      toast.error(`Error: ${error.message || 'Error al cerrar la caja'}`)
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
          toast.warning('Solo puedes registrar movimientos en la caja de tu propia sucursal. Cambia a tu sucursal para realizar esta acción.')
          return
        }
      }

      const monto = parseFloat(montoMovimiento)
      if (isNaN(monto) || monto <= 0) {
        toast.warning('Debe ingresar un monto válido mayor a 0')
        return
      }

      if (!conceptoMovimiento.trim()) {
        toast.warning('Debe ingresar un concepto')
        return
      }

      if (!caja) {
        toast.warning('No hay caja abierta')
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
      toast.success('Movimiento registrado exitosamente')
      loadCaja()
    } catch (error: any) {
      console.error('Error registrando movimiento:', error)
      toast.error(`Error: ${error.message || 'Error al registrar el movimiento'}`)
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
      toast.error(`Error: ${error.message || 'No se pudieron cargar los movimientos'}`)
    } finally {
      setHistorialLoading(false)
    }
  }

  function handleImprimirReporte() {
    if (!caja || caja.estado !== 'Cerrada') {
      toast.warning('Solo se puede imprimir el reporte de una caja cerrada')
      return
    }

    // Abrir ventana de impresión
    const ventanaImpresion = window.open('', '_blank')
    if (!ventanaImpresion) {
      toast.warning('Por favor, permite ventanas emergentes para imprimir')
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
          <span>$${formatCurrency(caja.monto_apertura)}</span>
        </div>
        <div class="row">
          <span>Ingresos del Día:</span>
          <span>$${formatCurrency(ingresosDia)}</span>
        </div>
        <div class="row">
          <span>Salidas del Día:</span>
          <span>$${formatCurrency(salidasDia)}</span>
        </div>
        <div class="line"></div>
        <div class="row total">
          <span>Monto Esperado:</span>
          <span>$${formatCurrency(montoEsperado)}</span>
        </div>
        <div class="row">
          <span>Monto Real:</span>
          <span>$${caja.monto_cierre_real != null ? formatCurrency(caja.monto_cierre_real) : '0.00'}</span>
        </div>
        <div class="line"></div>
        <div class="row total">
          <span>Diferencia:</span>
          <span>$${caja.diferencia != null ? (caja.diferencia >= 0 ? '+' : '') + formatCurrency(caja.diferencia) : '0.00'}</span>
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
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl mb-4">
            <div className="flex items-center gap-4">
              <Building2 className="w-5 h-5 text-indigo-600" />
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
        <div className="space-y-4 animate-pulse">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-200" />
              <div className="space-y-2">
                <div className="h-5 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-56 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4">
                  <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
                  <div className="h-6 w-28 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Caja abierta o cerrada - Mostrar panel de cuadre
        <div className="space-y-6">
          {/* Estado de la caja */}
          {caja && (
            <div className="rounded-2xl border border-green-200 p-6 bg-green-50">
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
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Apertura</span>
                  <DollarSign className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  ${formatCurrency(caja.monto_apertura)}
                </p>
              </div>

              {/* Ingresos del día */}
              <div className="bg-white rounded-xl border border-green-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Ingresos</span>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-600">
                  +${formatCurrency(ingresosDia)}
                </p>
              </div>

              {/* Salidas del día */}
              <div className="bg-white rounded-xl border border-red-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Salidas</span>
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-red-600">
                  -${formatCurrency(salidasDia)}
                </p>
              </div>

              {/* Monto Esperado */}
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm opacity-90">Esperado en Caja</span>
                  <DollarSign className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold">
                  ${formatCurrency(montoEsperado)}
                </p>
              </div>
            </div>
          )}

          {/* Caja cerrada - Mostrar resumen final */}
          {caja && caja.estado === 'Cerrada' && caja.monto_cierre_real && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Cierre</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Monto Esperado</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${formatCurrency(montoEsperado)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Monto Real</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${formatCurrency(caja.monto_cierre_real)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Diferencia</p>
                  <p className={`text-xl font-bold ${caja.diferencia && caja.diferencia < 0 ? 'text-red-600' : caja.diferencia && caja.diferencia > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {caja.diferencia && caja.diferencia >= 0 ? '+' : ''}
                    ${caja.diferencia != null ? formatCurrency(caja.diferencia) : '0.00'}
                    {caja.diferencia && caja.diferencia < 0 && ' (FALTANTE)'}
                    {caja.diferencia && caja.diferencia > 0 && ' (SOBRANTE)'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botón para registrar movimiento (solo si está abierta y puede editar) */}
          {caja && caja.estado === 'Abierta' && puedeEditar && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
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
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
              <p className="text-sm text-amber-700">
                <strong>Modo de Visualización:</strong> Estás viendo la caja de otra sucursal. Solo puedes consultar información. Para realizar acciones (actualizar fondo, cerrar caja, registrar movimientos), cambia a tu sucursal en el selector arriba.
              </p>
            </div>
          )}

          {/* Lista de movimientos */}
          {movimientos.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Movimientos del Día</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
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
                          ${formatCurrency(movimiento.monto)}
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
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
            <p className="text-sm text-indigo-700">
              Actualiza el monto inicial del fondo de caja. Este será el punto de partida para calcular el cuadre diario.
            </p>
            <p className="text-xs text-indigo-600 mt-2">
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
              <p className="text-sm text-amber-700 mb-2">
                <strong>Paso 1:</strong> Cuenta físicamente el dinero en la caja.
              </p>
              <p className="text-sm text-amber-700">
                <strong>Paso 2:</strong> Ingresa el monto real contado.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Monto de Apertura:</span>
                <span className="font-medium">${formatCurrency(caja.monto_apertura)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Ingresos del día:</span>
                <span className="font-medium text-green-600">+${formatCurrency(ingresosDia)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Salidas del día:</span>
                <span className="font-medium text-red-600">-${formatCurrency(salidasDia)}</span>
              </div>
              <div className="border-t border-gray-300 pt-2 flex justify-between">
                <span className="text-sm font-semibold text-gray-900">Monto Esperado:</span>
                <span className="text-lg font-bold text-primary-600">
                  ${formatCurrency(montoEsperado)}
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
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-sm font-semibold text-blue-900 mb-1">Diferencia Calculada:</p>
                <p className={`text-xl font-bold ${
                  parseFloat(montoCierreReal) - montoEsperado < 0 ? 'text-red-600' : 
                  parseFloat(montoCierreReal) - montoEsperado > 0 ? 'text-green-600' : 
                  'text-gray-900'
                }`}>
                  {parseFloat(montoCierreReal) - montoEsperado >= 0 ? '+' : ''}
                  ${formatCurrency(parseFloat(montoCierreReal) - montoEsperado)}
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
            <p className="text-sm text-indigo-700">
              Registra entradas o salidas de efectivo que no están relacionadas con pagos de clientes.
            </p>
            <p className="text-sm text-indigo-700 mt-1">
              Ejemplos: Pago de servicios, compras, aportes de capital, etc.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Movimiento <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                <div key={item.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase">{item.label}</p>
                  <p className="text-sm text-green-700">
                    Ingresos: ${formatCurrency(item.data.ingresos)}
                  </p>
                  <p className="text-sm text-red-700">
                    Salidas: ${formatCurrency(item.data.salidas)}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    Neto: ${formatCurrency(item.data.neto)}
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
                        {formatCurrency(Number(mov.monto || 0))}
                      </td>
                      <td className="px-3 py-2">{mov.concepto}</td>
                      <td className="px-3 py-2">
                        {mov.ingresos_dia !== undefined
                          ? formatCurrency(Number(mov.ingresos_dia))
                          : '-'}
                      </td>
                      <td className="px-3 py-2">
                        {mov.ingresos_semana !== undefined
                          ? formatCurrency(Number(mov.ingresos_semana))
                          : '-'}
                      </td>
                      <td className="px-3 py-2">
                        {mov.ingresos_mes !== undefined
                          ? formatCurrency(Number(mov.ingresos_mes))
                          : '-'}
                      </td>
                      <td className="px-3 py-2">
                        {mov.ingresos_anio !== undefined
                          ? formatCurrency(Number(mov.ingresos_anio))
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

