'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Lock, Unlock, RefreshCw, AlertTriangle, CheckCircle, Printer, Download } from 'lucide-react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Modal } from '@/components/Modal'
import { cajasService } from '@/lib/services/cajas'
import { perfilesService } from '@/lib/services/perfiles'
import { authService } from '@/lib/services/auth'
import { supabase } from '@/lib/supabase'
import type { Caja, MovimientoCaja } from '@/types'

function toLocalYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function AdminCajasPage() {
  const router = useRouter()
  const [cajas, setCajas] = useState<Caja[]>([])
  const [loading, setLoading] = useState(true)
  const [diasAtras, setDiasAtras] = useState(1)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [accionCaja, setAccionCaja] = useState<'abrir' | 'cerrar' | null>(null)
  const [accionSucursalId, setAccionSucursalId] = useState<string | null>(null)
  const [accionSucursalNombre, setAccionSucursalNombre] = useState<string>('')
  const [montoAccion, setMontoAccion] = useState('')
  const [observacionesAccion, setObservacionesAccion] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isConfirmando, setIsConfirmando] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [printPassword, setPrintPassword] = useState('')
  const [isPrinting, setIsPrinting] = useState(false)
  const [errorConexion, setErrorConexion] = useState<string | null>(null)

  const verificarPermisos = useCallback(async () => {
    try {
      const admin = await perfilesService.esAdmin()
      setIsAdmin(admin)
      if (!admin) {
        router.push('/')
      }
    } catch (error) {
      console.error('Error verificando permisos:', error)
      router.push('/')
    }
  }, [router])

  const loadCajas = useCallback(async () => {
    try {
      setErrorConexion(null)
      setLoading(true)
      const cajasData = await cajasService.getAllCajasEstado(diasAtras)
      setCajas(cajasData || [])
    } catch (error: any) {
      console.error('Error cargando cajas:', error)
      const msg = error?.message ?? ''
      const isNetworkError = typeof msg === 'string' && (msg.includes('Failed to fetch') || msg.includes('fetch') || msg.includes('NetworkError') || msg.includes('Load failed'))
      if (isNetworkError) {
        setErrorConexion('No se pudo conectar al servidor. Comprueba tu conexión a internet y las variables de Supabase (NEXT_PUBLIC_SUPABASE_URL).')
        setCajas([])
      } else {
        alert(`Error: ${msg || 'Error al cargar las cajas'}`)
      }
    } finally {
      setLoading(false)
    }
  }, [diasAtras])

  useEffect(() => {
    verificarPermisos()
  }, [verificarPermisos])

  useEffect(() => {
    if (isAdmin) {
      loadCajas()
      
      // Actualizar cada 30 segundos
      const interval = setInterval(() => {
        loadCajas()
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [isAdmin, loadCajas])

  // Estado para almacenar totales de pagos por sucursal (consolidado por período)
  const [totalesPagosPorSucursal, setTotalesPagosPorSucursal] = useState<Record<string, number>>({})
  const [totalesSalidasPorSucursal, setTotalesSalidasPorSucursal] = useState<Record<string, number>>({})
  const [movimientos, setMovimientos] = useState<(MovimientoCaja & { sucursal_nombre?: string })[]>([])
  const [movimientosLoading, setMovimientosLoading] = useState(false)
  const [movFilters, setMovFilters] = useState({
    sucursalId: '',
    fechaInicio: '',
    fechaFin: '',
  })

  // Cargar totales de pagos y salidas por sucursal para el período seleccionado
  useEffect(() => {
    if (!cajas.length || !isAdmin) return

    const cargarTotalesPorSucursal = async () => {
      const totalesIngresos: Record<string, number> = {}
      const totalesSalidas: Record<string, number> = {}
      
      // Obtener todas las sucursales únicas
      const sucursalesUnicas = new Set<string>()
      cajas.forEach(caja => {
        if (caja.sucursal_id) {
          sucursalesUnicas.add(caja.sucursal_id)
        }
      })

      // Calcular fechas del período
      const fechaFin = new Date()
      fechaFin.setHours(23, 59, 59, 999) // Incluir todo el día de hoy
      const fechaInicio = new Date()
      fechaInicio.setDate(fechaInicio.getDate() - diasAtras)
      fechaInicio.setHours(0, 0, 0, 0) // Iniciar desde el inicio del día

      // Calcular totales de pagos y salidas para cada sucursal en el período (consulta única)
      const fechaInicioStr = toLocalYMD(fechaInicio)
      const fechaFinStr = toLocalYMD(fechaFin)
      
      console.log('🔄 [AdminCajas] Iniciando cálculo de totales:', {
        sucursalesUnicas: Array.from(sucursalesUnicas),
        fechaInicio: fechaInicioStr,
        fechaFin: fechaFinStr,
        diasAtras
      })

      // Calcular en paralelo para todas las sucursales
      await Promise.all(
        Array.from(sucursalesUnicas).map(async (sucursalId) => {
          try {
            console.log(`🔄 [AdminCajas] Calculando totales para sucursal: ${sucursalId}`)
            const totales = await cajasService.getIngresosYSalidasDelPeriodo(
              sucursalId, 
              fechaInicioStr, 
              fechaFinStr
            )
            console.log(`✅ [AdminCajas] Totales para sucursal ${sucursalId}:`, totales)
            totalesIngresos[sucursalId] = totales.ingresos
            totalesSalidas[sucursalId] = totales.salidas
          } catch (error) {
            console.error(`❌ [AdminCajas] Error calculando totales para sucursal ${sucursalId}:`, error)
            totalesIngresos[sucursalId] = 0
            totalesSalidas[sucursalId] = 0
          }
        })
      )

      console.log('✅ [AdminCajas] Totales calculados:', {
        ingresos: totalesIngresos,
        salidas: totalesSalidas
      })

      setTotalesPagosPorSucursal(totalesIngresos)
      setTotalesSalidasPorSucursal(totalesSalidas)
    }

    cargarTotalesPorSucursal()
  }, [cajas, isAdmin, diasAtras])

  useEffect(() => {
    if (!isAdmin) return
    const hoy = new Date()
    const inicio = new Date()
    inicio.setDate(hoy.getDate() - 7)
    setMovFilters((prev) => ({
      ...prev,
      fechaInicio: prev.fechaInicio || toLocalYMD(inicio),
      fechaFin: prev.fechaFin || toLocalYMD(hoy),
    }))
  }, [isAdmin])

  async function cargarMovimientos() {
    try {
      setMovimientosLoading(true)
      const data = await cajasService.getMovimientosAdmin({
        sucursalId: movFilters.sucursalId || undefined,
        fechaInicio: movFilters.fechaInicio || undefined,
        fechaFin: movFilters.fechaFin || undefined,
      })
      setMovimientos(data as any)
    } catch (error: any) {
      console.error('Error cargando movimientos:', error)
      alert(`Error: ${error.message || 'No se pudieron cargar los movimientos'}`)
    } finally {
      setMovimientosLoading(false)
    }
  }

  function exportarMovimientosCSV() {
    if (!movimientos.length) {
      alert('No hay movimientos para exportar')
      return
    }
    const headers = [
      'Sucursal',
      'Fecha',
      'Usuario',
      'Tipo',
      'Monto',
      'Concepto',
      'Observaciones',
    ]
    const rows = movimientos.map((mov) => [
      mov.sucursal_nombre || mov.sucursal_id || '',
      mov.fecha_hora ? new Date(mov.fecha_hora).toLocaleString('es-DO') : '',
      mov.usuario?.nombre_completo || mov.usuario_id || '',
      mov.tipo,
      mov.monto,
      mov.concepto,
      mov.observaciones || '',
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `movimientos-caja-${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function imprimirMovimientos() {
    if (!movimientos.length) {
      alert('No hay movimientos para imprimir')
      return
    }
    const ventana = window.open('', '_blank')
    if (!ventana) return
    const filas = movimientos
      .map((mov) => {
        const fecha = mov.fecha_hora ? new Date(mov.fecha_hora).toLocaleString('es-DO') : ''
        const usuario = mov.usuario?.nombre_completo || mov.usuario_id || ''
        const sucursal = mov.sucursal_nombre || mov.sucursal_id || ''
        return `
          <tr>
            <td>${sucursal}</td>
            <td>${fecha}</td>
            <td>${usuario}</td>
            <td>${mov.tipo}</td>
            <td>${Number(mov.monto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
            <td>${mov.concepto || ''}</td>
            <td>${mov.observaciones || ''}</td>
          </tr>
        `
      })
      .join('')
    ventana.document.write(`
      <html>
        <head>
          <title>Movimientos de Caja</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; }
          </style>
        </head>
        <body>
          <h2>Movimientos de Caja</h2>
          <p>Desde: ${movFilters.fechaInicio || '-'} Hasta: ${movFilters.fechaFin || '-'}</p>
          <table>
            <thead>
              <tr>
                <th>Sucursal</th>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Concepto</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              ${filas}
            </tbody>
          </table>
        </body>
      </html>
    `)
    ventana.document.close()
    ventana.focus()
    ventana.print()
  }

  function imprimirCajas() {
    if (!gruposCajas.length) {
      alert('No hay cajas para imprimir')
      return
    }
    const ventana = window.open('', '_blank')
    if (!ventana) return
    const filas = gruposCajas
      .map((grupo) => {
        const sucursal = grupo.sucursal?.nombre || grupo.sucursalId
        const estado = grupo.cajaConsolidada.estado || 'Cerrada'
        const montoApertura = grupo.cajaConsolidada.monto_apertura || 0
        const totalIngresos = totalesPagosPorSucursal[grupo.sucursalId] || 0
        const totalSalidas = totalesSalidasPorSucursal[grupo.sucursalId] || 0
        const montoEsperado = montoApertura + totalIngresos - totalSalidas
        return `
          <tr>
            <td>${sucursal}</td>
            <td>${estado}</td>
            <td>${montoApertura.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
            <td>${totalIngresos.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
            <td>${totalSalidas.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
            <td>${montoEsperado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
          </tr>
        `
      })
      .join('')
    ventana.document.write(`
      <html>
        <head>
          <title>Resumen de Cajas</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; }
          </style>
        </head>
        <body>
          <h2>Resumen de Cajas</h2>
          <p>Período: ${diasAtras === 1 ? 'Últimas 24 horas' : diasAtras === 7 ? 'Últimos 7 días' : 'Últimos 30 días'}</p>
          <table>
            <thead>
              <tr>
                <th>Sucursal</th>
                <th>Estado</th>
                <th>Apertura</th>
                <th>Ingresos</th>
                <th>Salidas</th>
                <th>Total esperado</th>
              </tr>
            </thead>
            <tbody>
              ${filas}
            </tbody>
          </table>
        </body>
      </html>
    `)
    ventana.document.close()
    ventana.focus()
    ventana.print()
  }

  function abrirModalAccionCaja(
    accion: 'abrir' | 'cerrar',
    sucursalId: string,
    sucursalNombre: string,
    montoSugerido: number
  ) {
    setAccionCaja(accion)
    setAccionSucursalId(sucursalId)
    setAccionSucursalNombre(sucursalNombre)
    setMontoAccion(montoSugerido ? montoSugerido.toString() : '')
    setObservacionesAccion('')
    setConfirmPassword('')
    setIsConfirmModalOpen(true)
  }

  function abrirModalImprimirCajas() {
    setPrintPassword('')
    setIsPrintModalOpen(true)
  }

  async function confirmarAccionCaja() {
    try {
      if (!accionCaja || !accionSucursalId) {
        return
      }
      const monto = parseFloat(montoAccion)
      if (isNaN(monto) || monto < 0) {
        alert('Debe ingresar un monto válido')
        return
      }
      if (!confirmPassword.trim()) {
        alert('Debe ingresar la contraseña para confirmar')
        return
      }

      setIsConfirmando(true)

      const user = await authService.getCurrentUser()
      if (!user?.email) {
        throw new Error('No hay usuario autenticado')
      }
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: confirmPassword,
      })
      if (authError) {
        throw new Error('La contraseña es incorrecta')
      }

      const ip = await obtenerIpPublica()

      if (accionCaja === 'abrir') {
        await cajasService.abrirCajaSucursal(
          accionSucursalId,
          monto,
          observacionesAccion || undefined,
          ip
        )
        alert('✅ Caja abierta/actualizada correctamente')
      } else {
        await cajasService.cerrarCajaSucursal(
          accionSucursalId,
          monto,
          observacionesAccion || undefined,
          ip
        )
        alert('✅ Caja cerrada correctamente')
      }

      setIsConfirmModalOpen(false)
      await loadCajas()
    } catch (error: any) {
      console.error('Error confirmando acción de caja:', error)
      alert(`Error: ${error.message || 'No se pudo completar la acción'}`)
    } finally {
      setIsConfirmando(false)
    }
  }

  async function confirmarImpresionCajas() {
    try {
      if (!printPassword.trim()) {
        alert('Debe ingresar la contraseña para confirmar')
        return
      }

      setIsPrinting(true)
      const user = await authService.getCurrentUser()
      if (!user?.email) {
        throw new Error('No hay usuario autenticado')
      }
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: printPassword,
      })
      if (authError) {
        throw new Error('La contraseña es incorrecta')
      }

      imprimirCajas()
      setIsPrintModalOpen(false)
    } catch (error: any) {
      console.error('Error confirmando impresión de cajas:', error)
      alert(`Error: ${error.message || 'No se pudo completar la acción'}`)
    } finally {
      setIsPrinting(false)
    }
  }

  async function obtenerIpPublica(): Promise<string | undefined> {
    try {
      const response = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' })
      if (!response.ok) {
        return undefined
      }
      const data = await response.json()
      return data?.ip
    } catch (error) {
      console.warn('No se pudo obtener la IP pública:', error)
      return undefined
    }
  }

  // Consolidar cajas por SUCURSAL solamente (una sola caja por sucursal para el período completo)
  // Sumar todos los montos de apertura y usar totales de pagos del período
  const cajasConsolidadas = useMemo(() => {
    const consolidadasPorSucursal: Record<string, Caja> = {}
    
    // Agrupar cajas por sucursal (sin importar la fecha)
    cajas.forEach(caja => {
      const sucursalId = caja.sucursal_id
      if (!sucursalId) return
      
      if (!consolidadasPorSucursal[sucursalId]) {
        // Primera caja de esta sucursal - usar como base
        consolidadasPorSucursal[sucursalId] = {
          ...caja,
        }
      } else {
        // Consolidar: sumar monto de apertura y tomar la caja más reciente
        const existente = consolidadasPorSucursal[sucursalId]
        const fechaExistente = new Date(existente.fecha || existente.created_at || 0)
        const fechaNueva = new Date(caja.fecha || caja.created_at || 0)
        
        // Usar la caja más reciente como base
        const cajaBase = fechaNueva > fechaExistente ? caja : existente
        const cajaAdicional = fechaNueva > fechaExistente ? existente : caja
        
        consolidadasPorSucursal[sucursalId] = {
          ...cajaBase,
          monto_apertura: (existente.monto_apertura || 0) + (caja.monto_apertura || 0),
          // Si alguna está abierta, considerar la consolidada como abierta
          estado: existente.estado === 'Abierta' || caja.estado === 'Abierta' ? 'Abierta' : existente.estado,
        }
      }
    })
    
    // Actualizar montos esperados con totales de pagos del período
    Object.keys(consolidadasPorSucursal).forEach(sucursalId => {
      const caja = consolidadasPorSucursal[sucursalId]
      const totalIngresos = totalesPagosPorSucursal[sucursalId] || 0
      const totalSalidas = totalesSalidasPorSucursal[sucursalId] || 0
      const montoApertura = caja.monto_apertura || 0
      
      // Monto esperado = Apertura + Ingresos - Salidas
      const montoEsperado = montoApertura + totalIngresos - totalSalidas
      
      consolidadasPorSucursal[sucursalId] = {
        ...caja,
        monto_cierre_esperado: montoEsperado,
        // Si está cerrada, recalcular diferencia
        diferencia: caja.monto_cierre_real !== null && caja.monto_cierre_real !== undefined
          ? caja.monto_cierre_real - montoEsperado
          : caja.diferencia,
      }
    })
    
    return consolidadasPorSucursal
  }, [cajas, totalesPagosPorSucursal, totalesSalidasPorSucursal])

  // Convertir cajas consolidadas en grupos para mostrar (una por sucursal)
  const gruposCajas = Object.values(cajasConsolidadas).map(caja => {
    const sucursalId = caja.sucursal_id || ''
    return {
      sucursal: caja.sucursal,
      sucursalId: sucursalId,
      cajaConsolidada: caja,
    }
  }).sort((a, b) => {
    // Ordenar por nombre de sucursal
    const nombreA = a.sucursal?.nombre || ''
    const nombreB = b.sucursal?.nombre || ''
    return nombreA.localeCompare(nombreB)
  })

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Acceso Restringido
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Solo los administradores pueden acceder a esta página.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {errorConexion && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">{errorConexion}</p>
          </div>
          <Button variant="secondary" onClick={() => { setErrorConexion(null); loadCajas(); }}>
            <RefreshCw className="w-4 h-4 mr-2 inline" />
            Reintentar
          </Button>
        </div>
      )}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Estado de Cajas - Todas las Sucursales
          </h1>
          <p className="text-gray-600">
            Vista centralizada del estado de cajas en tiempo real
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <select
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={diasAtras}
            onChange={(e) => setDiasAtras(Number(e.target.value))}
          >
            <option value={1}>Últimas 24 horas</option>
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
          </select>
          <Button
            variant="secondary"
            onClick={loadCajas}
            className="text-sm px-3 py-1"
          >
            <RefreshCw className="w-4 h-4 mr-2 inline" />
            Actualizar
          </Button>
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5 mr-2 inline" />
            Volver
          </Button>
          <Button variant="secondary" onClick={abrirModalImprimirCajas}>
            <Printer className="w-5 h-5 mr-2 inline" />
            Imprimir Cajas
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando información de cajas...</p>
        </div>
      ) : gruposCajas.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No hay cajas registradas en el período seleccionado</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial de Movimientos</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-600">Sucursal</label>
                <select
                  className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={movFilters.sucursalId}
                  onChange={(e) => setMovFilters((prev) => ({ ...prev, sucursalId: e.target.value }))}
                >
                  <option value="">Todas</option>
                  {gruposCajas.map((grupo) => (
                    <option key={grupo.sucursalId} value={grupo.sucursalId}>
                      {grupo.sucursal?.nombre || grupo.sucursalId}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Fecha inicio</label>
                <Input
                  type="date"
                  value={movFilters.fechaInicio}
                  onChange={(e) => setMovFilters((prev) => ({ ...prev, fechaInicio: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Fecha fin</label>
                <Input
                  type="date"
                  value={movFilters.fechaFin}
                  onChange={(e) => setMovFilters((prev) => ({ ...prev, fechaFin: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              <Button variant="secondary" onClick={cargarMovimientos} disabled={movimientosLoading}>
                <RefreshCw className="w-4 h-4 mr-2 inline" />
                {movimientosLoading ? 'Buscando...' : 'Buscar'}
              </Button>
              <Button variant="secondary" onClick={exportarMovimientosCSV}>
                <Download className="w-4 h-4 mr-2 inline" />
                Exportar
              </Button>
              <Button variant="secondary" onClick={imprimirMovimientos}>
                <Printer className="w-4 h-4 mr-2 inline" />
                Imprimir
              </Button>
            </div>
            {movimientosLoading ? (
              <p className="text-sm text-gray-500">Cargando movimientos...</p>
            ) : movimientos.length === 0 ? (
              <p className="text-sm text-gray-500">No hay movimientos para los filtros seleccionados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Sucursal</th>
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Usuario</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Monto</th>
                      <th className="px-3 py-2 text-left">Concepto</th>
                      <th className="px-3 py-2 text-left">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((mov) => (
                      <tr key={mov.id} className="border-b">
                        <td className="px-3 py-2">{mov.sucursal_nombre || mov.sucursal_id}</td>
                        <td className="px-3 py-2">
                          {mov.fecha_hora ? new Date(mov.fecha_hora).toLocaleString('es-DO') : ''}
                        </td>
                        <td className="px-3 py-2">
                          {mov.usuario?.nombre_completo || mov.usuario_id}
                        </td>
                        <td className="px-3 py-2">{mov.tipo}</td>
                        <td className="px-3 py-2">
                          {Number(mov.monto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2">{mov.concepto}</td>
                        <td className="px-3 py-2">{mov.observaciones || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {gruposCajas.map((grupo, index) => {
            const sucursalId = grupo.sucursalId
            // Obtener totales para esta sucursal en el período seleccionado
            const totalIngresos = totalesPagosPorSucursal[sucursalId] || 0
            const totalSalidas = totalesSalidasPorSucursal[sucursalId] || 0
            const montoAperturaConsolidado = grupo.cajaConsolidada.monto_apertura || 0
            
            // El monto esperado es apertura + ingresos - salidas
            const montoEsperado = montoAperturaConsolidado + totalIngresos - totalSalidas
            const estadoConsolidado = grupo.cajaConsolidada.estado || 'Cerrada'
            const cajasSucursal = cajas.filter((caja) => caja.sucursal_id === sucursalId)
            const cajaActualSucursal = cajasSucursal.sort((a, b) => {
              const fechaA = new Date(a.fecha || a.created_at || 0).getTime()
              const fechaB = new Date(b.fecha || b.created_at || 0).getTime()
              return fechaB - fechaA
            })[0]
            const estadoCajaActual = cajaActualSucursal?.estado || estadoConsolidado
            
            // Si la caja está cerrada, calcular diferencia usando el monto esperado consolidado
            const diferenciaCalculada = grupo.cajaConsolidada.monto_cierre_real !== null && grupo.cajaConsolidada.monto_cierre_real !== undefined
              ? grupo.cajaConsolidada.monto_cierre_real - montoEsperado
              : null
            
            return (
            <div key={index} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {grupo.sucursal?.nombre || 'Sucursal Desconocida'}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Período: {diasAtras === 1 ? 'Últimas 24 horas' : diasAtras === 7 ? 'Últimos 7 días' : 'Últimos 30 días'}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {estadoConsolidado === 'Abierta' && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full flex items-center">
                        <Unlock className="w-3 h-3 mr-1" />
                        Caja Abierta
                      </span>
                    )}
                    {estadoConsolidado === 'Cerrada' && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full flex items-center">
                        <Lock className="w-3 h-3 mr-1" />
                        Caja Cerrada
                      </span>
                    )}
                    {estadoCajaActual === 'Abierta' ? (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          abrirModalAccionCaja(
                            'cerrar',
                            sucursalId,
                            grupo.sucursal?.nombre || 'Sucursal',
                            montoEsperado
                          )
                        }
                      >
                        Cerrar Caja
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          abrirModalAccionCaja(
                            'abrir',
                            sucursalId,
                            grupo.sucursal?.nombre || 'Sucursal',
                            montoAperturaConsolidado
                          )
                        }
                      >
                        Abrir Caja
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Mostrar una sola caja consolidada por sucursal/fecha */}
                <div className="max-w-2xl mx-auto">
                  <div className={`border-2 rounded-lg p-6 ${
                    estadoConsolidado === 'Abierta'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 bg-white'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        {estadoConsolidado === 'Abierta' ? (
                          <Unlock className="w-6 h-6 text-green-600 mr-3" />
                        ) : (
                          <Lock className="w-6 h-6 text-gray-600 mr-3" />
                        )}
                        <span className={`text-lg font-semibold ${
                          estadoConsolidado === 'Abierta' ? 'text-green-800' : 'text-gray-800'
                        }`}>
                          Caja Consolidada - {estadoConsolidado === 'Abierta' ? 'Abierta' : 'Cerrada'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 text-base">
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-700 font-medium">Fondo Inicial (Apertura):</span>
                        <span className="font-semibold text-lg">
                          ${montoAperturaConsolidado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-700 font-medium">Total de Ingresos (Pagos del período):</span>
                        <span className="font-semibold text-lg text-blue-600">
                          ${totalIngresos.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {totalSalidas > 0 && (
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-gray-700 font-medium">Total de Salidas (Gastos del período):</span>
                          <span className="font-semibold text-lg text-red-600">
                            ${totalSalidas.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center py-2 border-b-2 border-gray-300">
                        <span className="text-gray-900 font-bold text-lg">Total Esperado en Caja:</span>
                        <span className="font-bold text-xl text-primary-600">
                          ${montoEsperado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 text-center">
                          Consolida todos los movimientos de {diasAtras === 1 ? 'las últimas 24 horas' : diasAtras === 7 ? 'los últimos 7 días' : 'los últimos 30 días'}
                        </p>
                      </div>

                      {estadoConsolidado === 'Cerrada' && grupo.cajaConsolidada.monto_cierre_real && (
                        <>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-gray-700 font-medium">Monto Real (Conteo Físico):</span>
                            <span className="font-semibold text-lg">
                              ${grupo.cajaConsolidada.monto_cierre_real.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          {diferenciaCalculada !== null && diferenciaCalculada !== undefined && (
                            <div className={`flex justify-between items-center py-3 mt-2 rounded-lg px-4 ${
                              diferenciaCalculada < 0
                                ? 'bg-red-50 text-red-700 border-2 border-red-200'
                                : diferenciaCalculada > 0
                                ? 'bg-green-50 text-green-700 border-2 border-green-200'
                                : 'bg-gray-50 text-gray-700 border-2 border-gray-200'
                            }`}>
                              <span className="font-bold text-lg">Diferencia:</span>
                              <span className="font-bold text-xl">
                                {diferenciaCalculada >= 0 ? '+' : ''}
                                ${Math.abs(diferenciaCalculada).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                {diferenciaCalculada < 0 && ' ⚠️ FALTANTE'}
                                {diferenciaCalculada > 0 && ' 💰 SOBRANTE'}
                                {diferenciaCalculada === 0 && ' ✓ CUADRADO'}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      <div className="mt-4 pt-3 border-t text-xs text-gray-500">
                        <p>
                          Sucursal: {grupo.sucursal?.nombre || 'N/A'}
                        </p>
                        <p className="mt-1">
                          Período seleccionado: {diasAtras === 1 ? 'Últimas 24 horas' : diasAtras === 7 ? 'Últimos 7 días' : 'Últimos 30 días'}
                        </p>
                        {grupo.cajaConsolidada.created_at && (
                          <p className="mt-1">
                            Última actualización: {new Date(grupo.cajaConsolidada.created_at).toLocaleString('es-DO', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title={accionCaja === 'cerrar' ? 'Cerrar Caja' : 'Abrir Caja'}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {accionCaja === 'cerrar'
              ? `Cerrar caja de ${accionSucursalNombre}.`
              : `Abrir/actualizar fondo de caja de ${accionSucursalNombre}.`}
          </p>
          <Input
            label={accionCaja === 'cerrar' ? 'Monto de Cierre Real' : 'Fondo de Caja (Monto Inicial)'}
            type="number"
            step="0.01"
            min="0"
            value={montoAccion}
            onChange={(e) => setMontoAccion(e.target.value)}
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
              value={observacionesAccion}
              onChange={(e) => setObservacionesAccion(e.target.value)}
              placeholder="Detalles adicionales..."
            />
          </div>
          <Input
            label="Confirmar con contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Contraseña del administrador"
            required
          />
          <div className="btn-actions pt-2">
            <Button
              variant="secondary"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={isConfirmando}
            >
              Cancelar
            </Button>
            <Button onClick={confirmarAccionCaja} disabled={isConfirmando}>
              {isConfirmando ? 'Confirmando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Confirmar impresión de cajas"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Para imprimir el resumen de cajas, confirma tu contraseña de administrador.
          </p>
          <Input
            label="Confirmar con contraseña"
            type="password"
            value={printPassword}
            onChange={(e) => setPrintPassword(e.target.value)}
            placeholder="Contraseña del administrador"
            required
          />
          <div className="btn-actions pt-2">
            <Button
              variant="secondary"
              onClick={() => setIsPrintModalOpen(false)}
              disabled={isPrinting}
            >
              Cancelar
            </Button>
            <Button onClick={confirmarImpresionCajas} disabled={isPrinting}>
              {isPrinting ? 'Confirmando...' : 'Confirmar e imprimir'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

