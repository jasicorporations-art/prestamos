'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ClipboardList,
  RefreshCw,
  Shield,
  FileJson,
} from 'lucide-react'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { fetchSuperAdmin } from '@/lib/utils/fetchSuperAdmin'
import { perfilesService } from '@/lib/services/perfiles'

interface EmpresaOpt {
  id: string
  nombre: string
}

interface CuentaOpt {
  id: string
  email: string
  empresa_nombre: string
  rol: string
}

export interface MovimientoAuditoria {
  id: string
  empresa_id?: string | null
  empresa_nombre?: string | null
  usuario_id?: string | null
  usuario_etiqueta?: string | null
  usuario_nombre?: string | null
  tipo_accion?: string | null
  entidad_tipo?: string | null
  entidad_id?: string | null
  fecha_hora?: string
  old_data?: Record<string, unknown> | null
  new_data?: Record<string, unknown> | null
  detalle?: string | null
  accion?: string | null
  sucursal_nombre?: string | null
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function SuperAdminAuditoriaPage() {
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)
  const [accesoOk, setAccesoOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fuente, setFuente] = useState<string>('')
  const [movimientos, setMovimientos] = useState<MovimientoAuditoria[]>([])
  const [error, setError] = useState<string | null>(null)

  const [empresas, setEmpresas] = useState<EmpresaOpt[]>([])
  const [cuentas, setCuentas] = useState<CuentaOpt[]>([])

  const [empresaId, setEmpresaId] = useState('')
  const [usuarioId, setUsuarioId] = useState('')
  const [categoria, setCategoria] = useState<'todas' | 'eliminaciones' | 'cobros'>('todas')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [buscarId, setBuscarId] = useState('')
  const [limit, setLimit] = useState(150)

  const [modalMov, setModalMov] = useState<MovimientoAuditoria | null>(null)

  const verificarSuperAdmin = useCallback(async () => {
    try {
      const es = await perfilesService.isSuperAdmin()
      if (!es) {
        router.replace('/dashboard')
        return
      }
      const res = await fetchSuperAdmin('/api/super-admin/auditoria-global?limit=1')
      if (res.status === 401 || res.status === 403) {
        router.replace('/dashboard')
        return
      }
      setAccesoOk(true)
    } catch {
      router.replace('/dashboard')
    } finally {
      setVerificando(false)
    }
  }, [router])

  useEffect(() => {
    verificarSuperAdmin()
  }, [verificarSuperAdmin])

  const cargarMeta = useCallback(async () => {
    try {
      const [re, rc] = await Promise.all([
        fetchSuperAdmin('/api/super-admin/empresas'),
        fetchSuperAdmin('/api/super-admin/cuentas'),
      ])
      if (re.ok) {
        const je = await re.json()
        setEmpresas(je.empresas || [])
      }
      if (rc.ok) {
        const jc = await rc.json()
        setCuentas(jc.cuentas || [])
      }
    } catch (e) {
      console.warn('Meta auditoría:', e)
    }
  }, [])

  useEffect(() => {
    if (accesoOk) cargarMeta()
  }, [accesoOk, cargarMeta])

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      if (buscarId.trim()) {
        params.set('buscar_id', buscarId.trim())
      } else {
        if (empresaId) params.set('empresa_id', empresaId)
        if (usuarioId) params.set('usuario_id', usuarioId)
        if (categoria !== 'todas') params.set('categoria', categoria)
        if (fechaDesde) params.set('fecha_desde', fechaDesde)
        if (fechaHasta) params.set('fecha_hasta', fechaHasta)
      }

      const res = await fetchSuperAdmin(`/api/super-admin/auditoria-global?${params.toString()}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { error?: string }).error || `Error ${res.status}`)
        setMovimientos([])
        return
      }
      setFuente(String((data as { fuente?: string }).fuente || ''))
      setMovimientos((data as { movimientos?: MovimientoAuditoria[] }).movimientos || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error de red')
      setMovimientos([])
    } finally {
      setLoading(false)
    }
  }, [limit, empresaId, usuarioId, categoria, fechaDesde, fechaHasta, buscarId])

  useEffect(() => {
    if (!accesoOk) return
    cargarDatos()
    // Solo carga inicial; el resto con «Actualizar»
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accesoOk])

  if (verificando || !accesoOk) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">{verificando ? 'Verificando acceso…' : 'Redirigiendo…'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-800 mb-1">
            <Shield className="w-6 h-6" />
            <span className="text-sm font-semibold uppercase tracking-wide">Solo super_admin</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-amber-600" />
            Auditoría global
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Movimientos registrados por triggers en BD (vista <code className="bg-gray-100 px-1 rounded">historial_movimientos</code> /{' '}
            <code className="bg-gray-100 px-1">actividad_logs.tipo_accion</code>). Service Role tras validar tu rol.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push('/super-admin')}>
            <ArrowLeft className="w-4 h-4 mr-2 inline" />
            Centro de comando
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Búsqueda por ID (cliente o préstamo / venta)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Pegar UUID — traer toda la historia relacionada"
                value={buscarId}
                onChange={(e) => setBuscarId(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
              />
            </div>
            {buscarId.trim() ? (
              <p className="text-xs text-amber-700 mt-1">
                Activo: se usan solo este ID y el rango de fechas (si lo indicas). Empresa / usuario / tipo se omiten.
              </p>
            ) : null}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Empresa (tenant)</label>
            <select
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              disabled={!!buscarId.trim()}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">Todas</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Usuario (modificador)</label>
            <select
              value={usuarioId}
              onChange={(e) => setUsuarioId(e.target.value)}
              disabled={!!buscarId.trim()}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm max-w-full disabled:opacity-50"
            >
              <option value="">Todos</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c.email || c.id).slice(0, 36)} — {c.empresa_nombre} ({c.rol})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de acción</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as typeof categoria)}
              disabled={!!buscarId.trim()}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="todas">Todas (BD)</option>
              <option value="eliminaciones">Solo eliminaciones (DELETE)</option>
              <option value="cobros">Solo cobros (pagos INSERT/UPDATE)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Límite</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value={100}>100</option>
              <option value={150}>150</option>
              <option value={300}>300</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button onClick={cargarDatos} disabled={loading} className="inline-flex items-center">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setEmpresaId('')
                setUsuarioId('')
                setCategoria('todas')
                setFechaDesde('')
                setFechaHasta('')
                setBuscarId('')
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
        {fuente ? <p className="text-xs text-gray-500">{fuente}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tabla</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Registro</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movimientos.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    Sin movimientos con los filtros actuales (o aún no hay triggers / columnas de auditoría en la BD).
                  </td>
                </tr>
              ) : (
                movimientos.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-800">{formatDateTime(m.fecha_hora)}</td>
                    <td className="px-3 py-2 text-gray-700 max-w-[140px] truncate" title={m.empresa_nombre || ''}>
                      {m.empresa_nombre || m.empresa_id?.slice(0, 8) || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-700 max-w-[160px] truncate" title={m.usuario_etiqueta || ''}>
                      {m.usuario_etiqueta || '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{m.entidad_tipo || '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                          m.tipo_accion === 'DELETE'
                            ? 'bg-red-100 text-red-800'
                            : m.tipo_accion === 'INSERT'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {m.tipo_accion || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs break-all max-w-[120px]">{m.entidad_id?.slice(0, 13)}…</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setModalMov(m)}
                        className="inline-flex items-center text-primary-600 hover:text-primary-800 font-medium text-xs"
                      >
                        <FileJson className="w-3.5 h-3.5 mr-1" />
                        Ver cambios
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {loading ? (
          <div className="py-4 text-center text-gray-500 text-sm">Cargando…</div>
        ) : (
          <div className="px-4 py-2 text-xs text-gray-500 border-t">{movimientos.length} movimiento(s)</div>
        )}
      </div>

      <Modal
        isOpen={!!modalMov}
        onClose={() => setModalMov(null)}
        title={modalMov ? `Auditoría — ${modalMov.entidad_tipo} / ${modalMov.tipo_accion}` : 'Detalle'}
        size="xl"
      >
        {modalMov ? (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto">
            <p className="text-xs text-gray-500">
              <strong>ID log:</strong> <span className="font-mono">{modalMov.id}</span> ·{' '}
              <strong>Registro afectado:</strong> <span className="font-mono">{modalMov.entidad_id}</span>
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Valor anterior (OLD_DATA)
                </h4>
                <pre className="text-[11px] leading-relaxed p-3 rounded-lg border-2 border-red-200 bg-red-50 text-red-950 max-h-80 overflow-auto whitespace-pre-wrap break-all">
                  {modalMov.old_data != null
                    ? JSON.stringify(modalMov.old_data, null, 2)
                    : '— (INSERT: no había fila previa)'}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Valor nuevo (NEW_DATA)
                </h4>
                <pre className="text-[11px] leading-relaxed p-3 rounded-lg border-2 border-green-200 bg-green-50 text-green-950 max-h-80 overflow-auto whitespace-pre-wrap break-all">
                  {modalMov.new_data != null
                    ? JSON.stringify(modalMov.new_data, null, 2)
                    : '— (DELETE: fila eliminada)'}
                </pre>
              </div>
            </div>
            {modalMov.detalle ? (
              <p className="text-xs text-gray-600">
                <strong>Nota:</strong> {modalMov.detalle}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
