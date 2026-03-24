'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  TrendingDown,
  CreditCard,
  DollarSign,
  AlertCircle,
  Download,
} from 'lucide-react'
import { ventasService } from '@/lib/services/ventas'
import { pagosService } from '@/lib/services/pagos'
import { obtenerClientesMorosos } from '@/lib/services/reporteMora'
import type { ClienteMoroso } from '@/lib/services/reporteMora'

// ─── tipos ────────────────────────────────────────────────────────────────────
type Tab = 'cartera' | 'mora' | 'cobros' | 'resumen'

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(s?: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })
}
function mesActual() {
  const ahora = new Date()
  return { anio: ahora.getFullYear(), mes: ahora.getMonth() }
}

// ─── exportar CSV ─────────────────────────────────────────────────────────────
function descargarCSV(rows: string[][], nombreArchivo: string) {
  const bom = '\uFEFF'
  const contenido = bom + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  a.click()
  URL.revokeObjectURL(url)
}

// ─── exportar PDF ─────────────────────────────────────────────────────────────
async function descargarPDF(cabeceras: string[], filas: string[][], titulo: string) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14)
  doc.text(titulo, 14, 16)
  doc.setFontSize(9)
  doc.text(`Generado: ${new Date().toLocaleString('es-DO')}`, 14, 22)
  autoTable(doc, {
    head: [cabeceras],
    body: filas,
    startY: 27,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })
  doc.save(`${titulo.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}

// ─── badge mora ──────────────────────────────────────────────────────────────
function MoraBadge({ nivel }: { nivel: ClienteMoroso['nivelMora'] }) {
  const map: Record<ClienteMoroso['nivelMora'], { label: string; color: string; bg: string }> = {
    temprana: { label: 'Temprana', color: '#92400e', bg: '#fef3c7' },
    media: { label: 'Media', color: '#c2410c', bg: '#ffedd5' },
    critica: { label: 'Crítica', color: '#991b1b', bg: '#fee2e2' },
  }
  const { label, color, bg } = map[nivel] ?? map.temprana
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: bg, color }}>
      {label}
    </span>
  )
}

// ─── página ───────────────────────────────────────────────────────────────────
export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('cartera')
  const [loading, setLoading] = useState(false)
  const [ventas, setVentas] = useState<any[]>([])
  const [pagos, setPagos] = useState<any[]>([])
  const [morosos, setMorosos] = useState<ClienteMoroso[]>([])

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [ventasData, pagosData, morososData] = await Promise.all([
        ventasService.getAll(),
        pagosService.getAll(1000),
        obtenerClientesMorosos(),
      ])
      setVentas(ventasData ?? [])
      setPagos(pagosData ?? [])
      setMorosos(morososData ?? [])
    } catch (e) {
      console.error('[admin/reportes]', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ── datos por pestaña ──────────────────────────────────────────────────────
  const ventasActivas = ventas.filter(
    (v: any) => ['active', 'activo', 'Active', 'Activo'].includes(String(v.status ?? ''))
  )

  const { anio, mes } = mesActual()
  const cobrosDelMes = pagos.filter((p: any) => {
    if (!p.fecha_pago) return false
    const d = new Date(p.fecha_pago)
    return d.getFullYear() === anio && d.getMonth() === mes
  })

  const totalCartera = ventasActivas.reduce((acc: number, v: any) => acc + Number(v.saldo_pendiente ?? 0), 0)
  const totalMora = morosos.reduce((acc, m) => acc + m.totalAPagarCuotasVencidas, 0)
  const totalCobradoMes = cobrosDelMes.reduce((acc: number, p: any) => acc + Number(p.monto ?? 0), 0)

  // ── exportaciones ──────────────────────────────────────────────────────────
  function exportarCarteraCSV() {
    const cab = ['#', 'Préstamo', 'Cliente', 'Cédula', 'Monto Total', 'Saldo Pendiente', 'Cuotas', 'Plazo', 'Fecha']
    const filas = ventasActivas.map((v: any, i: number) => [
      String(i + 1),
      v.numero_prestamo ?? v.id?.slice(0, 8),
      v.cliente?.nombre_completo ?? '—',
      v.cliente?.cedula ?? '—',
      fmt(Number(v.monto_total ?? 0)),
      fmt(Number(v.saldo_pendiente ?? 0)),
      String(v.cantidad_cuotas ?? '—'),
      v.tipo_plazo ?? '—',
      fmtDate(v.fecha_venta),
    ])
    descargarCSV([cab, ...filas], `cartera-activa-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  function exportarMoraCSV() {
    const cab = ['#', 'Cliente', 'Cédula', 'Teléfono', 'Días atraso', 'Nivel', 'Cuotas vencidas', 'Monto mora', 'Total deuda', 'Sucursal']
    const filas = morosos.map((m, i) => [
      String(i + 1),
      m.cliente_nombre,
      m.cliente_cedula ?? '—',
      m.telefono ?? '—',
      String(m.diasAtraso),
      m.nivelMora,
      String(m.cuotasVencidas),
      fmt(m.montoMora),
      fmt(m.totalDeuda),
      m.sucursal_nombre ?? '—',
    ])
    descargarCSV([cab, ...filas], `mora-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  function exportarCobrosCSV() {
    const cab = ['#', 'Fecha', 'Préstamo', 'Cliente', 'Monto', 'Cuota #']
    const filas = cobrosDelMes.map((p: any, i: number) => [
      String(i + 1),
      fmtDate(p.fecha_pago),
      p.venta?.numero_prestamo ?? p.venta_id?.slice(0, 8) ?? '—',
      p.venta?.cliente?.nombre_completo ?? '—',
      fmt(Number(p.monto ?? 0)),
      p.numero_cuota != null ? String(p.numero_cuota) : '—',
    ])
    descargarCSV([cab, ...filas], `cobros-${anio}-${String(mes + 1).padStart(2, '0')}.csv`)
  }

  async function exportarCarteraPDF() {
    const cab = ['#', 'Préstamo', 'Cliente', 'Monto Total', 'Saldo', 'Cuotas', 'Fecha']
    const filas = ventasActivas.map((v: any, i: number) => [
      String(i + 1),
      v.numero_prestamo ?? v.id?.slice(0, 8),
      v.cliente?.nombre_completo ?? '—',
      fmt(Number(v.monto_total ?? 0)),
      fmt(Number(v.saldo_pendiente ?? 0)),
      String(v.cantidad_cuotas ?? '—'),
      fmtDate(v.fecha_venta),
    ])
    await descargarPDF(cab, filas, 'Cartera Activa')
  }

  async function exportarMoraPDF() {
    const cab = ['#', 'Cliente', 'Días atraso', 'Nivel', 'Cuotas venc.', 'Monto mora', 'Total deuda']
    const filas = morosos.map((m, i) => [
      String(i + 1),
      m.cliente_nombre,
      String(m.diasAtraso),
      m.nivelMora,
      String(m.cuotasVencidas),
      fmt(m.montoMora),
      fmt(m.totalDeuda),
    ])
    await descargarPDF(cab, filas, 'Reporte de Mora')
  }

  async function exportarCobrosPDF() {
    const cab = ['#', 'Fecha', 'Préstamo', 'Cliente', 'Monto', 'Cuota #']
    const filas = cobrosDelMes.map((p: any, i: number) => [
      String(i + 1),
      fmtDate(p.fecha_pago),
      p.venta?.numero_prestamo ?? p.venta_id?.slice(0, 8) ?? '—',
      p.venta?.cliente?.nombre_completo ?? '—',
      fmt(Number(p.monto ?? 0)),
      p.numero_cuota != null ? String(p.numero_cuota) : '—',
    ])
    await descargarPDF(cab, filas, `Cobros ${new Date().toLocaleString('es-DO', { month: 'long', year: 'numeric' })}`)
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'cartera', label: 'Cartera activa', icon: CreditCard, count: ventasActivas.length },
    { id: 'mora', label: 'Mora', icon: TrendingDown, count: morosos.length },
    { id: 'cobros', label: 'Cobros del mes', icon: DollarSign, count: cobrosDelMes.length },
    { id: 'resumen', label: 'Resumen general', icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-slate-800">Reportes</h1>
            <p className="text-xs text-slate-400 mt-0.5">Exporta y descarga reportes de tu cartera</p>
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

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {/* KPIs rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Cartera activa', value: `RD$ ${fmt(totalCartera)}`, sub: `${ventasActivas.length} préstamos`, color: '#2563eb', bg: '#eff6ff' },
            { label: 'Mora total', value: `RD$ ${fmt(totalMora)}`, sub: `${morosos.length} clientes morosos`, color: '#ef4444', bg: '#fef2f2' },
            { label: 'Cobrado este mes', value: `RD$ ${fmt(totalCobradoMes)}`, sub: `${cobrosDelMes.length} cobros`, color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Clientes en mora crítica', value: String(morosos.filter((m) => m.nivelMora === 'critica').length), sub: 'más de 30 días', color: '#7c3aed', bg: '#faf5ff' },
          ].map(({ label, value, sub, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
              <p className="text-lg font-black" style={{ color }}>{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex overflow-x-auto border-b border-slate-100">
            {TABS.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                  activeTab === id
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {count !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-5">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                Cargando datos...
              </div>
            ) : (
              <>
                {/* ── CARTERA ── */}
                {activeTab === 'cartera' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-bold text-slate-600">{ventasActivas.length} préstamos activos</p>
                      <div className="flex gap-2">
                        <button onClick={exportarCarteraCSV} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                        </button>
                        <button onClick={exportarCarteraPDF} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-100">
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 text-slate-600">
                          <Printer className="w-3.5 h-3.5" /> Imprimir
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wide">
                          <tr>
                            {['#', 'Préstamo', 'Cliente', 'Monto total', 'Saldo', 'Cuotas', 'Plazo', 'Fecha'].map((h) => (
                              <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {ventasActivas.map((v: any, i: number) => (
                            <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{v.numero_prestamo ?? v.id?.slice(0, 8)}</td>
                              <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{v.cliente?.nombre_completo ?? '—'}</td>
                              <td className="px-4 py-3 font-semibold whitespace-nowrap">RD$ {fmt(Number(v.monto_total ?? 0))}</td>
                              <td className="px-4 py-3 font-bold text-blue-700 whitespace-nowrap">RD$ {fmt(Number(v.saldo_pendiente ?? 0))}</td>
                              <td className="px-4 py-3 text-center text-slate-600">{v.cantidad_cuotas ?? '—'}</td>
                              <td className="px-4 py-3 text-slate-500 capitalize">{v.tipo_plazo ?? '—'}</td>
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(v.fecha_venta)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {ventasActivas.length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-sm">Sin préstamos activos</div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── MORA ── */}
                {activeTab === 'mora' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-bold text-slate-600">{morosos.length} clientes con atraso</p>
                      <div className="flex gap-2">
                        <button onClick={exportarMoraCSV} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                        </button>
                        <button onClick={exportarMoraPDF} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-100">
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 text-slate-600">
                          <Printer className="w-3.5 h-3.5" /> Imprimir
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wide">
                          <tr>
                            {['#', 'Cliente', 'Cédula', 'Días atraso', 'Nivel', 'Cuotas venc.', 'Cargo mora', 'Total deuda', 'Sucursal'].map((h) => (
                              <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {morosos.map((m, i) => (
                            <tr key={m.venta_id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{m.cliente_nombre}</td>
                              <td className="px-4 py-3 text-slate-500">{m.cliente_cedula ?? '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`font-bold text-xs ${m.diasAtraso > 30 ? 'text-purple-700' : m.diasAtraso > 7 ? 'text-red-600' : 'text-amber-600'}`}>
                                  {m.diasAtraso}d
                                </span>
                              </td>
                              <td className="px-4 py-3"><MoraBadge nivel={m.nivelMora} /></td>
                              <td className="px-4 py-3 text-center text-slate-600">{m.cuotasVencidas}</td>
                              <td className="px-4 py-3 font-semibold text-red-700 whitespace-nowrap">RD$ {fmt(m.montoMora)}</td>
                              <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">RD$ {fmt(m.totalDeuda)}</td>
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{m.sucursal_nombre ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {morosos.length === 0 && (
                        <div className="text-center py-10 text-emerald-600 text-sm font-semibold">
                          ✓ Sin clientes morosos
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── COBROS DEL MES ── */}
                {activeTab === 'cobros' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-bold text-slate-600">
                        {cobrosDelMes.length} cobros · RD$ {fmt(totalCobradoMes)}
                      </p>
                      <div className="flex gap-2">
                        <button onClick={exportarCobrosCSV} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                        </button>
                        <button onClick={exportarCobrosPDF} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-100">
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 text-slate-600">
                          <Printer className="w-3.5 h-3.5" /> Imprimir
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wide">
                          <tr>
                            {['#', 'Fecha', 'Préstamo', 'Cliente', 'Monto', 'Cuota #'].map((h) => (
                              <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {cobrosDelMes.map((p: any, i: number) => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDate(p.fecha_pago)}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{p.venta?.numero_prestamo ?? p.venta_id?.slice(0, 8)}</td>
                              <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{p.venta?.cliente?.nombre_completo ?? '—'}</td>
                              <td className="px-4 py-3 font-bold text-emerald-700 whitespace-nowrap">RD$ {fmt(Number(p.monto ?? 0))}</td>
                              <td className="px-4 py-3 text-center text-slate-500">{p.numero_cuota ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {cobrosDelMes.length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-sm">Sin cobros este mes</div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── RESUMEN ── */}
                {activeTab === 'resumen' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Distribución mora */}
                      <div className="rounded-xl border border-slate-100 p-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Distribución de mora</p>
                        {(['temprana', 'media', 'critica'] as const).map((nivel) => {
                          const grupo = morosos.filter((m) => m.nivelMora === nivel)
                          const total = grupo.reduce((a, m) => a + m.totalDeuda, 0)
                          const pct = morosos.length > 0 ? (grupo.length / morosos.length) * 100 : 0
                          const colores: Record<string, { bar: string; text: string }> = {
                            temprana: { bar: '#f59e0b', text: '#92400e' },
                            media: { bar: '#f97316', text: '#c2410c' },
                            critica: { bar: '#ef4444', text: '#991b1b' },
                          }
                          return (
                            <div key={nivel} className="mb-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-semibold capitalize" style={{ color: colores[nivel].text }}>
                                  {nivel} ({grupo.length})
                                </span>
                                <span className="text-slate-500">RD$ {fmt(total)}</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colores[nivel].bar }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Resumen numérico */}
                      <div className="rounded-xl border border-slate-100 p-4 space-y-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Indicadores clave</p>
                        {[
                          { label: 'Total cartera activa', value: `RD$ ${fmt(totalCartera)}`, color: '#2563eb' },
                          { label: 'Total mora acumulada', value: `RD$ ${fmt(totalMora)}`, color: '#ef4444' },
                          { label: 'Cobrado este mes', value: `RD$ ${fmt(totalCobradoMes)}`, color: '#16a34a' },
                          { label: '% de cartera en mora', value: `${totalCartera > 0 ? ((totalMora / totalCartera) * 100).toFixed(1) : 0}%`, color: '#f59e0b' },
                          { label: 'Préstamos activos', value: String(ventasActivas.length), color: '#6366f1' },
                          { label: 'Clientes morosos', value: String(morosos.length), color: '#7c3aed' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                            <span className="text-sm text-slate-600">{label}</span>
                            <span className="text-sm font-black" style={{ color }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top 5 deudores */}
                    <div className="rounded-xl border border-slate-100 p-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        Top 5 mayores deudas en mora
                      </p>
                      <div className="space-y-2">
                        {[...morosos].sort((a, b) => b.totalDeuda - a.totalDeuda).slice(0, 5).map((m, i) => (
                          <div key={m.venta_id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-xs font-bold text-slate-500 flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{m.cliente_nombre}</p>
                              <p className="text-xs text-slate-400">{m.diasAtraso} días · {m.cuotasVencidas} cuotas</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-black text-red-700">RD$ {fmt(m.totalDeuda)}</p>
                              <MoraBadge nivel={m.nivelMora} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
