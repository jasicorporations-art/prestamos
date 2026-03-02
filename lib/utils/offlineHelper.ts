/**
 * Helper para manejar operaciones offline automáticamente
 */

import { offlineSyncService } from '../services/offlineSync'

/**
 * Verificar si hay conexión a internet
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true
  return navigator.onLine
}

/**
 * Intentar ejecutar una operación, guardando offline si no hay conexión
 */
export async function executeWithOfflineFallback<T>(
  operation: () => Promise<T>,
  offlineOperation: {
    type: 'create' | 'update' | 'delete'
    entity: 'venta' | 'cliente' | 'pago' | 'motor'
    data: any
  }
): Promise<T> {
  if (isOnline()) {
    try {
      // Intentar ejecutar la operación normalmente
      return await operation()
    } catch (error: any) {
      // NO guardar offline si es un error de validación, RLS, o de base de datos
      // Solo guardar offline si es un error de red real
      const isNetworkError = (
        error?.message?.includes('fetch') ||
        error?.message?.includes('network') ||
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('NetworkError') ||
        error?.code === 'ECONNREFUSED' ||
        error?.code === 'ETIMEDOUT' ||
        (!navigator.onLine && error?.message?.includes('network'))
      )
      
      // NO guardar offline si es un error de RLS, validación, o de base de datos
      const isDatabaseError = (
        error?.code === 'PGRST116' || // RLS policy violation
        error?.code === '23505' || // Unique constraint violation
        error?.code === '23503' || // Foreign key violation
        error?.code === '23502' || // Not null violation
        error?.code === '42P01' || // Table does not exist
        error?.code === '42703' || // Column does not exist
        error?.message?.includes('permission denied') ||
        error?.message?.includes('row-level security') ||
        error?.message?.includes('RLS') ||
        error?.message?.includes('violates') ||
        error?.message?.includes('constraint') ||
        error?.message?.includes('column') ||
        error?.message?.includes('table')
      )
      
      if (isDatabaseError) {
        console.error('❌ [offlineHelper] Error de base de datos detectado, NO guardando offline:', error)
        // Lanzar el error real para que el usuario lo vea
        throw error
      }
      
      if (isNetworkError) {
        console.log('📴 Error de red detectado, guardando offline...')
        offlineSyncService.savePendingOperation(offlineOperation)
        throw new Error('Operación guardada offline. Se sincronizará automáticamente cuando regrese el internet.')
      }
      
      // Si es otro tipo de error, lanzarlo normalmente
      throw error
    }
  } else {
    // Sin conexión: guardar offline inmediatamente
    console.log('📴 Sin conexión, guardando operación offline...')
    offlineSyncService.savePendingOperation(offlineOperation)
    throw new Error('Sin conexión. La operación se guardó offline y se sincronizará automáticamente cuando regrese el internet.')
  }
}



