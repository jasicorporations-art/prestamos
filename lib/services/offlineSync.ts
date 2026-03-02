/**
 * Servicio para sincronización offline
 * Guarda formularios cuando no hay conexión y los sincroniza automáticamente cuando regresa el internet
 * También espeja a IndexedDB para Background Sync (SW puede leer cuando la app está cerrada)
 */

import { addPendingOp, removePendingOp, clearAllPendingOps, setAllPendingOps } from '../utils/offlineOpsDB'
import { registerBackgroundSync } from '../utils/backgroundSync'

export interface PendingOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: 'venta' | 'cliente' | 'pago' | 'motor'
  data: any
  timestamp: number
  retries: number
}

const STORAGE_KEY = 'offline_pending_operations'
const MAX_RETRIES = 3

export const offlineSyncService = {
  /**
   * Guardar una operación pendiente en localStorage
   */
  savePendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retries'>): string {
    const pendingOps = this.getPendingOperations()
    const newOperation: PendingOperation = {
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
    }
    
    pendingOps.push(newOperation)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingOps))
    addPendingOp(newOperation).catch(() => {}) // Mirror para Background Sync
    registerBackgroundSync().catch(() => {}) // Registrar sync para cuando regrese la conexión
    console.log('📦 Operación guardada offline:', newOperation.id, newOperation.type, newOperation.entity)
    return newOperation.id
  },

  /**
   * Obtener todas las operaciones pendientes
   */
  getPendingOperations(): PendingOperation[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      return JSON.parse(stored)
    } catch (error) {
      console.error('Error leyendo operaciones pendientes:', error)
      return []
    }
  },

  /**
   * Eliminar una operación pendiente después de sincronizarla
   */
  removePendingOperation(operationId: string): void {
    const pendingOps = this.getPendingOperations()
    const filtered = pendingOps.filter(op => op.id !== operationId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    removePendingOp(operationId).catch(() => {})
    console.log('✅ Operación sincronizada y eliminada:', operationId)
  },

  /**
   * Incrementar contador de reintentos de una operación
   */
  incrementRetries(operationId: string): void {
    const pendingOps = this.getPendingOperations()
    const operation = pendingOps.find(op => op.id === operationId)
    if (operation) {
      operation.retries += 1
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingOps))
      addPendingOp(operation).catch(() => {})
    }
  },

  /**
   * Limpiar operaciones que excedieron el máximo de reintentos
   */
  clearFailedOperations(): void {
    const pendingOps = this.getPendingOperations()
    const validOps = pendingOps.filter(op => op.retries < MAX_RETRIES)
    if (validOps.length !== pendingOps.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validOps))
      setAllPendingOps(validOps).catch(() => {})
      console.log(`🧹 Limpiadas ${pendingOps.length - validOps.length} operaciones fallidas`)
    }
  },

  /**
   * Obtener cantidad de operaciones pendientes
   */
  getPendingCount(): number {
    return this.getPendingOperations().length
  },

  /**
   * Sincronizar localStorage desde IndexedDB (por si el SW ya sincronizó en background)
   */
  syncFromIndexedDB(ops: PendingOperation[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ops))
  },

  /**
   * Limpiar todas las operaciones pendientes (útil para debugging)
   */
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY)
    clearAllPendingOps().catch(() => {})
    console.log('🗑️ Todas las operaciones pendientes eliminadas')
  },
}



