'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  RefreshCw,
  BarChart3,
  AlertCircle,
  Percent,
  Target,
  Wallet,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { ventasService } from '@/lib/services/ventas'
import { pagosService } from '@/lib/services/pagos'
import { getTotalCargosMoraParaDashboard } from '@/lib/services/reporteMora'

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtCorto(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// ─── tooltip personalizado de recharts ────────────────────────────────────────
function TooltipCobros({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      <p className="text-blue-700 font-semibold">RD$ {fmt(payload[0]?.value ?? 0)}</p>
    </div>
  )
}

// ─── KPI card ────────────────────────────────────────────────────────────────
function KPI({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bg,
  trend,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
  bg: string
  trend?: 'up' | 'down' | null
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
        {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
      </div>
      <p className="text-2xl font-black text-slate-800 leading-tight">{value}</p>
      <p className="text-xs font-semibold text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── página ───────────────────────────────────────────────────────────────────
export default function RentabilidadPage() {
  const [loading, setLoading] = useState(true)
  const [ventas, setVentas] = useState<any[]>([])
  const [pagos, setPagos] = useState<any[]>([])
  const [totalMora, setTotalMora] = useState(0)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [ventasData, pagosData, moraData] = await Promise.all([
        ventasService.getAll(),
        pagosService.getAll(2000),
        getTotalCargosMoraParaDashboard(),
      ])
      setVentas(ventasData ?? [])
      setPagos(pagosData ?? [])
      setTotalMora(moraData?.totalMoraPendiente ?? 0)
    } catch (e) {
      console.error('[admin/rentabilidad]', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ── cálculos ────────────────────────────────────────────────────────────────
  const ventasActivas = ventas.filter(
    (v: any) => ['active', 'activo', 'Active', 'Activo'].includes(String(v.status ?? ''))
  )

  const carteraTotal = ventasActivas.reduce((a: number, v: any) => a + Number(v.saldo_pendiente ?? 0), 0)

  // Capital total prestado (en ventas activas)
  const capitalPrestado = ventasActivas.reduce((a: number, v: any) => a + Number(v.monto_total ?? 0), 0)

  // Intereses proyectados = diferencia entre monto total y capital desembolsado
  // (estimación basada en datos disponibles)
  const interesesProyectados = ventasActivas.reduce((a: number, v: any) => {
    const total = Number(v.monto_total ?? 0)
    // monto_total incluye capital + intereses si hay porcentaje
    const porcentaje = Number(v.porcentaje_interes ?? 0)
    const interes = porcentaje > 0 ? total * porcentaje : 0
    return a + interes
  }, 0)

  // Total cobrado histórico
  const totalCobradoHistorico = pagos.reduce((a: number, p: any) => a + Number(p.monto ?? 0), 0)

  // Cobros por mes (últimos 6 meses)
  const ahora = new Date()
  const cobrosPorMes: { mes: string; monto: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
    const anio = fecha.getFullYear()
    const mes = fecha.getMonth()
    const montoPagos = pagos
      .filter((p: any) => {
        if (!p.fecha_pago) return false
        const d = new Date(p.fecha_pago)
        return d.getFullYear() === anio && d.getMonth() === mes
      })
      .reduce((a: number, p: any) => a + Number(p.monto ?? 0), 0)
    cobrosPorMes.push({ mes: `${MESES[mes]} ${anio !== ahora.getFullYear() ? anio : ''}`.trim(), monto: montoPagos })
  }

  const cobradoEsteMes = cobrosPorMes[cobrosPorMes.length - 1]?.monto ?? 0
  const cobradoMesAnterior = cobrosPorMes[cobrosPorMes.length - 2]?.monto ?? 0
  const variacionMes = cobradoMesAnterior > 0
    ? ((cobradoEsteMes - cobradoMesAnterior) / cobradoMesAnterior) * 100
    : null

  // % mora sobre cartera
  const pctMora = carteraTotal > 0 ? (totalMora / carteraTotal) * 100 : 0

  // Cobros por plazo (distribución)
  const porPlazo: Record<string, number> = {}
  for (const v of ventasActivas) {
    const plazo = String((v as any).tipo_plazo ?? 'sin plazo')
    porPlazo[plazo] = (porPlazo[plazo] ?? 0) + 1
  }

  const COLORES_BARRA = ['#3b82f6', '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe']

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <p className="text-sm">Calculando rentabilidad...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-slate-800">Rentabilidad</h1>
            <p className="text-xs text-slate-400 mt-0.5">Panel financiero de tu cartera</p>
          </div>
          <button
            onClick={cargar}
            disabled={loading}
            className="flex items-center gap-2 text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* KPIs principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI
            label="Cartera total activa"
            value={`RD$ ${fmtCorto(carteraTotal)}`}
            sub={`${ventasActivas.length} préstamos`}
            icon={CreditCard}
            color="#2563eb"
            bg="#eff6ff"
            trend="up"
          />
          <KPI
            label="Cobrado este mes"
            value={`RD$ ${fmtCorto(cobradoEsteMes)}`}
            sub={variacionMes !== null ? `${variacionMes >= 0 ? '+' : ''}${variacionMes.toFixed(1)}% vs mes anterior` : undefined}
            icon={DollarSign}
            color="#16a34a"
            bg="#f0fdf4"
            trend={variacionMes !== null ? (variacionMes >= 0 ? 'up' : 'down') : null}
          />
          <KPI
            label="Mora pendiente"
            value={`RD$ ${fmtCorto(totalMora)}`}
            sub={`${pctMora.toFixed(1)}% de la cartera`}
            icon={AlertCircle}
            color="#ef4444"
            bg="#fef2f2"
            trend="down"
          />
          <KPI
            label="Cobrado histórico"
            value={`RD$ ${fmtCorto(totalCobradoHistorico)}`}
            sub={`${pagos.length} cobros totales`}
            icon={Wallet}
            color="#7c3aed"
            bg="#faf5ff"
          />
        </div>

        {/* Segunda fila de KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KPI
            label="Capital en cartera"
            value={`RD$ ${fmtCorto(capitalPrestado)}`}
            sub="monto total financiado"
            icon={Target}
            color="#0891b2"
            bg="#ecfeff"
          />
          <KPI
            label="Intereses proyectados"
            value={`RD$ ${fmtCorto(interesesProyectados)}`}
            sub="estimado sobre tasa activa"
            icon={Percent}
            color="#059669"
            bg="#ecfdf5"
          />
          <KPI
            label="% Mora / Cartera"
            value={`${pctMora.toFixed(1)}%`}
            sub={pctMora < 5 ? 'Cartera saludable' : pctMora < 15 ? 'Atención moderada' : 'Revisión urgente'}
            icon={BarChart3}
            color={pctMora < 5 ? '#16a34a' : pctMora < 15 ? '#f59e0b' : '#ef4444'}
            bg={pctMora < 5 ? '#f0fdf4' : pctMora < 15 ? '#fffbeb' : '#fef2f2'}
          />
        </div>

        {/* Gráfica cobros por mes */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-black text-slate-700">Cobros por mes — últimos 6 meses</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cobrosPorMes} barSize={36} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtCorto} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<TooltipCobros />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
              <Bar dataKey="monto" radius={[8, 8, 0, 0]}>
                {cobrosPorMes.map((_, i) => (
                  <Cell key={i} fill={i === cobrosPorMes.length - 1 ? '#2563eb' : '#bfdbfe'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-400 text-center mt-2">El mes actual aparece en azul oscuro</p>
        </div>

        {/* Distribución por plazo + indicadores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Distribución de plazo */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-700 mb-4">Distribución de préstamos por plazo</h2>
            <div className="space-y-3">
              {Object.entries(porPlazo)
                .sort(([, a], [, b]) => b - a)
                .map(([plazo, cant], i) => {
                  const pct = ventasActivas.length > 0 ? (cant / ventasActivas.length) * 100 : 0
                  return (
                    <div key={plazo}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-600 capitalize">{plazo}</span>
                        <span className="text-slate-400">{cant} préstamos ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: COLORES_BARRA[i % COLORES_BARRA.length] }}
                        />
                      </div>
                    </div>
                  )
                })}
              {Object.keys(porPlazo).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Sin datos</p>
              )}
            </div>
          </div>

          {/* Salud de la cartera */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-700 mb-4">Salud de la cartera</h2>
            <div className="space-y-3">
              {[
                {
                  label: 'Recuperación mensual',
                  value: carteraTotal > 0 ? `${((cobradoEsteMes / carteraTotal) * 100).toFixed(1)}%` : '—',
                  desc: 'cobros del mes / cartera',
                  ok: carteraTotal > 0 && cobradoEsteMes / carteraTotal >= 0.05,
                },
                {
                  label: 'Índice de mora',
                  value: `${pctMora.toFixed(1)}%`,
                  desc: 'mora / cartera total',
                  ok: pctMora < 10,
                },
                {
                  label: 'Préstamos activos',
                  value: String(ventasActivas.length),
                  desc: `de ${ventas.length} total`,
                  ok: ventasActivas.length > 0,
                },
                {
                  label: 'Cobros este mes',
                  value: String(pagos.filter((p: any) => {
                    if (!p.fecha_pago) return false
                    const d = new Date(p.fecha_pago)
                    return d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth()
                  }).length),
                  desc: 'transacciones registradas',
                  ok: true,
                },
              ].map(({ label, value, desc, ok }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{label}</p>
                      <p className="text-xs text-slate-400">{desc}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
