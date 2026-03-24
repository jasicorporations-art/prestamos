'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Building2,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/Button'
import { Select } from '@/components/Select'
import { Input } from '@/components/Input'
import { perfilesService } from '@/lib/services/perfiles'
import { subscriptionService } from '@/lib/services/subscription'
import { tesoreriaService, type RangoTiempo, type TesoreriaKPIs, type TesoreriaMovimiento } from '@/lib/services/tesoreria'
import { toast } from '@/lib/toast'
import type { Sucursal } from '@/types'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const RANGOS: { value: RangoTiempo; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Esta Semana' },
  { value: 'mes', label: 'Este Mes' },
  { value: 'anio', label: 'Este Año' },
  { value: 'personalizado', label: 'Personalizado' },
]

export default function TesoreriaPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalId, setSucursalId] = useState<string>('')
  const [rango, setRango] = useState<RangoTiempo>('mes')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<TesoreriaKPIs | null>(null)
  const [chartData, setChartData] = useState<{ fecha: string; ingresos: number; egresos: number }[]>([])
  const [movimientos, setMovimientos] = useState<TesoreriaMovimiento[]>([])

  const loadData = useCallback(async () => {
    const sucursal = sucursalId || undefined
    const fInicio = rango === 'personalizado' ? fechaInicio : undefined
    const fFin = rango === 'personalizado' ? fechaFin : undefined

    try {
      setLoading(true)
      const [kpisData, chartDataRes, movData] = await Promise.all([
        tesoreriaService.getKPIs({ sucursalId: sucursal, rango, fechaInicio: fInicio, fechaFin: fFin }),
        tesoreriaService.getChartData({ sucursalId: sucursal, rango, fechaInicio: fInicio, fechaFin: fFin }),
        tesoreriaService.getMovimientos({ sucursalId: sucursal, rango, fechaInicio: fInicio, fechaFin: fFin }),
      ])
      setKpis(kpisData)
      setChartData(chartDataRes)
      setMovimientos(movData)
    } catch (error: any) {
      console.error('Error cargando tesorería:', error)
      toast.error(error?.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [sucursalId, rango, fechaInicio, fechaFin])

  useEffect(() => {
    async function init() {
      const [admin, planType] = await Promise.all([
        perfilesService.esAdmin(),
        subscriptionService.getCurrentPlan(),
      ])
      setIsAdmin(admin)
      if (!admin) {
        router.push('/')
        return
      }
      if (planType === 'BRONCE') {
        router.push('/admin')
        return
      }
      const sucs = await perfilesService.getSucursales()
      setSucursales(sucs || [])
    }
    init()
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Button variant="secondary" onClick={() => router.push('/admin')} className="mb-4">
          <ArrowLeft className="w-5 h-5 mr-2 inline" />
          Volver al panel
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Tesorería</h1>
        <p className="text-gray-600 mt-1">Ingresos, egresos y flujo de caja en un solo lugar. Toma decisiones con datos al día.</p>
      </div>

      <div className="space-y-6">
        {/* Filtros */}
        <div className="bg-white rounded-xl shadow border p-4 flex flex-wrap gap-4 items-end">
          {isAdmin && (
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
              <Select
                value={sucursalId}
                onChange={(e) => setSucursalId(e.target.value)}
                options={[
                  { value: '', label: 'Todas las Sucursales' },
                  ...(sucursales.map((s) => ({ value: s.id, label: s.nombre })) || []),
                ]}
              />
            </div>
          )}
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Rango de tiempo</label>
            <Select
              value={rango}
              onChange={(e) => setRango(e.target.value as RangoTiempo)}
              options={RANGOS.map((r) => ({ value: r.value, label: r.label }))}
            />
          </div>
          {rango === 'personalizado' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>
            </>
          )}
          <Button variant="secondary" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 inline ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando tu consolidado de tesorería…</div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      ${(kpis?.ingresosTotales ?? 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Egresos Totales</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      ${(kpis?.egresosTotales ?? 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <TrendingDown className="w-8 h-8 text-red-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Flujo neto del período</p>
                    <p className={`text-2xl font-bold mt-1 ${(kpis?.flujoNeto ?? 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      ${(kpis?.flujoNeto ?? 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <DollarSign className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Cartera en Riesgo</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">
                      ${(kpis?.carteraEnRiesgo ?? 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico */}
            <div className="bg-white rounded-xl shadow border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                <Calendar className="w-5 h-5 inline mr-2" />
                Ingresos vs Egresos
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="fecha" tickFormatter={(v) => new Date(v).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => `$${Number(value).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="egresos" name="Egresos" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla de movimientos */}
            <div className="bg-white rounded-xl shadow border overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-900 p-4 border-b">
                <Building2 className="w-5 h-5 inline mr-2" />
                Detalle de movimientos
              </h3>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sucursal</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movimientos.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(m.fecha_hora)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{m.concepto}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{m.sucursal_nombre}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              m.tipo === 'Entrada'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {m.tipo}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-3 text-sm font-medium text-right ${
                            m.tipo === 'Entrada' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {m.tipo === 'Entrada' ? '+' : '-'}$
                          {(m.monto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {movimientos.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Aún no hay movimientos en el período seleccionado. Cambia el rango de fechas o registra cobros y egresos desde Caja para ver tu flujo aquí.
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-100 p-6 text-center">
              <p className="text-primary-800 font-medium italic">
                &quot;El ojo del amo engorda el caballo. Aquí tienes el control de cada centavo de tu operación.&quot;
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
