/**
 * Registra Background Sync para operaciones pendientes offline.
 * Cuando el usuario recupera la conexión (incluso con la app cerrada),
 * el Service Worker sincronizará automáticamente.
 */
const SYNC_TAG = 'sync-pending-ops'

export async function registerBackgroundSync(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  try {
    const reg = await navigator.serviceWorker.ready
    if ('sync' in reg) {
      await (reg as any).sync.register(SYNC_TAG)
      console.log('[BackgroundSync] Registrado para sincronización en segundo plano')
    }
  } catch (e) {
    console.warn('[BackgroundSync] No disponible:', e)
  }
}
