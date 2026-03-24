'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  KeyRound,
  LogOut,
  CreditCard,
  FileText,
  Bell,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  DollarSign,
  Calendar,
  Receipt,
  ArrowRight,
  Shield,
  X,
  Info,
} from 'lucide-react'
import { Modal } from '@/components/Modal'
import { calcularFinanciamientoFrances, type MetodoInteres, type TipoPlazo } from '@/lib/services/interes'
import { formatCalendarDateDominican } from '@/lib/utils/dateFormat'

type ResumenData = {
  cliente: {
    nombre_completo: string
    cedula: string
    celular?: string | null
    tiene_contrasena_portal?: boolean
  }
  empresa_telefono?: string | null
  resumen: { prestamos_activos: number; saldo_total: number }
  ventas: Array<{
    id: string
    numero_prestamo?: string | null
    monto_total: number
    saldo_pendiente: number
    status?: string | null
    contrato_url?: string
    carta_saldo_url?: string | null
    tipo_plazo?: TipoPlazo | null
    metodo_interes?: MetodoInteres | null
    porcentaje_interes?: number | null
  }>
  ventas_documentos?: Array<{
    id: string
    numero_prestamo?: string | null
    monto_total: number
    saldo_pendiente: number
    status?: string | null
    contrato_url?: string
    carta_saldo_url?: string | null
  }>
  pagos: Array<{ id: string; monto: number; fecha_pago: string; numero_cuota?: number | null; recibo_url: string }>
  cuotas: Array<{
    venta_id: string
    numero_cuota: number
    fecha_vencimiento?: string | null
    monto_cuota: number
    pagada: boolean
    vencida: boolean
    numero_prestamo_label?: string | null
  }>
  notificaciones_pendientes?: Array<{
    id: string
    id_prestamo?: string | null
    monto: number
    fecha_notificacion: string
    estado: string
  }>
  /** Lo mismo que devuelve GET /api/public/cliente-portal/resumen (útil tras aprobar en admin). */
  _debug?: {
    session_empresa_id?: string
    session_cliente_id?: string
    all_cliente_ids?: string[]
    venta_ids_encontrados?: string[]
    total_pagos_db?: number
  }
}

type Tab = 'cuotas' | 'pagos' | 'documentos' | 'renovar'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'cuotas', label: 'Cuotas', icon: Calendar },
  { id: 'pagos', label: 'Pagos', icon: Receipt },
  { id: 'documentos', label: 'Documentos', icon: FileText },
  { id: 'renovar', label: 'Renovar', icon: RefreshCw },
]

function fmt(n: number) {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(s?: string | null) {
  return formatCalendarDateDominican(s)
}

export default function PortalClientePage() {
  const params = useSearchParams()
  const empresaId = useMemo(() => (params.get('empresa_id') || '').trim(), [params])
  const empresaNombre = useMemo(() => (params.get('empresa') || '').trim(), [params])
  const [loading, setLoading] = useState(false)
  const [authOk, setAuthOk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ResumenData | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('cuotas')

  // Notificar pago
  const [enviandoNotif, setEnviandoNotif] = useState(false)
  const [msgNotif, setMsgNotif] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [notifEnviada, setNotifEnviada] = useState<{ monto: number; prestamo: string; whatsappUrl: string } | null>(null)

  // Renovación
  const [enviandoRenovacion, setEnviandoRenovacion] = useState(false)
  const [msgRenovacion, setMsgRenovacion] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [renovVentaId, setRenovVentaId] = useState('')
  const [renovMonto, setRenovMonto] = useState<number>(0)
  const [renovCuotas, setRenovCuotas] = useState<number>(12)
  const [renovTipoPlazo, setRenovTipoPlazo] = useState<TipoPlazo>('mensual')
  const [renovMetodoInteres, setRenovMetodoInteres] = useState<MetodoInteres>('fijo')
  const [renovInteresPrestamo, setRenovInteresPrestamo] = useState<number>(0.2)

  // Cambiar contraseña
  const [modalClaveOpen, setModalClaveOpen] = useState(false)
  const [claveActual, setClaveActual] = useState('')
  const [claveNueva, setClaveNueva] = useState('')
  const [claveConfirm, setClaveConfirm] = useState('')
  const [claveGuardando, setClaveGuardando] = useState(false)
  const [claveMsg, setClaveMsg] = useState<string | null>(null)
  const [claveErr, setClaveErr] = useState<string | null>(null)

  const [refreshing, setRefreshing] = useState(false)
  const lastBgRefreshAt = useRef(0)

  const cargarResumen = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent
    const res = await fetch(`/api/public/cliente-portal/resumen?_=${Date.now()}`, {
      cache: 'no-store',
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.error || 'No se pudo cargar el dashboard')
    setData(json)
    setAuthOk(true)
  }, [])

  const throttledSilentRefresh = useCallback(() => {
    const now = Date.now()
    if (now - lastBgRefreshAt.current < 2500) return
    lastBgRefreshAt.current = now
    void cargarResumen({ silent: true }).catch((err) => {
      console.error('[portal] silent refresh error:', err)
    })
  }, [cargarResumen])

  async function onRefresh() {
    setRefreshing(true)
    await cargarResumen().catch(() => {})
    setRefreshing(false)
  }

  async function onLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const form = new FormData(e.currentTarget)
      const body = {
        empresa_id: empresaId,
        empresa_nombre: empresaNombre || undefined,
        cedula: String(form.get('cedula') || ''),
        pin_o_ultimos4: String(form.get('pin_o_ultimos4') || ''),
      }
      const res = await fetch('/api/public/cliente-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'No se pudo iniciar sesion')
      await cargarResumen()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function onLogout() {
    await fetch('/api/public/cliente-portal/logout', { method: 'POST', credentials: 'include' })
    setAuthOk(false)
    setData(null)
  }

  function openModalClave() {
    setClaveActual('')
    setClaveNueva('')
    setClaveConfirm('')
    setClaveMsg(null)
    setClaveErr(null)
    setModalClaveOpen(true)
  }

  async function onCambiarContrasena(e: FormEvent) {
    e.preventDefault()
    setClaveMsg(null)
    setClaveErr(null)
    setClaveGuardando(true)
    try {
      const res = await fetch('/api/public/cliente-portal/cambiar-contrasena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          contrasena_actual: claveActual,
          contrasena_nueva: claveNueva,
          confirmar_nueva: claveConfirm,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'No se pudo actualizar')
      setClaveMsg(json?.mensaje || 'Contraseña actualizada correctamente.')
      setClaveActual('')
      setClaveNueva('')
      setClaveConfirm('')
      await cargarResumen()
    } catch (err: unknown) {
      setClaveErr(err instanceof Error ? err.message : 'Error')
    } finally {
      setClaveGuardando(false)
    }
  }

  useEffect(() => {
    if (!empresaId && !empresaNombre) return
    cargarResumen().catch((err) => {
      console.error('[portal] initial load error:', err)
    })
  }, [empresaId, empresaNombre, cargarResumen])

  // Al volver a la pestaña o enfocar la ventana: nuevos pagos/recibos sin pulsar Actualizar
  useEffect(() => {
    if (!authOk) return
    const onVisibility = () => {
      if (document.visibilityState === 'visible') throttledSilentRefresh()
    }
    const onFocus = () => throttledSilentRefresh()
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) throttledSilentRefresh()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [authOk, throttledSilentRefresh])

  // Al abrir la pestaña "Pagos", traer lista al momento (aprobaciones recientes)
  useEffect(() => {
    if (!authOk || activeTab !== 'pagos') return
    lastBgRefreshAt.current = 0
    void cargarResumen({ silent: true }).catch((err) => {
      console.error('[portal] refresh pagos error:', err)
    })
  }, [activeTab, authOk, cargarResumen])

  // Auto-refresh frecuente mientras está autenticado (pagos y saldos)
  useEffect(() => {
    if (!authOk) return
    const ms = activeTab === 'pagos' ? 5_000 : 20_000
    const timer = setInterval(() => {
      void cargarResumen({ silent: true }).catch((err) => {
        console.error('[portal] interval refresh error:', err)
      })
    }, ms)
    return () => clearInterval(timer)
  }, [authOk, activeTab, cargarResumen])

  async function onNotificarPago(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsgNotif(null)
    setNotifEnviada(null)
    setEnviandoNotif(true)
    const formEl = e.currentTarget
    const fd = new FormData(formEl)
    const idPrestamo = String(fd.get('id_prestamo') || '')
    const monto = Number(fd.get('monto') || 0)
    const ventaSeleccionada = (data?.ventas || []).find(v => v.id === idPrestamo)
    const numeroPrestamo = ventaSeleccionada?.numero_prestamo || idPrestamo.slice(0, 8)
    const nombreCliente = data?.cliente?.nombre_completo || ''

    try {
      const res = await fetch('/api/public/cliente-portal/notificar-pago', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_prestamo: idPrestamo, monto }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = [json?.error, json?.hint].filter(Boolean).join(' ')
        throw new Error(msg || 'No se pudo notificar pago')
      }

      // Construir enlace de WhatsApp con el teléfono de la empresa
      const telEmpresa = data?.empresa_telefono || ''
      const telLimpio = telEmpresa.replace(/\D/g, '')
      const texto = encodeURIComponent(
        `Hola, soy ${nombreCliente}. Le notifico un pago de RD$${monto.toLocaleString('es-DO')} para el préstamo #${numeroPrestamo}. Adjunto el comprobante.`
      )
      const whatsappUrl = telLimpio
        ? `https://wa.me/${telLimpio}?text=${texto}`
        : `https://wa.me/?text=${texto}`

      setNotifEnviada({ monto, prestamo: numeroPrestamo, whatsappUrl })
      formEl.reset()
      await cargarResumen({ silent: true }).catch(() => {})
    } catch (e: unknown) {
      setMsgNotif({ type: 'err', text: e instanceof Error ? e.message : 'Error' })
    } finally {
      setEnviandoNotif(false)
    }
  }

  async function onSolicitarRenovacion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsgRenovacion(null)
    if (!renovVentaId || !Number.isFinite(renovMonto) || renovMonto <= 0 || !Number.isFinite(renovCuotas) || renovCuotas <= 0) {
      setMsgRenovacion({ type: 'err', text: 'Completa préstamo, monto y cuotas.' })
      return
    }
    setEnviandoRenovacion(true)
    try {
      const res = await fetch('/api/public/cliente-portal/renovacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          venta_id: renovVentaId,
          monto_renovar: renovMonto,
          cantidad_cuotas: renovCuotas,
          tipo_plazo: renovTipoPlazo,
          metodo_interes: renovMetodoInteres,
          interes_prestamo: renovInteresPrestamo,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'No se pudo enviar la solicitud')
      setMsgRenovacion({ type: 'ok', text: 'Solicitud enviada. Un asesor la revisará en breve.' })
      await cargarResumen({ silent: true }).catch(() => {})
    } catch (e: unknown) {
      setMsgRenovacion({ type: 'err', text: e instanceof Error ? e.message : 'Error' })
    } finally {
      setEnviandoRenovacion(false)
    }
  }

  const ventaRenov = (data?.ventas || []).find((v) => v.id === renovVentaId)
  useEffect(() => {
    if (!ventaRenov) return
    const tipo = (ventaRenov.tipo_plazo || 'mensual') as TipoPlazo
    const metodo = (ventaRenov.metodo_interes || 'fijo') as MetodoInteres
    const interes = Number(ventaRenov.porcentaje_interes ?? 0.2)
    setRenovTipoPlazo(['diario', 'semanal', 'quincenal', 'mensual'].includes(tipo) ? tipo : 'mensual')
    setRenovMetodoInteres(['fijo', 'sobre_saldo'].includes(metodo) ? metodo : 'fijo')
    setRenovInteresPrestamo(Number.isFinite(interes) ? interes : 0.2)
  }, [ventaRenov?.id])

  const saldoActual = Number(ventaRenov?.saldo_pendiente || 0)
  const netoEstimado = Math.max(0, Number(renovMonto || 0) - saldoActual)
  const detalleSimulacion = calcularFinanciamientoFrances({
    montoBase: Number(renovMonto || 0),
    tasaAnual: Number(renovInteresPrestamo || 0),
    numeroCuotas: Number(renovCuotas || 0),
    tipoPlazo: renovTipoPlazo,
    metodoInteres: renovMetodoInteres,
  })
  const cuotaEstimada = Number(detalleSimulacion.cuotaFija || 0)

  // Próxima cuota vencida o pendiente
  const proximaCuota = useMemo(() => {
    const pending = (data?.cuotas || []).filter((c) => !c.pagada)
    if (!pending.length) return null
    return pending.sort((a, b) => {
      const da = a.fecha_vencimiento ? new Date(a.fecha_vencimiento).getTime() : Infinity
      const db = b.fecha_vencimiento ? new Date(b.fecha_vencimiento).getTime() : Infinity
      return da - db
    })[0]
  }, [data?.cuotas])

  // ---------- LOGIN ----------
  if (!authOk) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #050b18 0%, #0a1628 50%, #050e1f 100%)' }}
      >
        {/* Grid de fondo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        {/* Glow superior derecho */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-120px',
            right: '-120px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 65%)',
          }}
        />
        {/* Glow inferior izquierdo */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '-120px',
            left: '-120px',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)',
          }}
        />

        {/* Línea decorativa superior */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), transparent)' }}
        />

        <div className="w-full max-w-sm relative z-10">

          {/* ── Cabecera ── */}
          <div className="text-center mb-10">
            {/* Icono con glow */}
            <div className="inline-flex items-center justify-center mb-6 relative">
              <div
                className="absolute inset-0 rounded-2xl blur-xl"
                style={{ background: 'rgba(59,130,246,0.45)', transform: 'scale(1.3)' }}
              />
              <div
                className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                  boxShadow: '0 0 0 1px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
              >
                <Shield className="w-8 h-8 text-white drop-shadow" />
              </div>
            </div>

            <h1
              className="text-3xl font-bold tracking-tight text-white mb-1"
              style={{ letterSpacing: '-0.02em' }}
            >
              Portal Cliente
            </h1>

            {empresaNombre ? (
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.5))' }} />
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#60a5fa', letterSpacing: '0.12em' }}>
                  {empresaNombre}
                </span>
                <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.5), transparent)' }} />
              </div>
            ) : (
              <p className="text-xs tracking-widest uppercase mt-2" style={{ color: 'rgba(148,163,184,0.4)', letterSpacing: '0.14em' }}>
                Acceso seguro
              </p>
            )}
          </div>

          {/* ── Tarjeta ── */}
          {!empresaId && !empresaNombre ? (
            <div
              className="rounded-2xl px-5 py-4 text-sm text-center"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#fca5a5',
              }}
            >
              URL inválida. Contacte a su sucursal para obtener el enlace correcto.
            </div>
          ) : (
            <div
              className="rounded-3xl p-7"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 32px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <form onSubmit={onLogin} className="space-y-5">

                {/* Campo cédula */}
                <div>
                  <label
                    className="block text-xs font-bold mb-2 uppercase"
                    style={{ color: 'rgba(148,163,184,0.6)', letterSpacing: '0.1em' }}
                  >
                    Cédula
                  </label>
                  <input
                    name="cedula"
                    required
                    placeholder="000-0000000-0"
                    className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.09)',
                      color: '#f1f5f9',
                      caretColor: '#3b82f6',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.border = '1px solid rgba(59,130,246,0.5)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                </div>

                {/* Campo contraseña */}
                <div>
                  <label
                    className="block text-xs font-bold mb-2 uppercase"
                    style={{ color: 'rgba(148,163,184,0.6)', letterSpacing: '0.1em' }}
                  >
                    Contraseña
                  </label>
                  <input
                    name="pin_o_ultimos4"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.09)',
                      color: '#f1f5f9',
                      caretColor: '#3b82f6',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.border = '1px solid rgba(59,130,246,0.5)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: 'rgba(100,116,139,0.8)' }}>
                    Primer acceso: últimos 4 dígitos de tu celular o PIN de solicitud.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div
                    className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
                    style={{
                      background: 'rgba(239,68,68,0.09)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: '#fca5a5',
                    }}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                {/* Botón */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full font-bold rounded-xl py-3.5 text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: loading
                      ? 'rgba(59,130,246,0.6)'
                      : 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
                    boxShadow: loading ? 'none' : '0 4px 24px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                    letterSpacing: '0.02em',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.currentTarget.style.boxShadow = '0 6px 32px rgba(59,130,246,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) e.currentTarget.style.boxShadow = '0 4px 24px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.15)'
                  }}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      Verificando identidad...
                    </>
                  ) : (
                    <>
                      Acceder al portal
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Separador */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <span className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>o</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>

                {/* Link solicitar */}
                <div className="text-center text-sm" style={{ color: 'rgba(100,116,139,0.7)' }}>
                  ¿Sin cuenta?{' '}
                  <Link
                    href={
                      empresaId
                        ? `/solicitud-prestamo?empresa_id=${encodeURIComponent(empresaId)}`
                        : empresaNombre
                          ? `/solicitud-prestamo?empresa=${encodeURIComponent(empresaNombre)}`
                          : '/solicitud-prestamo'
                    }
                    className="font-semibold transition-colors"
                    style={{ color: '#60a5fa' }}
                  >
                    Solicitar crédito →
                  </Link>
                </div>
              </form>
            </div>
          )}

          {/* ── Badge de seguridad ── */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <div className="flex items-center gap-1.5" style={{ color: 'rgba(100,116,139,0.4)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
              <span className="text-xs tracking-wider" style={{ letterSpacing: '0.08em' }}>Conexión segura</span>
            </div>
            <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="flex items-center gap-1.5" style={{ color: 'rgba(100,116,139,0.4)' }}>
              <Shield className="w-3 h-3" />
              <span className="text-xs tracking-wider" style={{ letterSpacing: '0.08em' }}>Datos protegidos</span>
            </div>
          </div>

        </div>
      </div>
    )
  }

  // ---------- DASHBOARD ----------
  const initials = (data?.cliente?.nombre_completo || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{data?.cliente?.nombre_completo}</p>
              <p className="text-xs text-slate-400 leading-tight">{data?.cliente?.cedula}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={openModalClave}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Ajustes de contraseña"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              onClick={onLogout}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-xs text-slate-500 font-medium">Préstamos</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{data?.resumen?.prestamos_activos || 0}</p>
            <p className="text-xs text-slate-400 mt-0.5">activos</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-xs text-slate-500 font-medium">Saldo</span>
            </div>
            <p className="text-lg font-bold text-slate-800 leading-tight">
              {fmt(data?.resumen?.saldo_total || 0)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">RD$ total</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${proximaCuota?.vencida ? 'bg-red-50' : 'bg-amber-50'}`}>
                <Calendar className={`w-3.5 h-3.5 ${proximaCuota?.vencida ? 'text-red-600' : 'text-amber-600'}`} />
              </div>
              <span className="text-xs text-slate-500 font-medium">Próxima</span>
            </div>
            {proximaCuota ? (
              <>
                <p className={`text-sm font-bold leading-tight ${proximaCuota.vencida ? 'text-red-700' : 'text-slate-800'}`}>
                  RD$ {fmt(proximaCuota.monto_cuota)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{fmtDate(proximaCuota.fecha_vencimiento)}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-emerald-700">Al día</p>
                <p className="text-xs text-slate-400 mt-0.5">Sin pendientes</p>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex overflow-x-auto border-b border-slate-100 scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                    active
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="p-4">
            {/* ---- TAB: CUOTAS ---- */}
            {activeTab === 'cuotas' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    «Pagada» solo cuando existe un pago registrado en el sistema para esa cuota.
                  </p>
                  <button
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 shrink-0 ml-3 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    Actualizar
                  </button>
                </div>
                {(data?.cuotas || []).length === 0 ? (
                  <EmptyState icon={Calendar} text="Sin cuotas registradas" />
                ) : (
                  <div className="space-y-2">
                    {(data?.cuotas || []).map((c) => (
                      <div
                        key={`${c.venta_id}-${c.numero_cuota}`}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                          c.pagada
                            ? 'bg-emerald-50 border-emerald-100'
                            : c.vencida
                              ? 'bg-red-50 border-red-100'
                              : 'bg-white border-slate-100'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {c.pagada ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : c.vencida ? (
                              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            )}
                            <span className="text-sm font-medium text-slate-800 truncate">
                              {c.numero_prestamo_label || String(c.venta_id).slice(0, 8)} · Cuota {c.numero_cuota}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 ml-6">{fmtDate(c.fecha_vencimiento)}</p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-sm font-bold text-slate-800">RD$ {fmt(c.monto_cuota)}</p>
                          <span
                            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${
                              c.pagada
                                ? 'bg-emerald-100 text-emerald-700'
                                : c.vencida
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {c.pagada ? 'Pagada' : c.vencida ? 'Vencida' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ---- TAB: PAGOS ---- */}
            {activeTab === 'pagos' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    {(data?.pagos || []).length > 0
                      ? `${(data?.pagos || []).length} pago${(data?.pagos || []).length !== 1 ? 's' : ''} registrado${(data?.pagos || []).length !== 1 ? 's' : ''}`
                      : 'Historial de pagos'}
                  </p>
                  <button
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    Actualizar
                  </button>
                </div>

                {(data?.pagos || []).length === 0 ? (
                  <EmptyState icon={Receipt} text="Sin pagos registrados aún" />
                ) : (
                  <div className="space-y-2">
                    {(data?.pagos || []).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">RD$ {fmt(p.monto)}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {fmtDate(p.fecha_pago)}{p.numero_cuota != null ? ` · Cuota ${p.numero_cuota}` : ''}
                            </p>
                          </div>
                        </div>
                        <a
                          href={p.recibo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors shrink-0 ml-2"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          Ver / Imprimir
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ---- TAB: NOTIFICAR ---- */}
            {activeTab === 'notificar' && (
              <div className="space-y-4">

              {/* Paso 2: tras enviar — botón WhatsApp */}
              {notifEnviada ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">¡Notificación registrada!</p>
                      <p className="text-sm text-emerald-700 mt-0.5">
                        Pago de <strong>RD${notifEnviada.monto.toLocaleString('es-DO')}</strong> para el préstamo <strong>#{notifEnviada.prestamo}</strong> fue notificado.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-2">
                    <p className="text-sm font-semibold text-slate-700">Paso 2 — Envía tu comprobante por WhatsApp</p>
                    <p className="text-sm text-slate-500">
                      Toca el botón para abrir WhatsApp. El mensaje ya está escrito; solo adjunta la foto de tu comprobante y envíalo desde tu WhatsApp personal.
                    </p>
                    {!data?.empresa_telefono && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                        Tu empresa no tiene teléfono de WhatsApp configurado. Se abrirá WhatsApp sin destinatario para que puedas elegir el contacto manualmente.
                      </p>
                    )}
                    <a
                      href={notifEnviada.whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20b358] text-white font-semibold py-3 text-sm transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Enviar comprobante por WhatsApp
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNotifEnviada(null)}
                    className="w-full text-sm text-slate-500 underline py-1"
                  >
                    Notificar otro pago
                  </button>
                </div>
              ) : (
              /* Paso 1: formulario */
              <form onSubmit={onNotificarPago} className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Ingresa el monto que pagaste. Luego te enviaremos al WhatsApp de la empresa para que adjuntes la foto de tu comprobante.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Préstamo</label>
                  <select
                    name="id_prestamo"
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                  >
                    <option value="">Seleccionar préstamo</option>
                    {(data?.ventas || []).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.numero_prestamo || v.id.slice(0, 8)} — Saldo RD$ {fmt(v.saldo_pendiente)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Monto pagado</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">RD$</span>
                    <input
                      name="monto"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      placeholder="0.00"
                      className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                    />
                  </div>
                </div>

                {msgNotif && (
                  <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {msgNotif.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={enviandoNotif}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {enviandoNotif ? (
                    <>
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      Siguiente — Enviar comprobante
                    </>
                  )}
                </button>
              </form>
              )}

              {/* Historial de comprobantes enviados */}
              {(data?.notificaciones_pendientes || []).length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Comprobantes enviados
                  </p>
                  <div className="space-y-2">
                    {(data?.notificaciones_pendientes || []).map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                          n.estado === 'Verificado'
                            ? 'bg-emerald-50 border-emerald-100'
                            : 'bg-amber-50 border-amber-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {n.estado === 'Verificado'
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            : <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          }
                          <div>
                            <p className="text-sm font-medium text-slate-800">RD$ {fmt(n.monto)}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{fmtDate(n.fecha_notificacion)}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          n.estado === 'Verificado'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {n.estado === 'Verificado' ? 'Verificado' : 'Pendiente'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>
            )}

            {/* ---- TAB: DOCUMENTOS ---- */}
            {activeTab === 'documentos' && (
              <div className="space-y-2">
                {(data?.ventas_documentos || data?.ventas || []).length === 0 ? (
                  <EmptyState icon={FileText} text="Sin documentos disponibles" />
                ) : (
                  (data?.ventas_documentos || data?.ventas || []).map((v) => (
                    <div key={`doc-${v.id}`} className="rounded-xl border border-slate-100 bg-white overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Préstamo {v.numero_prestamo || v.id.slice(0, 8)}
                        </p>
                      </div>
                      <div className="divide-y divide-slate-50">
                        <a
                          href={`/portal-cliente/documentos/${v.id}/contrato`}
                          className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-700 font-medium">Contrato de préstamo</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </a>
                        {Number(v.saldo_pendiente || 0) <= 0.0001 ? (
                          <a
                            href={`/portal-cliente/documentos/${v.id}/carta-saldo`}
                            className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
                          >
                            <div className="flex items-center gap-2.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span className="text-sm text-slate-700 font-medium">Carta de saldo cero</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                          </a>
                        ) : (
                          <div className="flex items-center justify-between px-4 py-3 opacity-50 cursor-not-allowed">
                            <div className="flex items-center gap-2.5">
                              <X className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-500">Carta de saldo</span>
                            </div>
                            <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">No disponible</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ---- TAB: RENOVAR ---- */}
            {activeTab === 'renovar' && (
              <form onSubmit={onSolicitarRenovacion} className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Solicita la renovación de un préstamo activo. Un asesor revisará tu solicitud.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Préstamo a renovar</label>
                  <select
                    value={renovVentaId}
                    onChange={(e) => setRenovVentaId(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                  >
                    <option value="">Seleccionar préstamo</option>
                    {(data?.ventas || []).map((v) => (
                      <option key={`renov-${v.id}`} value={v.id}>
                        {v.numero_prestamo || v.id.slice(0, 8)} — Saldo RD$ {fmt(v.saldo_pendiente)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Monto</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={renovMonto || ''}
                      onChange={(e) => setRenovMonto(Number(e.target.value || 0))}
                      required
                      placeholder="0.00"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Cuotas</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={renovCuotas || ''}
                      onChange={(e) => setRenovCuotas(Number(e.target.value || 0))}
                      required
                      placeholder="12"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Plazo</label>
                    <select
                      value={renovTipoPlazo}
                      onChange={(e) => setRenovTipoPlazo(e.target.value as TipoPlazo)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                    >
                      <option value="diario">Diario</option>
                      <option value="semanal">Semanal</option>
                      <option value="quincenal">Quincenal</option>
                      <option value="mensual">Mensual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Interés (%)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={renovInteresPrestamo || ''}
                      onChange={(e) => setRenovInteresPrestamo(Number(e.target.value || 0))}
                      required
                      placeholder="0.20"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                    />
                  </div>
                </div>

                {/* Simulación */}
                {renovVentaId && renovMonto > 0 && renovCuotas > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Simulación estimada</p>
                    {[
                      { label: 'Saldo actual a cancelar', value: `RD$ ${fmt(saldoActual)}` },
                      { label: 'Neto estimado a recibir', value: `RD$ ${fmt(netoEstimado)}` },
                      { label: 'Monto total del préstamo', value: `RD$ ${fmt(Number(detalleSimulacion.montoTotal || 0))}` },
                      { label: `Cuota ${renovTipoPlazo} estimada`, value: `RD$ ${fmt(cuotaEstimada)}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">{label}</span>
                        <span className="font-semibold text-slate-800">{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {msgRenovacion && (
                  <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${msgRenovacion.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {msgRenovacion.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                    {msgRenovacion.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={enviandoRenovacion}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {enviandoRenovacion ? (
                    <>
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Solicitar renovación
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Misma carga que Network → resumen: comprobar si el admin insertó en `pagos` */}
        {data?._debug && (
          <details className="rounded-2xl border border-slate-200 bg-white shadow-sm text-slate-600 overflow-hidden">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700 flex items-center gap-2 hover:bg-slate-50 select-none">
              <Info className="w-4 h-4 shrink-0 text-blue-600" />
              Diagnóstico técnico (resumen API)
            </summary>
            <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3 text-xs leading-relaxed">
              <p className="text-slate-500">
                Después de que el admin <strong>apruebe</strong> un comprobante, actualice esta página (o espere el
                auto-actualizado). En la respuesta de{' '}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">/api/public/cliente-portal/resumen</code>:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>
                  <strong>venta_ids_encontrados</strong> debe incluir el UUID del préstamo al que aplicó el pago.
                </li>
                <li>
                  <strong>total_pagos_db</strong> debe <strong>subir</strong> respecto al valor anterior. Si no sube,
                  el flujo de aprobación no está insertando en la tabla <code className="rounded bg-slate-100 px-1">pagos</code>.
                </li>
              </ul>
              <dl className="grid gap-2 rounded-xl bg-slate-50 p-3 font-mono text-[11px]">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-400">total_pagos_db</dt>
                  <dd className="font-semibold text-slate-900 tabular-nums">
                    {data._debug.total_pagos_db ?? '—'}
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-400">venta_ids (cantidad)</dt>
                  <dd className="font-semibold text-slate-900 tabular-nums">
                    {data._debug.venta_ids_encontrados?.length ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 mb-1">venta_ids_encontrados</dt>
                  <dd className="break-all text-slate-700 whitespace-pre-wrap">
                    {(data._debug.venta_ids_encontrados || []).length
                      ? (data._debug.venta_ids_encontrados || []).join(', ')
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 mb-1">session_empresa_id / session_cliente_id</dt>
                  <dd className="break-all text-slate-700">
                    {(data._debug.session_empresa_id || '—') + ' / ' + (data._debug.session_cliente_id || '—')}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 mb-1">all_cliente_ids</dt>
                  <dd className="break-all text-slate-700 whitespace-pre-wrap">
                    {(data._debug.all_cliente_ids || []).length
                      ? (data._debug.all_cliente_ids || []).join(', ')
                      : '—'}
                  </dd>
                </div>
              </dl>
              <pre className="max-h-48 overflow-auto rounded-xl bg-slate-900 text-slate-100 p-3 text-[10px] leading-relaxed">
                {JSON.stringify(data._debug, null, 2)}
              </pre>
            </div>
          </details>
        )}
      </main>

      {/* Modal cambiar contraseña */}
      <Modal isOpen={modalClaveOpen} onClose={() => setModalClaveOpen(false)} title="Contraseña del portal" size="sm">
        <form onSubmit={onCambiarContrasena} className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            {data?.cliente?.tiene_contrasena_portal
              ? 'Ingresa tu contraseña actual del portal para continuar.'
              : 'Primera vez: ingresa los últimos 4 dígitos de tu teléfono o tu PIN como contraseña actual.'}
          </p>
          {[
            { label: 'Contraseña actual', val: claveActual, set: setClaveActual, ac: 'current-password' as const, min: undefined },
            { label: 'Nueva contraseña', val: claveNueva, set: setClaveNueva, ac: 'new-password' as const, min: 8 },
            { label: 'Confirmar nueva contraseña', val: claveConfirm, set: setClaveConfirm, ac: 'new-password' as const, min: 8 },
          ].map(({ label, val, set, ac, min }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">{label}</label>
              <input
                type="password"
                value={val}
                onChange={(e) => set(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                autoComplete={ac}
                required
                minLength={min}
              />
            </div>
          ))}
          {claveErr && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {claveErr}
            </div>
          )}
          {claveMsg && (
            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl px-4 py-3 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              {claveMsg}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setModalClaveOpen(false)}
              className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={claveGuardando}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              {claveGuardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-sm">{text}</p>
    </div>
  )
}
