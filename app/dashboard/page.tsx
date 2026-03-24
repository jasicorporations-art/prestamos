'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, DollarSign, TrendingUp, AlertCircle, Clock, Building2, FileText } from 'lucide-react'
import { ventasService } from '@/lib/services/ventas'
import { pagosService } from '@/lib/services/pagos'
import { getTotalCargosMoraParaDashboard } from '@/lib/services/reporteMora'
import { getTotalCuotasAtrasadasCount } from '@/lib/services/cuotas'
import { subscriptionService } from '@/lib/services/subscription'
import { PLANES, getUsagePercentage } from '@/lib/config/planes'
import { perfilesService } from '@/lib/services/perfiles'
import { TourGuided } from '@/components/TourGuided'
import { CurrencySelector } from '@/components/CurrencySelector'
import { useCompania } from '@/lib/contexts/CompaniaContext'
import { useFormatCurrency } from '@/lib/contexts/CurrencyContext'
import type { Venta, Pago } from '@/types'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/Button'
import { dataTraceStart, dataTraceEnd, logRequest } from '@/lib/utils/authInstrumentation'
import { toast } from '@/lib/toast'

interface VentaConCuotas extends Venta {
  cuotasPagadas: number
  cuotasPendientes: number
}

export default function Dashboard() {
  const router = useRouter()
  const { loading: companiaLoading, compania } = useCompania()
  const formatCurrency = useFormatCurrency()
  const [totalPorCobrar, setTotalPorCobrar] = useState(0)
  const [totalCargosMora, setTotalCargosMora] = useState(0)
  const [moraVsAnterior, setMoraVsAnterior] = useState<number | null>(null)
  const [ventasDelMes, setVentasDelMes] = useState<VentaConCuotas[]>([])
  const [totalCuotasPendientes, setTotalCuotasPendientes] = useState(0)
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
  const [cobrosChart, setCobrosChart] = useState<{ fecha: string; total: number; count: number }[]>([])

  const loadData = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    dataTraceStart('firstFetchStart')
    const LOAD_TIMEOUT_MS = 25000

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('No se pudo cargar el panel. Comprueba tu conexión e intenta de nuevo.')), LOAD_TIMEOUT_MS)
    )

    const loadPromise = (async () => {
      try {
        const t0 = performance.now()
        const todasVentas = await ventasService.getAll()
        logRequest('ventas.getAll', { durationMs: Math.round(performance.now() - t0) })
        const ventasActivas = todasVentas.filter((v) => (Number(v.saldo_pendiente) ?? 0) > 0)
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
        setTotalPorCobrar(ventasActivas.reduce((sum, v) => sum + (Number(v.saldo_pendiente) || 0), 0))

        // Gráfico de cobros: fetch no bloqueante, no afecta el tiempo de carga principal
        pagosService.getAll().then((todosPagos) => {
          const hoy = new Date()
          const dias: { fecha: string; total: number; count: number }[] = []
          for (let i = 6; i >= 0; i--) {
            const d = new Date(hoy)
            d.setDate(hoy.getDate() - i)
            const key = d.toISOString().slice(0, 10)
            const del_dia = todosPagos.filter((p) => (p.fecha_pago || '').slice(0, 10) === key)
            dias.push({ fecha: key, total: del_dia.reduce((s, p) => s + (Number(p.monto) || 0), 0), count: del_dia.length })
          }
          setCobrosChart(dias)
        }).catch(() => { /* silencioso */ })

        const [moraResult, totalCuotas, plan, stats, isTrial, trialInfoData, nombreSucursal] = await Promise.all([
          getTotalCargosMoraParaDashboard().catch(() => ({ totalMoraPendiente: 0, totalAnterior: null })),
          getTotalCuotasAtrasadasCount().catch(() => 0),
          subscriptionService.getCurrentPlan().catch(() => null),
          subscriptionService.getUsageStats().catch(() => ({ clientes: 0, prestamos: 0 })),
          subscriptionService.isTrial().catch(() => false),
          subscriptionService.getTrialInfo().catch(() => ({ isTrial: false, daysRemaining: 0, trialEndDate: null })),
          perfilesService.getNombreSucursal().catch(() => null),
        ])

        setTotalCargosMora(moraResult.totalMoraPendiente)
        setMoraVsAnterior(moraResult.totalAnterior)
        setTotalCuotasPendientes(totalCuotas)
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
    const handleRefreshMora = () => loadData()
    window.addEventListener('dashboard:refresh-mora', handleRefreshMora)
    const handleVisibility = () => { if (document.visibilityState === 'visible') loadData() }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('reiniciar-tour', handleReiniciarTour)
      window.removeEventListener('dashboard:refresh-mora', handleRefreshMora)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [loadData])

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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
        {/* Título skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="h-9 w-40 bg-gray-200 rounded-lg" />
          <div className="h-8 w-32 bg-gray-100 rounded-lg" />
        </div>

        {/* 4 stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 w-24 bg-gray-200 rounded" />
                  <div className="h-7 w-20 bg-gray-200 rounded" />
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-full ml-4" />
              </div>
            </div>
          ))}
        </div>

        {/* Sección acciones rápidas */}
        <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-20" />
          ))}
        </div>

        {/* Tabla préstamos activos */}
        <div className="h-5 w-44 bg-gray-200 rounded mb-4" />
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
              <div className="h-4 flex-1 bg-gray-100 rounded" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
              <div className="h-4 w-20 bg-gray-100 rounded" />
              <div className="h-4 w-16 bg-gray-100 rounded" />
            </div>
          ))}
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">Moneda:</span>
            <CurrencySelector />
          </div>
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
      </div>

      {/* Trial Banner */}
      {trialInfo.isTrial && (
        <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-2xl">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          href="/dashboard/prestamos-activos"
          className="group bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-blue-200 transition-all block"
          data-tour="prestamos-activos"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-blue-500 font-medium group-hover:underline">Ver →</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-0.5">{ventasDelMes.length}</p>
          <p className="text-sm text-gray-500">Préstamos activos</p>
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-0.5">{formatCurrency(totalPorCobrar)}</p>
          <p className="text-sm text-gray-500">Total por cobrar</p>
          {cobrosChart.length > 0 && cobrosChart[cobrosChart.length - 1]?.total > 0 && (
            <p className="text-xs text-green-600 mt-1 font-medium">
              +{formatCurrency(cobrosChart[cobrosChart.length - 1].total)} hoy
            </p>
          )}
        </div>

        <Link
          href="/admin/mora"
          className="group bg-white rounded-xl shadow-sm border border-orange-200 p-5 hover:shadow-md transition-all block"
          data-tour="gestion-mora"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-500" />
            </div>
            {moraVsAnterior !== null && moraVsAnterior !== totalCargosMora && (
              <span className={`text-xs font-semibold ${totalCargosMora > moraVsAnterior ? 'text-red-500' : 'text-green-500'}`}>
                {totalCargosMora > moraVsAnterior ? '↑' : '↓'} vs ayer
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-orange-600 mb-0.5">{formatCurrency(totalCargosMora)}</p>
          <p className="text-sm text-gray-500">Cargos de mora</p>
        </Link>

        <div className={`bg-white rounded-xl shadow-sm border p-5 ${totalCuotasPendientes > 0 ? 'border-red-200' : 'border-gray-100'}`}>
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className={`text-2xl font-bold mb-0.5 ${totalCuotasPendientes > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {totalCuotasPendientes}
          </p>
          <p className="text-sm text-gray-500">Cuotas en atraso</p>
        </div>
      </div>

      {/* Gráfico cobros últimos 7 días */}
      {cobrosChart.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Cobros — últimos 7 días</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Total hoy:{' '}
                <span className="font-semibold text-gray-700">
                  {formatCurrency(cobrosChart[cobrosChart.length - 1]?.total ?? 0)}
                </span>
                {' '}· {cobrosChart[cobrosChart.length - 1]?.count ?? 0} pago{cobrosChart[cobrosChart.length - 1]?.count !== 1 ? 's' : ''}
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>

          {(() => {
            const maxTotal = Math.max(...cobrosChart.map((d) => d.total), 1)
            const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
            return (
              <div className="flex items-end gap-1.5 h-28">
                {cobrosChart.map((dia, i) => {
                  const pct = dia.total / maxTotal
                  const barH = Math.max(pct * 88, dia.total > 0 ? 6 : 2)
                  const esHoy = i === cobrosChart.length - 1
                  const fecha = new Date(dia.fecha + 'T12:00:00')
                  const label = esHoy ? 'Hoy' : DIAS_ES[fecha.getDay()]
                  return (
                    <div key={dia.fecha} className="flex-1 flex flex-col items-center gap-1" title={`${dia.fecha}: ${formatCurrency(dia.total)} (${dia.count} pagos)`}>
                      <span className="text-[10px] text-gray-400 leading-none">
                        {dia.total > 0 ? formatCurrency(dia.total).replace(/\.00$/, '') : '—'}
                      </span>
                      <div className="w-full flex items-end justify-center" style={{ height: 88 }}>
                        <div
                          style={{
                            height: barH,
                            width: '100%',
                            borderRadius: 6,
                            background: esHoy
                              ? 'linear-gradient(180deg,#22c55e,#15803d)'
                              : dia.total > 0
                                ? 'linear-gradient(180deg,#86efac,#4ade80)'
                                : '#f1f5f9',
                            boxShadow: esHoy ? '0 4px 14px rgba(34,197,94,0.45)' : 'none',
                            transition: 'height 0.4s ease',
                          }}
                        />
                      </div>
                      <span className={`text-[10px] leading-none font-medium ${esHoy ? 'text-green-600' : 'text-gray-400'}`}>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      {/* Quick Actions */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Acciones rápidas</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {[
          { href: '/ventas', icon: FileText, label: 'Financiamientos', desc: 'Ver cartera activa', color: 'text-blue-600', bg: 'bg-blue-50' },
          { href: '/pagos', icon: DollarSign, label: 'Registrar cobro', desc: 'Anotar un pago recibido', color: 'text-green-600', bg: 'bg-green-50' },
          { href: '/clientes', icon: Package, label: 'Clientes', desc: 'Buscar o añadir cliente', color: 'text-violet-600', bg: 'bg-violet-50' },
          { href: '/admin/mora', icon: AlertCircle, label: 'Gestión de mora', desc: 'Capital en riesgo', color: 'text-orange-600', bg: 'bg-orange-50' },
          { href: '/admin/sucursales', icon: Building2, label: 'Sucursales', desc: 'Puntos de venta', color: 'text-slate-600', bg: 'bg-slate-100' },
          { href: '/admin/aprobaciones', icon: CheckCircle, label: 'Aprobaciones', desc: 'Solicitudes pendientes', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(({ href, icon: Icon, label, desc, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:border-gray-200 transition-all"
          >
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} style={{ width: 18, height: 18 }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{label}</p>
              <p className="text-xs text-gray-400 truncate">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Usage Stats */}
      {plan && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
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
