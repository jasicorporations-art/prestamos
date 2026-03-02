'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Building2,
  DollarSign,
  AlertTriangle,
  List,
  FileText,
  Activity,
  ArrowLeft,
  Power,
  PowerOff,
  RefreshCw,
  Eye,
  UserPlus,
  Shield,
  MessageCircle,
} from 'lucide-react'
import { Button } from '@/components/Button'
import { useCompania } from '@/lib/contexts/CompaniaContext'
import { supabase } from '@/lib/supabase'

interface Overview {
  empresasActivas: number
  cuentasActivas: number
  ingresosJasiCorp: number
  carteraTotalAdministrada: number
  erroresDia: number
}

interface Empresa {
  id: string
  nombre: string
  email: string
  status: string
  created_at?: string
}

interface LogEntry {
  id: string
  tenant_id: string | null
  user_id: string | null
  endpoint: string | null
  error_message: string | null
  correlation_id: string | null
  created_at: string
}

interface Cuenta {
  id: string
  email: string
  planType: string
  planNombre: string
  trialEndDate: string | null
  isLifetime: boolean
  suscripcionActiva: boolean
  empresa_id: string | null
  empresa_nombre: string
  rol: string
  perfilActivo: boolean
}

interface WhatsAppConsumoFila {
  empresa_id: string
  empresa_nombre: string
  mensajes_enviados: number
  saldo_restante: number
  ganancia_fija: number
}

export default function SuperAdminPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { startImpersonation } = useCompania()
  const empresaIdImpersonate = searchParams.get('empresa_id')
  const [overview, setOverview] = useState<Overview>({
    empresasActivas: 0,
    cuentasActivas: 0,
    ingresosJasiCorp: 0,
    carteraTotalAdministrada: 0,
    erroresDia: 0,
  })
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [latency, setLatency] = useState<{ ms: number; status: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [logsDesde, setLogsDesde] = useState('')
  const [logsHasta, setLogsHasta] = useState('')
  const [logsTenant, setLogsTenant] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [superAdminEmail, setSuperAdminEmail] = useState('')
  const [agregandoSuperAdmin, setAgregandoSuperAdmin] = useState(false)
  const [mensajeSuperAdmin, setMensajeSuperAdmin] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [whatsappConsumo, setWhatsappConsumo] = useState<{
    periodo: string
    filas: WhatsAppConsumoFila[]
    limite_mensual: number
    costo_por_mensaje: number
  } | null>(null)

  const defaultOverview: Overview = {
    empresasActivas: 0,
    cuentasActivas: 0,
    ingresosJasiCorp: 0,
    carteraTotalAdministrada: 0,
    erroresDia: 0,
  }

  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [])

  const fetchOverview = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const url = empresaIdImpersonate
        ? `/api/super-admin/overview?empresa_id=${encodeURIComponent(empresaIdImpersonate)}`
        : '/api/super-admin/overview'
      const res = await fetch(url, {
        credentials: 'include',
        headers,
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data && !data.error) {
        setOverview({
          empresasActivas: data.empresasActivas ?? 0,
          cuentasActivas: data.cuentasActivas ?? 0,
          ingresosJasiCorp: data.ingresosJasiCorp ?? 0,
          carteraTotalAdministrada: data.carteraTotalAdministrada ?? 0,
          erroresDia: data.erroresDia ?? 0,
        })
      } else {
        setOverview(defaultOverview)
        if (!res.ok) console.warn('[super-admin] Overview API:', res.status, data?.error || data)
      }
    } catch (e) {
      console.error(e)
      setOverview(defaultOverview)
    }
  }, [empresaIdImpersonate, getAuthHeaders])

  const fetchEmpresas = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/super-admin/empresas', { credentials: 'include', headers })
      if (res.ok) {
        const data = await res.json()
        setEmpresas(data.empresas || [])
      }
    } catch (e) {
      console.error(e)
    }
  }, [getAuthHeaders])

  const fetchLogs = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const params = new URLSearchParams()
      if (logsDesde) params.set('desde', logsDesde)
      if (logsHasta) params.set('hasta', logsHasta)
      if (logsTenant) params.set('tenant_id', logsTenant)
      const res = await fetch(`/api/super-admin/logs?${params}`, { credentials: 'include', headers })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch (e) {
      console.error(e)
    }
  }, [logsDesde, logsHasta, logsTenant, getAuthHeaders])

  const fetchLatency = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const start = Date.now()
      const res = await fetch('/api/super-admin/latency', { credentials: 'include', headers })
      const data = await res.json()
      if (res.ok && data.ms >= 0) setLatency({ ms: data.ms, status: data.status })
      else setLatency({ ms: -1, status: 'red' })
    } catch (e) {
      setLatency({ ms: -1, status: 'red' })
    }
  }, [getAuthHeaders])

  const fetchCuentas = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/super-admin/cuentas', { credentials: 'include', headers })
      if (res.ok) {
        const data = await res.json()
        setCuentas(data.cuentas || [])
      }
    } catch (e) {
      console.error(e)
    }
  }, [getAuthHeaders])

  const fetchWhatsappConsumo = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/super-admin/whatsapp-consumo', { credentials: 'include', headers })
      if (res.ok) {
        const data = await res.json()
        const filas: WhatsAppConsumoFila[] = (data.filas || []).map((f: {
          empresa_id: string
          empresa_nombre: string
          creditos_consumidos: number
          costo_twilio_usd: number
          ganancia_fija: number
        }) => ({
          empresa_id: f.empresa_id,
          empresa_nombre: f.empresa_nombre,
          mensajes_enviados: f.creditos_consumidos ?? 0,
          saldo_restante: Math.max(0, 15 - (f.costo_twilio_usd ?? 0)),
          ganancia_fija: f.ganancia_fija ?? 15,
        }))
        setWhatsappConsumo({
          periodo: data.periodo || '',
          filas,
          limite_mensual: data.creditos_base ?? 750,
          costo_por_mensaje: data.costo_twilio_por_mensaje ?? 0.025,
        })
      }
    } catch (e) {
      console.error(e)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    let ok = true
    const run = async () => {
      setLoading(true)
      await Promise.all([
        fetchOverview(),
        fetchEmpresas(),
        fetchCuentas(),
        fetchLogs(),
        fetchLatency(),
        fetchWhatsappConsumo(),
      ])
      if (ok) setLoading(false)
    }
    run()
    return () => { ok = false }
  }, [fetchOverview, fetchEmpresas, fetchCuentas, fetchLogs, fetchLatency, fetchWhatsappConsumo])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const toggleTenant = async (id: string, currentStatus: string) => {
    setTogglingId(id)
    try {
      const authHeaders = await getAuthHeaders()
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      const res = await fetch('/api/super-admin/empresas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ id, status: newStatus }),
        credentials: 'include',
      })
      if (res.ok) {
        await fetchEmpresas()
        await fetchOverview()
      }
    } finally {
      setTogglingId(null)
    }
  }

  const agregarSuperAdmin = async (email: string) => {
    if (!email.trim()) return
    setAgregandoSuperAdmin(true)
    setMensajeSuperAdmin(null)
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/super-admin/agregar-super-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ email: email.trim() }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setMensajeSuperAdmin({ tipo: 'ok', texto: data.mensaje || 'Super Admin asignado correctamente' })
        setSuperAdminEmail('')
        await fetchCuentas()
      } else {
        setMensajeSuperAdmin({ tipo: 'error', texto: data.error || 'Error al asignar Super Admin' })
      }
    } catch (e: any) {
      setMensajeSuperAdmin({ tipo: 'error', texto: (e as Error)?.message || 'Error de conexión' })
    } finally {
      setAgregandoSuperAdmin(false)
    }
  }

  const refreshAll = () => {
    setLoading(true)
    Promise.all([
      fetchOverview(),
      fetchEmpresas(),
      fetchCuentas(),
      fetchLogs(),
      fetchLatency(),
      fetchWhatsappConsumo(),
    ]).finally(() => setLoading(false))
  }

  if (loading && !overview) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Cargando Centro de Comando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={() => router.push('/dashboard')}
              className="bg-gray-800 text-gray-200 hover:bg-gray-700 border-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
            <span className="text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
              Super Usuario
            </span>
          </div>
          <h1 className="text-xl font-bold text-white">Centro de Comando JasiCorp</h1>
          <button
            onClick={refreshAll}
            disabled={loading}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50"
            title="Actualizar todo"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Overview */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Panel de control</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 text-gray-400 mb-2">
                <Building2 className="w-5 h-5" />
                <span>Empresas activas</span>
              </div>
              <p className="text-3xl font-bold text-white">{overview.empresasActivas}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 text-gray-400 mb-2">
                <UserPlus className="w-5 h-5" />
                <span>Cuentas activas</span>
              </div>
              <p className="text-3xl font-bold text-white">{overview.cuentasActivas}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 text-gray-400 mb-2">
                <DollarSign className="w-5 h-5" />
                <span>Mis Ganancias (SaaS)</span>
              </div>
              <p className="text-3xl font-bold text-emerald-400">
                ${overview.ingresosJasiCorp.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 text-gray-400 mb-2">
                <List className="w-5 h-5" />
                <span>Cartera Total Administrada</span>
              </div>
              <p className="text-3xl font-bold text-blue-400">
                ${overview.carteraTotalAdministrada.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 text-gray-400 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Errores / 24h</span>
              </div>
              <p className="text-3xl font-bold text-red-400">{overview.erroresDia}</p>
            </div>
          </div>
        </section>

        {/* WhatsApp Cupo por Empresa */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            Cupo WhatsApp ($30/mes, 750 msgs, $0.025/msg)
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Empresas con WhatsApp Premium. Saldo de $15 para mensajes. Ganancia fija $15 por empresa.
          </p>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-gray-400 font-medium">Empresa</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Mensajes Enviados</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Saldo Restante (de $15)</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Mi Ganancia Fija</th>
                  </tr>
                </thead>
                <tbody>
                  {(whatsappConsumo?.filas || []).map((f) => (
                    <tr key={f.empresa_id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-white">{f.empresa_nombre}</td>
                      <td className="px-4 py-3 text-gray-300">{f.mensajes_enviados}</td>
                      <td className="px-4 py-3 text-emerald-400">${f.saldo_restante.toFixed(2)}</td>
                      <td className="px-4 py-3 text-amber-400">${f.ganancia_fija}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(!whatsappConsumo?.filas || whatsappConsumo.filas.length === 0) && (
              <div className="px-4 py-8 text-center text-gray-500">
                No hay empresas con WhatsApp Premium o sin consumo este mes.
              </div>
            )}
          </div>
        </section>

        {/* Latencia API */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Monitor de salud (API Supabase)</h2>
          <div className="flex items-center gap-4">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${
                latency?.status === 'green'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : latency?.status === 'yellow'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-red-500/20 border-red-500/50 text-red-400'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>
                {latency != null && latency.ms >= 0 ? `${latency.ms} ms` : 'Error'}
              </span>
            </div>
            {latency != null && latency.ms > 500 && (
              <span className="text-amber-400 font-medium px-3 py-1 rounded bg-amber-500/20 border border-amber-500/50">
                Latencia Alta
              </span>
            )}
            <button
              onClick={fetchLatency}
              className="text-sm text-gray-400 hover:text-white"
            >
              Medir de nuevo
            </button>
          </div>
        </section>

        {/* Gestión de tenants */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Gestión de tenants (modo mantenimiento)</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-gray-400 font-medium">Empresa</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Email</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Estado</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {empresas.map((e) => (
                    <tr key={e.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-white">{e.nombre}</td>
                      <td className="px-4 py-3 text-gray-400">{e.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            e.status === 'active'
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                          }
                        >
                          {e.status === 'active' ? 'Activa' : 'Mantenimiento'}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => {
                            startImpersonation(e.nombre, e.nombre)
                            router.push('/dashboard')
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40"
                          title="Ver como esta empresa"
                        >
                          <Eye className="w-4 h-4" />
                          Impersonar
                        </button>
                        <button
                          onClick={() => toggleTenant(e.id, e.status)}
                          disabled={togglingId === e.id}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
                            e.status === 'active'
                              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40'
                          }`}
                        >
                          {e.status === 'active' ? (
                            <>
                              <PowerOff className="w-4 h-4" />
                              Desactivar tenant
                            </>
                          ) : (
                            <>
                              <Power className="w-4 h-4" />
                              Activar tenant
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {empresas.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">No hay empresas registradas.</div>
            )}
          </div>
        </section>

        {/* Cuentas activas y planes */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Cuentas activas y planes</h2>
          <p className="text-sm text-gray-500 mb-4">
            Usuarios registrados, empresa asignada y plan de suscripción de cada uno.
          </p>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-gray-400 font-medium">Email</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Empresa</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Plan</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Rol</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Suscripción</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Perfil</th>
                  </tr>
                </thead>
                <tbody>
                  {cuentas.map((c) => (
                    <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-2 text-white">{c.email}</td>
                      <td className="px-4 py-2 text-gray-400">{c.empresa_nombre || '-'}</td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            c.planType === 'INFINITO'
                              ? 'text-amber-400'
                              : c.planType === 'TRIAL'
                                ? 'text-blue-400'
                                : 'text-gray-300'
                          }
                        >
                          {c.planNombre}
                          {c.trialEndDate && (
                            <span className="text-gray-500 text-xs ml-1">
                              (hasta {new Date(c.trialEndDate).toLocaleDateString()})
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-400">{c.rol}</td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            c.suscripcionActiva ? 'text-emerald-400' : 'text-red-400'
                          }
                        >
                          {c.suscripcionActiva ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            c.perfilActivo ? 'text-emerald-400' : 'text-amber-400'
                          }
                        >
                          {c.perfilActivo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cuentas.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">No hay cuentas o no se pudieron cargar.</div>
            )}
          </div>
        </section>

        {/* Promover a Super Admin */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            Promover a Super Admin
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Asigna el rol Super Administrador a un usuario existente. El usuario debe estar registrado en auth.users.
          </p>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-gray-400 mb-1">Email del usuario</label>
                <input
                  type="email"
                  value={superAdminEmail}
                  onChange={(e) => setSuperAdminEmail(e.target.value)}
                  placeholder="admin@jasicorporations.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50"
                  onKeyDown={(e) => e.key === 'Enter' && agregarSuperAdmin(superAdminEmail)}
                />
              </div>
              <button
                onClick={() => agregarSuperAdmin(superAdminEmail)}
                disabled={agregandoSuperAdmin || !superAdminEmail.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="w-4 h-4" />
                {agregandoSuperAdmin ? 'Asignando...' : 'Asignar Super Admin'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs text-gray-500">Acceso rápido:</span>
              {['admin@jasicorporations.com', 'johnrijo6@gmail.com'].map((em) => (
                <button
                  key={em}
                  onClick={() => agregarSuperAdmin(em)}
                  disabled={agregandoSuperAdmin}
                  className="text-xs px-2 py-1 rounded bg-gray-800 text-amber-400/90 hover:bg-amber-500/20 border border-amber-500/30 disabled:opacity-50"
                >
                  {em}
                </button>
              ))}
            </div>
            {mensajeSuperAdmin && (
              <p
                className={`mt-3 text-sm ${
                  mensajeSuperAdmin.tipo === 'ok' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {mensajeSuperAdmin.texto}
              </p>
            )}
          </div>
        </section>

        {/* Logs */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Sistema de logs</h2>
          <div className="flex flex-wrap gap-4 mb-4">
            <input
              type="datetime-local"
              value={logsDesde}
              onChange={(e) => setLogsDesde(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
            />
            <input
              type="datetime-local"
              value={logsHasta}
              onChange={(e) => setLogsHasta(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
            />
            <select
              value={logsTenant}
              onChange={(e) => setLogsTenant(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
            >
              <option value="">Todas las empresas</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-200"
            >
              Filtrar
            </button>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-900">
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-2 text-gray-400 font-medium">Fecha</th>
                    <th className="px-4 py-2 text-gray-400 font-medium">Tenant</th>
                    <th className="px-4 py-2 text-gray-400 font-medium">Endpoint</th>
                    <th className="px-4 py-2 text-gray-400 font-medium">Error</th>
                    <th className="px-4 py-2 text-gray-400 font-medium">Correlation ID</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                        {l.created_at ? new Date(l.created_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-2 text-gray-400">{l.tenant_id ?? '-'}</td>
                      <td className="px-4 py-2 text-gray-300 truncate max-w-[200px]">{l.endpoint ?? '-'}</td>
                      <td className="px-4 py-2 text-red-400 truncate max-w-[280px]" title={l.error_message ?? ''}>
                        {l.error_message ?? '-'}
                      </td>
                      <td className="px-4 py-2 text-amber-400 font-mono text-xs">{l.correlation_id ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logs.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">No hay logs en el período seleccionado.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
