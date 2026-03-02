'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, DollarSign, TrendingUp, Calendar, AlertCircle, Clock, Building2 } from 'lucide-react'
import { ventasService } from '@/lib/services/ventas'
import { pagosService } from '@/lib/services/pagos'
import { obtenerVentasConMora } from '@/lib/services/mora'
import { obtenerCuotasPendientes, type CuotaPendiente } from '@/lib/services/cuotas'
import { subscriptionService } from '@/lib/services/subscription'
import { PLANES, getUsagePercentage } from '@/lib/config/planes'
import { perfilesService } from '@/lib/services/perfiles'
import { TourGuided } from '@/components/TourGuided'
import { useCompania } from '@/lib/contexts/CompaniaContext'
import type { Venta, Pago } from '@/types'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/Button'
import { dataTraceStart, dataTraceEnd, logRequest } from '@/lib/utils/authInstrumentation'

interface VentaConCuotas extends Venta {
  cuotasPagadas: number
  cuotasPendientes: number
}

export default function Dashboard() {
  const router = useRouter()
  const { loading: companiaLoading, compania } = useCompania()
  const [totalPorCobrar, setTotalPorCobrar] = useState(0)
  const [totalCargosMora, setTotalCargosMora] = useState(0)
  const [ventasDelMes, setVentasDelMes] = useState<VentaConCuotas[]>([])
  const [cuotasPendientes, setCuotasPendientes] = useState<CuotaPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [planType, setPlanType] = useState<string | null>(null)
  const [usageStats, setUsageStats] = useState({ clientes: 0, prestamos: 0 })
  const [trialInfo, setTrialInfo] = useState<{ isTrial: boolean; daysRemaining: number; trialEndDate: Date | null }>({
    isTrial: false,
    daysRemaining: 0,
    trialEndDate: null,
  })
  const [tourRun, setTourRun] = useState(false)
  const [sucursalNombre, setSucursalNombre] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [esSuperAdmin, setEsSuperAdmin] = useState<boolean | null>(null)

  const loadData = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    dataTraceStart('firstFetchStart')
    const LOAD_TIMEOUT_MS = 25000

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Tiempo de espera agotado. Revisa tu conexión o contacta soporte.')), LOAD_TIMEOUT_MS)
    )

    const loadPromise = (async () => {
      try {
        const t0 = performance.now()
        const todasVentas = await ventasService.getAll()
        logRequest('ventas.getAll', { durationMs: Math.round(performance.now() - t0) })
        const ventasActivas = todasVentas.filter((v) => (v.saldo_pendiente ?? 0) > 0)
        const ventasParaLista = [...ventasActivas]
          .sort((a, b) => new Date(b.fecha_venta).getTime() - new Date(a.fecha_venta).getTime())
          .slice(0, 100)

        const ventasConCuotas = await Promise.all(
          ventasParaLista.map(async (venta) => {
            try {
              const pagos = await pagosService.getByVenta(venta.id)
              const cuotasPagadas = pagos.filter((p) => p.numero_cuota !== null).length
              return { ...venta, cuotasPagadas, cuotasPendientes: venta.cantidad_cuotas - cuotasPagadas }
            } catch {
              return { ...venta, cuotasPagadas: 0, cuotasPendientes: venta.cantidad_cuotas }
            }
          })
        )
        setVentasDelMes(ventasConCuotas)
        setTotalPorCobrar(ventasActivas.reduce((sum, v) => sum + (v.saldo_pendiente || 0), 0))

        const [ventasConMora, cuotas, plan, stats, isTrial, trialInfoData, nombreSucursal] = await Promise.all([
          obtenerVentasConMora().catch(() => []),
          obtenerCuotasPendientes().catch(() => []),
          subscriptionService.getCurrentPlan().catch(() => null),
          subscriptionService.getUsageStats().catch(() => ({ clientes: 0, prestamos: 0 })),
          subscriptionService.isTrial().catch(() => false),
          subscriptionService.getTrialInfo().catch(() => ({ isTrial: false, daysRemaining: 0, trialEndDate: null })),
          perfilesService.getNombreSucursal().catch(() => null),
        ])

        setTotalCargosMora(ventasConMora.reduce((sum, item) => sum + (item.totalCargos || 0), 0))
        setCuotasPendientes(cuotas)
        setPlanType(plan)
        setUsageStats(stats)
        setTrialInfo({ isTrial, daysRemaining: trialInfoData.daysRemaining, trialEndDate: trialInfoData.trialEndDate })
        setSucursalNombre(nombreSucursal)
        dataTraceEnd(true)
      } catch (err: any) {
        dataTraceEnd(false)
        const msg = err?.message || ''
        const code = err?.code || err?.status
        if (code === 401 || msg.includes('JWT') || msg.includes('session')) {
          setLoadError('Sesión expirada. Por favor, inicia sesión de nuevo.')
        } else if (code === 403 || msg.includes('RLS') || msg.includes('policy')) {
          setLoadError('No tienes permiso para ver estos datos. Contacta al administrador.')
        } else if (code === 406 || msg.includes('PGRST116')) {
          setLoadError('Datos no encontrados. Revisa que tu perfil tenga empresa asignada.')
        } else {
          setLoadError(msg || 'Error al cargar. Revisa la consola (F12).')
        }
      } finally {
        setLoading(false)
      }
    })()

    try {
      await Promise.race([loadPromise, timeoutPromise])
    } catch (err: any) {
      setLoading(false)
      setLoadError(err?.message || 'Tiempo de espera agotado.')
    }
  }, [])

  useEffect(() => {
    checkTourStatus()
    const handleReiniciarTour = () => setTourRun(true)
    window.addEventListener('reiniciar-tour', handleReiniciarTour)
    return () => window.removeEventListener('reiniciar-tour', handleReiniciarTour)
  }, [])

  // Verificar si es super_admin (puede cargar sin compania)
  useEffect(() => {
    perfilesService.isSuperAdmin().then(setEsSuperAdmin)
  }, [])

  // DataGate: solo cargar cuando compania esté lista Y (exista compania O sea super_admin)
  useEffect(() => {
    if (companiaLoading) return
    if (!compania && esSuperAdmin !== true) {
      setLoading(false)
      return
    }
    loadData()
  }, [companiaLoading, compania, esSuperAdmin, loadData])

  async function checkTourStatus() {
    try {
      const haCompletado = await perfilesService.haCompletadoTour()
      if (!haCompletado) {
        // Esperar un momento para que la página se renderice completamente
        setTimeout(() => {
          setTourRun(true)
        }, 1000)
      }
    } catch (error) {
      console.error('Error verificando tour:', error)
    }
  }

  function handleTourFinish() {
    setTourRun(false)
  }

  if (companiaLoading || loading || (!compania && esSuperAdmin === null)) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">
            {companiaLoading ? 'Cargando tu empresa...' : !compania && esSuperAdmin === null ? 'Verificando acceso...' : 'Preparando tu resumen de cartera...'}
          </p>
        </div>
      </div>
    )
  }

  if (!compania && esSuperAdmin === false) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center max-w-md mx-auto">
          <p className="text-amber-800 font-medium mb-2">No tienes empresa asignada</p>
          <p className="text-amber-700 text-sm mb-4">
            Tu cuenta no tiene una empresa asociada. Contacta al administrador para que te asigne una.
          </p>
          <Button onClick={() => router.push('/login')}>Volver al inicio</Button>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-md mx-auto">
          <p className="text-red-700 font-medium mb-2">Error al cargar</p>
          <p className="text-red-600 text-sm mb-4">{loadError}</p>
          <Button onClick={() => loadData()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  const plan = planType ? PLANES[planType as keyof typeof PLANES] : null

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-tour="dashboard">
      <TourGuided run={tourRun} onFinish={handleTourFinish} />
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        {sucursalNombre && (
          <div
            className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-lg ring-1 ring-white/10"
            aria-label={`Sucursal actual: ${sucursalNombre}`}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/15">
              <Building2 className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-300 font-medium">Sucursal actual</p>
              <p className="text-lg font-semibold tracking-tight">{sucursalNombre}</p>
            </div>
          </div>
        )}
      </div>

      {/* Trial Banner */}
      {trialInfo.isTrial && (
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-800">
                Período de Prueba Activo
              </p>
              <p className="text-sm text-amber-700">
                Te quedan {trialInfo.daysRemaining} días de prueba gratuita
              </p>
            </div>
            <Link href="/precios">
              <button className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-medium">
                Ver Planes
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Préstamos Activos</p>
              <p className="text-2xl font-bold text-gray-900">{ventasDelMes.length}</p>
            </div>
            <Package className="w-8 h-8 text-primary-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total por Cobrar</p>
              <p className="text-2xl font-bold text-gray-900">
                ${totalPorCobrar.toLocaleString('es-DO')}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cargos de Mora</p>
              <p className="text-2xl font-bold text-red-600">
                ${totalCargosMora.toLocaleString('es-DO')}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cuotas Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{cuotasPendientes.length}</p>
            </div>
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link
          href="/admin/sucursales"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          data-tour="sucursales"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Sucursales</h2>
          <p className="text-sm text-gray-600">Gestiona tus diferentes puntos de venta</p>
        </Link>

        <Link
          href="/ventas/nuevo"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          data-tour="nuevo-prestamo"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Nuevo Préstamo</h2>
          <p className="text-sm text-gray-600">Registra un vehículo y genera el contrato</p>
        </Link>

        <Link
          href="/admin/mora"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          data-tour="gestion-mora"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Gestión de Mora</h2>
          <p className="text-sm text-gray-600">Visualiza tu capital en riesgo</p>
        </Link>
      </div>

      {/* Usage Stats */}
      {plan && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Uso de tu plan {plan.nombre}</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Clientes</span>
                <span className="text-sm text-gray-600">
                  {usageStats.clientes} / {plan.limites.clientes === 'ilimitado' ? 'Ilimitado' : plan.limites.clientes}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${getUsagePercentage(usageStats.clientes, plan.limites.clientes)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Préstamos</span>
                <span className="text-sm text-gray-600">
                  {usageStats.prestamos} / {plan.limites.prestamos === 'ilimitado' ? 'Ilimitado' : plan.limites.prestamos}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${getUsagePercentage(usageStats.prestamos, plan.limites.prestamos)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
