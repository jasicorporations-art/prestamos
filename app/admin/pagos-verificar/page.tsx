'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/services/auth'
import { supabase } from '@/lib/supabase'
import {
  type EstadoPagoVerificacion,
  esPendientePagoVerificacion,
  normalizarEstadoPagoVerificacion,
} from '@/lib/estado-pago-verificacion'
import {
  persistPagosVerificarOverrides,
  readPagosVerificarOverrides,
  type OverrideEstado,
} from '@/lib/pagos-verificar-overrides'

type Item = {
  id: string
  prestamo_id: string
  monto: number
  foto_comprobante: string
  fecha_notificacion: string
  estado: EstadoPagoVerificacion
  motivo_rechazo?: string | null
  updated_at?: string | null
  clientes?:
    | { nombre_completo?: string; cedula?: string; celular?: string }
    | { nombre_completo?: string; cedula?: string; celular?: string }[]
  ventas?: { numero_prestamo?: string } | { numero_prestamo?: string }[]
}

type ComprobanteEstado = 'cargando' | 'listo' | 'error'

function emitPagosVerificarActualizado() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pagos-verificar-actualizado'))
  }
}

function mismoId(a: string, b: string) {
  return String(a).toLowerCase() === String(b).toLowerCase()
}

/**
 * El <img> con src a una API no envía Authorization (solo cookies). Si la sesión va por Bearer
 * (localStorage), el proxy devolvía 401 y la imagen no cargaba. Aquí se descarga con el mismo
 * token que usa el listado y se muestra con object URL.
 */
function ComprobanteImagenAdmin({
  notificacionId,
  fotoUrlDesdeApi,
}: {
  notificacionId: string
  fotoUrlDesdeApi: string
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [estado, setEstado] = useState<ComprobanteEstado>('cargando')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    let objectUrl: string | null = null

    async function cargar() {
      try {
        setEstado('cargando')
        setSrc(null)
        setErrorMsg(null)

        const session = await authService.getSession().catch(() => null)
        const headers: Record<string, string> = {}
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`
        }

        const apiUrl = `/api/admin/pagos-verificar/${encodeURIComponent(notificacionId)}/comprobante?_t=${Date.now()}`
        const res = await fetch(apiUrl, {
          method: 'GET',
          credentials: 'include',
          headers,
          cache: 'no-store',
        })

        if (cancelado) return

        if (res.ok) {
          const blob = await res.blob()
          if (cancelado) return
          objectUrl = URL.createObjectURL(blob)
          setSrc(objectUrl)
          setEstado('listo')
          return
        }

        // Capturar el mensaje de error del servidor para mostrarlo
        const errJson = await res.json().catch(() => null)
        const serverMsg = errJson?.error || `Error ${res.status}`
        if (!cancelado) setErrorMsg(serverMsg)

        // Fallback: usar la URL firmada que devolvió el listado
        const directa = String(fotoUrlDesdeApi || '').trim()
        if (/^https?:\/\//i.test(directa)) {
          setSrc(directa)
          setEstado('listo')
          return
        }

        if (!cancelado) setEstado('error')
      } catch (err) {
        if (!cancelado) {
          setErrorMsg(err instanceof Error ? err.message : 'Error de red')
          setEstado('error')
        }
      }
    }

    void cargar()

    return () => {
      cancelado = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [notificacionId, fotoUrlDesdeApi])

  const abrirAmpliada = async () => {
    try {
      const session = await authService.getSession().catch(() => null)
      const headers: Record<string, string> = {}
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }
      const apiUrl = `/api/admin/pagos-verificar/${encodeURIComponent(notificacionId)}/comprobante`
      const res = await fetch(apiUrl, {
        credentials: 'include',
        headers,
        cache: 'no-store',
      })
      if (res.ok) {
        const blob = await res.blob()
        const u = URL.createObjectURL(blob)
        window.open(u, '_blank', 'noopener,noreferrer')
        window.setTimeout(() => URL.revokeObjectURL(u), 120_000)
        return
      }
      const directa = String(fotoUrlDesdeApi || '').trim()
      if (/^https?:\/\//i.test(directa)) {
        window.open(directa, '_blank', 'noopener,noreferrer')
      }
    } catch {
      // Si el proxy falla, intentar la URL directa
      const directa = String(fotoUrlDesdeApi || '').trim()
      if (/^https?:\/\//i.test(directa)) {
        window.open(directa, '_blank', 'noopener,noreferrer')
      }
    }
  }

  if (estado === 'cargando' && !src) {
    return (
      <div className="mt-3 flex h-48 w-full max-w-sm items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
        Cargando comprobante…
      </div>
    )
  }

  if (estado === 'error' || !src) {
    const directa = String(fotoUrlDesdeApi || '').trim()
    return (
      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p className="font-medium">No se pudo cargar la vista previa.</p>
        {errorMsg && (
          <p className="mt-1 text-xs text-amber-800">Motivo: {errorMsg}</p>
        )}
        {/^https?:\/\//i.test(directa) && (
          <p className="mt-1">
            <a href={directa} target="_blank" rel="noreferrer" className="font-medium underline">
              Abrir enlace del archivo directamente
            </a>
          </p>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => void abrirAmpliada()}
      className="mt-3 block w-full max-w-sm cursor-zoom-in text-left"
      title="Clic para abrir en una pestaña nueva"
    >
      <img
        src={src}
        alt="Comprobante"
        className="h-48 w-full rounded-md border object-cover"
        referrerPolicy="no-referrer"
      />
      <span className="mt-1 block text-xs text-gray-500">Clic para ampliar</span>
    </button>
  )
}

export default function PagosVerificarPage() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [vista, setVista] = useState<'pendientes' | 'todos'>('pendientes')

  // Memoria + sessionStorage: el GET a veces devuelve Pendiente tras F5 si la fila en BD no quedó Verificado (revisar RPC/CHECK).
  const overridesRef = useRef<Map<string, OverrideEstado>>(new Map())

  async function fetchPagosVerificar(): Promise<Response> {
    const buildHeaders = async () => {
      const session = await authService.getSession().catch(() => null)
      const h: Record<string, string> = { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
      if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`
      return h
    }

    const bust = `_t=${Date.now()}`
    const url = `/api/admin/pagos-verificar?${bust}`
    let res = await fetch(url, { cache: 'no-store', credentials: 'include', headers: await buildHeaders() })

    // Si hay 401, refrescar sesión y reintentar una vez
    if (res.status === 401) {
      await supabase.auth.refreshSession().catch(() => null)
      res = await fetch(url, { cache: 'no-store', credentials: 'include', headers: await buildHeaders() })
    }

    return res
  }

  async function load(opts?: { silent?: boolean }) {
    const silent = !!opts?.silent

    if (!silent) {
      setLoading(true)
      setError(null)
    }

    const res = await fetchPagosVerificar().catch(() => null)
    const json = await res?.json().catch(() => ({})) ?? {}

    if (!res?.ok) {
      if (!silent) {
        setItems([])
        setError(json?.error || 'No se pudieron cargar los pagos por verificar')
      }
      if (!silent) setLoading(false)
      return
    }

    const raw = (json.items || []) as Item[]

    const normalized = raw.map((it) => {
      const id = String(it.id || '')
      const idKey = id.toLowerCase()
      const backendEstado = normalizarEstadoPagoVerificacion(it.estado)
      const override = overridesRef.current.get(idKey)

      // Si existe override local confirmado, no dejamos que el GET lo regrese a Pendiente
      if (override && backendEstado === 'Pendiente') {
        return {
          ...it,
          estado: override.estado,
          motivo_rechazo:
            override.motivo_rechazo !== undefined
              ? override.motivo_rechazo
              : it.motivo_rechazo ?? null,
        }
      }

      // Si backend ya viene alineado con override no hace falta seguir forzando
      if (override && backendEstado === override.estado) {
        overridesRef.current.delete(idKey)
      }

      return {
        ...it,
        estado: backendEstado,
        motivo_rechazo: it.motivo_rechazo ?? null,
      }
    })

    setItems(normalized)

    if (!silent) setLoading(false)
  }

  useEffect(() => {
    overridesRef.current = readPagosVerificarOverrides()
    void load()
  }, [])

  async function aprobar(id: string) {
    setSavingId(id)

    const session = await authService.getSession().catch(() => null)
    const headers: Record<string, string> = {}
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`

    const res = await fetch(`/api/admin/pagos-verificar/${id}/aprobar`, {
      method: 'POST',
      credentials: 'include',
      headers,
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      alert(json?.error || 'No se pudo aprobar')
      setSavingId(null)
      return
    }

    const estadoFinal = normalizarEstadoPagoVerificacion(json.estado ?? 'Verificado')
    const idKey = id.toLowerCase()

    overridesRef.current.set(idKey, {
      estado: estadoFinal,
      motivo_rechazo: null,
    })
    persistPagosVerificarOverrides(overridesRef.current)

    setItems((prev) =>
      prev.map((it) =>
        mismoId(it.id, id)
          ? { ...it, estado: estadoFinal, motivo_rechazo: null }
          : it
      )
    )

    emitPagosVerificarActualizado()

    // Si el RPC devolvió el id del pago creado, abrir el recibo
    if (json.pago_id) {
      router.push(`/pagos/${json.pago_id}/recibo?autoPrint=1`)
      setSavingId(null)
      return
    }

    setVista('todos')
    await load({ silent: true })
    setSavingId(null)
  }

  async function rechazar(id: string) {
    const motivo = prompt('Motivo de rechazo (ej: monto no coincide):')
    if (!motivo) return

    setSavingId(id)

    const session = await authService.getSession().catch(() => null)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`

    const res = await fetch(`/api/admin/pagos-verificar/${id}/rechazar`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ motivo }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      alert(json?.error || 'No se pudo rechazar')
      setSavingId(null)
      return
    }

    const estadoFinal = normalizarEstadoPagoVerificacion(json.estado ?? 'Rechazado')
    const idKey = id.toLowerCase()
    overridesRef.current.set(idKey, { estado: estadoFinal, motivo_rechazo: motivo })
    persistPagosVerificarOverrides(overridesRef.current)

    setItems((prev) =>
      prev.map((it) =>
        mismoId(it.id, id)
          ? { ...it, estado: estadoFinal, motivo_rechazo: motivo }
          : it
      )
    )

    emitPagosVerificarActualizado()
    setVista('todos')
    await load({ silent: true })
    setSavingId(null)
  }

  const pendientesCount = useMemo(
    () => items.filter((i) => esPendientePagoVerificacion(i.estado)).length,
    [items]
  )

  const itemsMostrados =
    vista === 'pendientes'
      ? items.filter((it) => esPendientePagoVerificacion(it.estado))
      : items

  const prestamoLabel = (it: Item) => {
    const v = Array.isArray(it.ventas) ? it.ventas[0] : it.ventas
    if (v?.numero_prestamo) return v.numero_prestamo
    const pid = it.prestamo_id
    if (pid && pid.length >= 8) return pid.slice(0, 8)
    return pid || '-'
  }

  const fmtFecha = (s: string) => {
    if (!s) return '-'
    try {
      return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(s))
    } catch { return s }
  }

  return (
    <main className="min-h-screen bg-gray-50/60 p-4 md:p-8">

      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Pagos por Verificar</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Revisa y aprueba los pagos notificados por los clientes
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm text-sm">
          <button
            type="button"
            onClick={() => setVista('pendientes')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 font-medium transition-all ${
              vista === 'pendientes'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Pendientes
            {pendientesCount > 0 && (
              <span className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                vista === 'pendientes' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {pendientesCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setVista('todos')}
            className={`rounded-lg px-4 py-2 font-medium transition-all ${
              vista === 'todos'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-40 rounded-full bg-gray-100" />
                  <div className="h-3 w-56 rounded-full bg-gray-100" />
                  <div className="h-3 w-32 rounded-full bg-gray-100" />
                </div>
                <div className="h-6 w-20 rounded-full bg-gray-100" />
              </div>
              <div className="mt-4 h-36 w-full rounded-xl bg-gray-100" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {itemsMostrados.map((it) => {
            const c = Array.isArray(it.clientes) ? it.clientes[0] : it.clientes
            const esPendiente = esPendientePagoVerificacion(it.estado)
            const procesando = savingId != null && mismoId(savingId, it.id)

            const estadoBadge = it.estado === 'Verificado'
              ? { label: 'Aprobado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-200/50' }
              : it.estado === 'Rechazado'
                ? { label: 'Rechazado', cls: 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-200/50' }
                : { label: 'Pendiente', cls: 'bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-200/50' }

            return (
              <div
                key={it.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
                  esPendiente ? 'border-amber-200/70' : 'border-gray-100'
                }`}
              >
                {/* Card accent bar */}
                {esPendiente && <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-400" />}
                {it.estado === 'Verificado' && <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-400" />}

                <div className="p-5">
                  {/* Header row */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-gray-900 truncate">
                          {c?.nombre_completo || 'Cliente'}
                        </p>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${estadoBadge.cls}`}>
                          {estadoBadge.label}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-500">
                        {c?.cedula && <span>Cédula: <span className="font-medium text-gray-700">{c.cedula}</span></span>}
                        {c?.celular && <span>Tel: <span className="font-medium text-gray-700">{c.celular}</span></span>}
                      </div>
                    </div>

                    {/* Monto */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        RD$ {Number(it.monto || 0).toLocaleString('es-DO')}
                      </p>
                      <p className="text-xs text-gray-400">{fmtFecha(it.fecha_notificacion)}</p>
                    </div>
                  </div>

                  {/* Préstamo */}
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
                    <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Préstamo <span className="font-semibold text-gray-800">#{prestamoLabel(it)}</span>
                  </div>

                  {/* Comprobante */}
                  {String(it.foto_comprobante || '').trim() ? (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Comprobante</p>
                      <ComprobanteImagenAdmin
                        notificacionId={it.id}
                        fotoUrlDesdeApi={it.foto_comprobante}
                      />
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      El cliente enviará el comprobante por WhatsApp
                    </div>
                  )}

                  {/* Acciones */}
                  {esPendiente && (
                    <div className="mt-4 flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => aprobar(it.id)}
                        disabled={procesando}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {procesando ? (
                          <><span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Procesando…</>
                        ) : (
                          <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Aprobar pago</>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => rechazar(it.id)}
                        disabled={procesando}
                        className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        Rechazar
                      </button>
                    </div>
                  )}

                  {/* Estado final */}
                  {it.estado === 'Verificado' && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
                      <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Pago registrado correctamente
                    </div>
                  )}
                  {it.estado === 'Rechazado' && it.motivo_rechazo && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span><span className="font-medium">Motivo:</span> {it.motivo_rechazo}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Estado vacío */}
          {itemsMostrados.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-700">
                {vista === 'pendientes' ? 'Todo al día' : 'Sin registros'}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {vista === 'pendientes'
                  ? 'No hay pagos pendientes por verificar.'
                  : 'No hay notificaciones de pago registradas.'}
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
