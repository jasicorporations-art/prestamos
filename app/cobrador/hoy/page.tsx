'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Phone,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Target,
  TrendingUp,
  Users,
  ArrowRight,
  MapPin,
} from 'lucide-react'
import { rutasService, type VentaEnRuta } from '@/lib/services/rutas'

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtTel(tel?: string | null) {
  if (!tel) return null
  const digits = tel.replace(/\D/g, '')
  return digits.length >= 10 ? `+1${digits.slice(-10)}` : `+1${digits}`
}

function getVisitadosKey() {
  return `cobrador_visitados_${new Date().toISOString().slice(0, 10)}`
}

function loadVisitados(): Set<string> {
  try {
    const raw = localStorage.getItem(getVisitadosKey())
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveVisitados(set: Set<string>) {
  try {
    localStorage.setItem(getVisitadosKey(), JSON.stringify([...set]))
  } catch {}
}

function nivelAtraso(dias: number) {
  if (dias <= 0) return { label: 'Al día', color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' }
  if (dias <= 7) return { label: `${dias}d atraso`, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' }
  if (dias <= 30) return { label: `${dias}d atraso`, color: '#ef4444', bg: '#fef2f2', border: '#fecaca' }
  return { label: `${dias}d atraso`, color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' }
}

// ─── componente tarjeta de cliente ────────────────────────────────────────────
function ClienteCard({
  item,
  visitado,
  onToggleVisitado,
}: {
  item: VentaEnRuta
  visitado: boolean
  onToggleVisitado: (id: string) => void
}) {
  const dias = item.diasAtraso ?? 0
  const nivel = nivelAtraso(dias)
  const tel = item.cliente_celular
  const telFmt = fmtTel(tel)
  const waMsg = encodeURIComponent(
    `Hola ${item.cliente_nombre?.split(' ')[0] ?? ''}, te contactamos sobre tu cuota pendiente. Por favor comunícate con nosotros.`
  )

  return (
    <div
      className="rounded-2xl border p-4 transition-all"
      style={{
        background: visitado ? '#f8fafc' : '#fff',
        borderColor: visitado ? '#e2e8f0' : nivel.border,
        opacity: visitado ? 0.65 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ background: visitado ? '#94a3b8' : (dias > 0 ? '#ef4444' : '#3b82f6') }}
        >
          {(item.cliente_nombre ?? '?').charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-800 truncate">{item.cliente_nombre ?? '—'}</p>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: nivel.bg, color: nivel.color, border: `1px solid ${nivel.border}` }}
            >
              {nivel.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {item.motor_marca} {item.motor_modelo} · {item.numero_prestamo ?? item.id.slice(0, 8)}
          </p>
          {item.indicadorRuta && (
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {item.indicadorRuta}
            </p>
          )}
        </div>

        {/* Monto */}
        <div className="text-right shrink-0">
          <p className="text-sm font-black text-slate-800">RD$ {fmt(item.saldo_pendiente)}</p>
          <p className="text-xs text-slate-400">saldo</p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {/* Llamar */}
        {telFmt && (
          <a
            href={`tel:${telFmt}`}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe' }}
          >
            <Phone className="w-3.5 h-3.5" />
            Llamar
          </a>
        )}

        {/* WhatsApp */}
        {telFmt && (
          <a
            href={`https://wa.me/${telFmt.replace('+', '')}?text=${waMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
        )}

        {/* Registrar pago */}
        <Link
          href="/ruta"
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors ml-auto"
          style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}
        >
          Registrar pago
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        {/* Toggle visitado */}
        <button
          type="button"
          onClick={() => onToggleVisitado(item.id)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
          style={
            visitado
              ? { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }
              : { background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0' }
          }
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {visitado ? 'Visitado' : 'Marcar visitado'}
        </button>
      </div>
    </div>
  )
}

// ─── página principal ─────────────────────────────────────────────────────────
export default function CobradorHoyPage() {
  const [items, setItems] = useState<VentaEnRuta[]>([])
  const [cobradosHoy, setCobradosHoy] = useState<VentaEnRuta[]>([])
  const [meta, setMeta] = useState(0)
  const [cobrado, setCobrado] = useState(0)
  const [loading, setLoading] = useState(true)
  const [visitados, setVisitados] = useState<Set<string>>(new Set())
  const [mostrarCobrados, setMostrarCobrados] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const cargar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const result = await rutasService.getMiRutaDeHoyFiltrada()
      setItems(result.items)
      setCobradosHoy(result.cobradosHoy)
      setMeta(result.meta)
      setCobrado(result.cobrado)
    } catch (e) {
      console.error('[cobrador/hoy]', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    setVisitados(loadVisitados())
    cargar()
  }, [cargar])

  function toggleVisitado(id: string) {
    setVisitados((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      saveVisitados(next)
      return next
    })
  }

  const pendientesOrdenados = useMemo(
    () => [...items].sort((a, b) => (b.diasAtraso ?? 0) - (a.diasAtraso ?? 0)),
    [items]
  )

  const progreso = meta > 0 ? Math.min(100, (cobrado / meta) * 100) : 0
  const hoy = new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <p className="text-sm">Cargando tu ruta...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 capitalize">{hoy}</p>
            <h1 className="text-base font-black text-slate-800">Mi ruta de hoy</h1>
          </div>
          <button
            onClick={() => cargar(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-2 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pendientes', value: pendientesOrdenados.length, icon: Clock, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Cobrados hoy', value: cobradosHoy.length, icon: CheckCircle2, color: '#22c55e', bg: '#f0fdf4' },
            { label: 'Con atraso', value: items.filter((i) => (i.diasAtraso ?? 0) > 0).length, icon: AlertCircle, color: '#ef4444', bg: '#fef2f2' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-3 text-center shadow-sm">
              <div className="flex items-center justify-center mb-1">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
              </div>
              <p className="text-xl font-black text-slate-800">{value}</p>
              <p className="text-xs text-slate-400 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Barra de progreso */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Meta del día</span>
            </div>
            <span className="text-xs font-bold text-slate-800">{progreso.toFixed(0)}% completado</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progreso}%`,
                background: progreso >= 80 ? '#22c55e' : progreso >= 50 ? '#3b82f6' : '#f59e0b',
              }}
            />
          </div>
          <div className="flex justify-between mt-2.5">
            <div>
              <p className="text-xs text-slate-400">Cobrado</p>
              <p className="text-sm font-black text-emerald-700">RD$ {fmt(cobrado)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Pendiente</p>
              <p className="text-sm font-black text-slate-800">RD$ {fmt(Math.max(0, meta - cobrado))}</p>
            </div>
          </div>
        </div>

        {/* Lista pendientes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Pendientes ({pendientesOrdenados.length})
            </h2>
            <Link href="/ruta" className="text-xs font-semibold text-blue-600 flex items-center gap-1">
              Ver ruta completa <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendientesOrdenados.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">¡Ruta completada!</p>
              <p className="text-xs text-slate-400 mt-1">No hay cobros pendientes para hoy.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendientesOrdenados.map((item) => (
                <ClienteCard
                  key={item.id}
                  item={item}
                  visitado={visitados.has(item.id)}
                  onToggleVisitado={toggleVisitado}
                />
              ))}
            </div>
          )}
        </div>

        {/* Cobrados hoy */}
        {cobradosHoy.length > 0 && (
          <div>
            <button
              onClick={() => setMostrarCobrados((v) => !v)}
              className="flex items-center justify-between w-full text-xs font-bold text-slate-500 uppercase tracking-wider mb-3"
            >
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Cobrados hoy ({cobradosHoy.length})
              </span>
              {mostrarCobrados ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {mostrarCobrados && (
              <div className="space-y-2">
                {cobradosHoy.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-white rounded-xl border border-emerald-100 px-4 py-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{item.cliente_nombre}</p>
                      <p className="text-xs text-slate-400">{item.motor_marca} {item.motor_modelo}</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-700 shrink-0">
                      RD$ {fmt(item.saldo_pendiente)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
