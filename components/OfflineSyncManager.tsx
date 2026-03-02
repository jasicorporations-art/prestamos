'use client'

import { useEffect, useState } from 'react'
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'
import { syncService } from '@/lib/services/syncService'
import { offlineSyncService } from '@/lib/services/offlineSync'
import { getPendingOps } from '@/lib/utils/offlineOpsDB'
import { registerBackgroundSync } from '@/lib/utils/backgroundSync'

/**
 * Componente que maneja la sincronización automática cuando regresa el internet
 */
export function OfflineSyncManager() {
  const { isOnline, wasOffline } = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<{ success: number; failed: number } | null>(null)

  // Al cargar: reconciliar con IndexedDB (por si el SW sincronizó en background)
  useEffect(() => {
    getPendingOps().then((ops) => {
      const localCount = offlineSyncService.getPendingCount()
      if (ops.length < localCount) {
        offlineSyncService.syncFromIndexedDB(ops)
      }
      if (ops.length > 0) {
        registerBackgroundSync().catch(() => {})
      }
    }).catch(() => {})
  }, [])

  // Actualizar contador de operaciones pendientes
  useEffect(() => {
    const updatePendingCount = () => {
      setPendingCount(offlineSyncService.getPendingCount())
    }

    updatePendingCount()
    const interval = setInterval(updatePendingCount, 2000) // Actualizar cada 2 segundos

    return () => clearInterval(interval)
  }, [])

  // Sincronizar cuando regresa el internet
  useEffect(() => {
    const handleOnlineRestored = async () => {
      if (syncing) return

      const hasPending = syncService.hasPendingOperations()
      if (!hasPending) return

      setSyncing(true)
      try {
        const result = await syncService.syncAll()
        setLastSyncResult(result)
        setPendingCount(0)
        
        // Limpiar resultado después de 5 segundos
        setTimeout(() => {
          setLastSyncResult(null)
        }, 5000)
      } catch (error) {
        console.error('Error en sincronización automática:', error)
      } finally {
        setSyncing(false)
      }
    }

    window.addEventListener('online-restored', handleOnlineRestored)

    return () => {
      window.removeEventListener('online-restored', handleOnlineRestored)
    }
  }, [syncing])

  // Escuchar eventos de sincronización exitosa
  useEffect(() => {
    const handleSyncSuccess = (event: CustomEvent) => {
      const { count } = event.detail
      console.log(`✅ ${count} operación(es) sincronizada(s) exitosamente`)
    }

    window.addEventListener('sync-success', handleSyncSuccess as EventListener)

    return () => {
      window.removeEventListener('sync-success', handleSyncSuccess as EventListener)
    }
  }, [])

  // No renderizar nada si no hay operaciones pendientes y está online
  if (isOnline && pendingCount === 0 && !syncing && !lastSyncResult) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOnline && (
        <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg mb-2 flex items-center gap-2">
          <span>📴</span>
          <span>Modo offline - Los cambios se guardarán cuando regrese el internet</span>
        </div>
      )}

      {isOnline && pendingCount > 0 && !syncing && (
        <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg mb-2 flex items-center gap-2">
          <span>🔄</span>
          <span>{pendingCount} operación(es) pendiente(s) - Sincronizando...</span>
        </div>
      )}

      {syncing && (
        <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg mb-2 flex items-center gap-2">
          <span className="animate-spin">🔄</span>
          <span>Sincronizando operaciones...</span>
        </div>
      )}

      {lastSyncResult && (
        <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>
              {lastSyncResult.success} operación(es) sincronizada(s) exitosamente
              {lastSyncResult.failed > 0 && `, ${lastSyncResult.failed} fallida(s)`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}



