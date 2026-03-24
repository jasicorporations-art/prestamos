'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Download, Upload, AlertTriangle, Shield, Cloud, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/Button'
import Link from 'next/link'
import { subscriptionService } from '@/lib/services/subscription'
import { getSupabaseClient } from '@/lib/supabase'

type SavedBackup = { id: string; tipo: string; created_at: string }

const BRONCE_BACKUP_INTERVAL_DAYS = 30

/** Headers con el token de sesión para que las API de backup autentiquen (sesión en localStorage). */
async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = getSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (session?.access_token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${session.access_token}`
  }
  return headers
}

export default function BackupPage() {
  const [exporting, setExporting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [backupFile, setBackupFile] = useState<{ backup: unknown; fileName: string } | null>(null)
  const [restoreFromId, setRestoreFromId] = useState<string | null>(null)
  const [companyNameConfirm, setCompanyNameConfirm] = useState('')
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreSuccess, setRestoreSuccess] = useState(false)
  const [savedBackups, setSavedBackups] = useState<SavedBackup[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'warning'; text: string } | null>(null)
  const [canExport, setCanExport] = useState(true)
  const [nextBackupAvailable, setNextBackupAvailable] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const latestRequestIdRef = useRef(0)

  const sortByCreatedAtDesc = (a: SavedBackup, b: SavedBackup) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()

  const loadSavedBackups = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current
    setLoadingList(true)
    setListError(null)
    const timestamp = Date.now()
    try {
      const headers = await getAuthHeaders()
      const url = `/api/backup/list?_=${timestamp}`
      const res = await fetch(url, {
        credentials: 'include',
        headers,
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (latestRequestIdRef.current !== requestId) {
        // Respuesta obsoleta: ignorar
        return
      }
      if (res.ok) {
        const list = Array.isArray(data.backups) ? (data.backups as SavedBackup[]) : []
        const sorted = [...list].sort(sortByCreatedAtDesc)
        setSavedBackups(sorted)
        setListError(typeof data.error === 'string' ? data.error : null)
      } else {
        // Mantener la lista previa si ya había datos y solo mostrar el error
        setListError(data.error || res.statusText || 'Error al cargar la lista')
      }
    } catch (e) {
      if (latestRequestIdRef.current !== requestId) return
      setListError(e instanceof Error ? e.message : 'Error al cargar la lista')
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setLoadingList(false)
      }
    }
  }, [])

  useEffect(() => {
    loadSavedBackups()
  }, [loadSavedBackups])

  useEffect(() => {
    const onFocus = () => loadSavedBackups()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadSavedBackups])

  useEffect(() => {
    async function checkExportLimit() {
      const planType = await subscriptionService.getCurrentPlan()
      if (planType !== 'BRONCE') {
        setCanExport(true)
        setNextBackupAvailable(null)
        return
      }
      const lastManual = savedBackups.find((b) => b.tipo === 'manual')
      if (!lastManual) {
        setCanExport(true)
        setNextBackupAvailable(null)
        return
      }
      const lastDate = new Date(lastManual.created_at)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays >= BRONCE_BACKUP_INTERVAL_DAYS) {
        setCanExport(true)
        setNextBackupAvailable(null)
      } else {
        setCanExport(false)
        const nextDate = new Date(lastDate)
        nextDate.setDate(nextDate.getDate() + BRONCE_BACKUP_INTERVAL_DAYS)
        setNextBackupAvailable(nextDate.toLocaleDateString('es-DO'))
      }
    }
    checkExportLimit()
  }, [savedBackups])

  const handleExport = async () => {
    setExporting(true)
    setRestoreError(null)
    setExportMessage(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/backup/export', { credentials: 'include', headers })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || res.statusText)
      }
      const data = await res.json()
      const backup = data
      const savedToCloud = data.savedToCloud === true
      const cloudBackupId = typeof data.cloudBackupId === 'string' ? data.cloudBackupId : null
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${backup.tenantId}-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      if (savedToCloud) {
        setExportMessage({
          type: 'success',
          text: 'Backup descargado y guardado en la nube. Ya aparece abajo para restaurar desde cualquier dispositivo.',
        })
        if (cloudBackupId) {
          const createdAt = backup.exportDate || new Date().toISOString()
          const newEntry: SavedBackup = { id: cloudBackupId, tipo: 'manual', created_at: createdAt }
          setSavedBackups((prev) => {
            const merged = [newEntry, ...prev]
            const seen = new Set<string>()
            const deduped = merged.filter((b) => {
              if (seen.has(b.id)) return false
              seen.add(b.id)
              return true
            })
            return deduped.sort(sortByCreatedAtDesc)
          })
        } else {
          // Si por alguna razón no vino el ID, refrescar desde el servidor
          loadSavedBackups()
        }
      } else {
        const detalle = data.saveError ? ` Detalle: ${data.saveError}` : ''
        setExportMessage({
          type: 'warning',
          text: `Backup descargado en este equipo. No se pudo guardar en la nube. Ejecuta en Supabase el script crear-tabla-tenant-backups.sql.${detalle}`,
        })
      }
    } catch (e) {
      setRestoreError(e instanceof Error ? e.message : 'Error al exportar')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteBackup = async (id: string) => {
    if (!confirm('¿Eliminar este backup de la nube? No se puede deshacer.')) return
    setDeletingId(id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/backup/${id}`, { method: 'DELETE', credentials: 'include', headers })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || res.statusText)
      setSavedBackups((prev) => prev.filter((b) => b.id !== id))
    } catch (e) {
      setRestoreError(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownloadSaved = async (id: string) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/backup/${id}?_=${Date.now()}`, { credentials: 'include', headers, cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 404) {
          setSavedBackups((prev) => prev.filter((b) => b.id !== id))
          setRestoreError('Backup no encontrado o ya fue eliminado. Lista actualizada.')
        } else {
          setRestoreError((data.error as string) || 'No se pudo descargar')
        }
        return
      }
      const backup = data
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${backup.tenantId}-${new Date(backup.exportDate || Date.now()).toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setRestoreError(e instanceof Error ? e.message : 'Error al descargar')
    }
  }

  const handleRestoreSaved = (id: string) => {
    setRestoreFromId(id)
    setBackupFile(null)
    setModalOpen(true)
    setCompanyNameConfirm('')
    setRestoreError(null)
    setRestoreSuccess(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setRestoreFromId(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const backup = JSON.parse(reader.result as string)
        const hasTables =
          backup?.tables != null ||
          (backup?.backup_data != null && typeof backup.backup_data === 'object' && backup.backup_data.tables != null)
        if (!hasTables) throw new Error('Archivo no es un backup válido')
        setBackupFile({ backup, fileName: file.name })
        setModalOpen(true)
        setCompanyNameConfirm('')
        setRestoreError(null)
        setRestoreSuccess(false)
      } catch {
        setRestoreError('El archivo no es un backup válido (JSON con objeto tables).')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleRestoreConfirm = async () => {
    if (!backupFile && !restoreFromId) return
    setRestoring(true)
    setRestoreError(null)
    try {
      const body: { backup?: unknown; backupId?: string; companyNameConfirm: string } = {
        companyNameConfirm: companyNameConfirm.trim(),
      }
      if (restoreFromId) body.backupId = restoreFromId
      else if (backupFile) body.backup = backupFile.backup

      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 404 && restoreFromId) {
          setSavedBackups((prev) => prev.filter((b) => b.id !== restoreFromId))
        }
        throw new Error(data.error || 'Error al restaurar')
      }
      setRestoreSuccess(true)
      if (data.preRestoreBackup) {
        const blob = new Blob([JSON.stringify(data.preRestoreBackup, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `backup-pre-restauracion-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
      loadSavedBackups()
      setTimeout(() => {
        setModalOpen(false)
        setBackupFile(null)
        setRestoreFromId(null)
        setCompanyNameConfirm('')
        setRestoreSuccess(false)
      }, 2500)
    } catch (e) {
      setRestoreError(e instanceof Error ? e.message : 'Error al restaurar')
    } finally {
      setRestoring(false)
    }
  }

  const handleCloseModal = () => {
    if (!restoring) {
      setModalOpen(false)
      setBackupFile(null)
      setRestoreFromId(null)
      setCompanyNameConfirm('')
      setRestoreError(null)
    }
  }

  const canRestore = !!backupFile || !!restoreFromId

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin" className="text-primary-600 hover:underline text-sm">
          ← Volver al panel Admin
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Backup y restauración</h1>
      <p className="text-gray-600 mb-8">
        Exporte sus datos de forma segura o restaure desde un backup anterior. La restauración genera siempre un backup preventivo del estado actual.
      </p>

      <div className="space-y-6">
        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-6 h-6 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Exportar backup</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Descarga un archivo JSON y lo guarda en la nube. Podrás restaurarlo desde cualquier dispositivo donde inicies sesión.
          </p>
          {!canExport && nextBackupAvailable && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              Plan Bronce: solo puedes realizar un backup cada 30 días. Próximo disponible: <strong>{nextBackupAvailable}</strong>
            </p>
          )}
          <Button onClick={handleExport} disabled={exporting || !canExport}>
            {exporting ? 'Exportando…' : 'Descargar y guardar en la nube'}
          </Button>
          {exportMessage && (
            <p className={`mt-3 text-sm ${exportMessage.type === 'success' ? 'text-green-700 bg-green-50' : 'text-amber-800 bg-amber-50'} border rounded-lg p-3 ${exportMessage.type === 'success' ? 'border-green-200' : 'border-amber-200'}`}>
              {exportMessage.type === 'success' && <Cloud className="w-4 h-4 inline mr-1 align-middle" />}
              {exportMessage.text}
            </p>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Cloud className="w-6 h-6 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Backups guardados en la nube</h2>
            <Button variant="secondary" className="ml-auto text-sm py-1" onClick={loadSavedBackups} disabled={loadingList}>
              <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Restaura o descarga desde cualquier lugar. Solo ves los backups de tu empresa (los más recientes primero).
          </p>
          {listError && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {listError}
            </p>
          )}
          {(loadingList && savedBackups.length === 0) ? (
            <div className="space-y-2 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-100">
                  <div className="h-4 w-40 bg-gray-200 rounded" />
                  <div className="h-5 w-24 bg-gray-100 rounded-full" />
                  <div className="ml-auto flex gap-2">
                    <div className="h-8 w-20 bg-gray-100 rounded-lg" />
                    <div className="h-8 w-20 bg-gray-100 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : savedBackups.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no hay backups guardados. Haz uno con &quot;Descargar y guardar en la nube&quot;.</p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Fecha</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Tipo</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {savedBackups.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-2 text-gray-700">
                        {new Date(b.created_at).toLocaleString('es-DO')}
                      </td>
                      <td className="px-4 py-2">
                        <span className={b.tipo === 'manual' ? 'text-primary-600' : 'text-amber-600'}>
                          {b.tipo === 'manual' ? 'Manual' : 'Pre-restauración'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right space-x-2">
                        <Button variant="secondary" className="text-xs py-1" onClick={() => handleDownloadSaved(b.id)}>
                          Descargar
                        </Button>
                        <Button variant="secondary" className="text-xs py-1" onClick={() => handleRestoreSaved(b.id)}>
                          Restaurar
                        </Button>
                        <Button
                          variant="secondary"
                          className="text-xs py-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteBackup(b.id)}
                          disabled={deletingId === b.id}
                          title="Eliminar este backup de la nube"
                        >
                          {deletingId === b.id ? 'Eliminando…' : <><Trash2 className="w-3.5 h-3.5 inline mr-0.5" /> Eliminar</>}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="w-6 h-6 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Restaurar desde archivo</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Si tienes un archivo .json de backup en este dispositivo, selecciónalo aquí. Se generará un backup del estado actual antes de restaurar.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Elegir archivo y restaurar
          </Button>
        </section>
      </div>

      {restoreError && !modalOpen && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {restoreError}
        </div>
      )}

      {/* Modal de confirmación */}
      {modalOpen && canRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border-2 border-red-500">
            <div className="bg-red-600 text-white px-6 py-4 flex items-center gap-2">
              <Shield className="w-6 h-6" />
              <span className="font-semibold">Confirmar restauración</span>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-red-700 font-medium bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                ¿Estás seguro? Esta acción es definitiva y protege la integridad de tus datos. Se eliminarán todos los datos registrados después de la fecha del backup; lo que restaure reemplazará tu cartera actual. No se puede deshacer.
              </p>
              <p className="text-sm text-gray-600">
                Se ha generado un <strong>Backup Pre-Restauración</strong> del estado actual. Se descargará automáticamente al confirmar; guárdalo por si necesitas revertir.
              </p>
              <p className="text-sm text-gray-600">
                Para continuar, escribe el nombre exacto de tu empresa:
              </p>
              <input
                type="text"
                value={companyNameConfirm}
                onChange={(e) => setCompanyNameConfirm(e.target.value)}
                placeholder="Nombre de su empresa"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={restoring}
              />
              {restoreError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {restoreError}
                </p>
              )}
              {restoreSuccess && (
                <p className="text-sm text-green-600 font-medium">
                  Restauración completada. Guarde el backup pre-restauración que se descargó.
                </p>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 btn-actions">
              <Button variant="secondary" onClick={handleCloseModal} disabled={restoring}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleRestoreConfirm}
                disabled={restoring || !companyNameConfirm.trim()}
              >
                {restoring ? 'Restaurando…' : 'Sí, restaurar (acción definitiva)'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
