/**
 * Servicio para sincronizar operaciones pendientes cuando regresa el internet
 */

import { offlineSyncService, PendingOperation } from './offlineSync'
import { ventasService } from './ventas'
import { clientesService } from './clientes'
import { pagosService } from './pagos'
import { motoresService } from './motores'

export const syncService = {
  /**
   * Sincronizar todas las operaciones pendientes
   */
  async syncAll(): Promise<{ success: number; failed: number }> {
    const pendingOps = offlineSyncService.getPendingOperations()
    
    if (pendingOps.length === 0) {
      console.log('✅ No hay operaciones pendientes para sincronizar')
      return { success: 0, failed: 0 }
    }

    console.log(`🔄 Sincronizando ${pendingOps.length} operación(es) pendiente(s)...`)

    let success = 0
    let failed = 0

    // Procesar operaciones en orden (FIFO)
    for (const operation of pendingOps) {
      try {
        await this.syncOperation(operation)
        offlineSyncService.removePendingOperation(operation.id)
        success++
      } catch (error) {
        console.error(`❌ Error sincronizando operación ${operation.id}:`, error)
        offlineSyncService.incrementRetries(operation.id)
        failed++
      }
    }

    // Limpiar operaciones que excedieron reintentos
    offlineSyncService.clearFailedOperations()

    console.log(`✅ Sincronización completada: ${success} exitosas, ${failed} fallidas`)
    
    // Notificar al usuario si hubo sincronizaciones exitosas
    if (success > 0) {
      this.notifySyncSuccess(success)
    }

    return { success, failed }
  },

  /**
   * Sincronizar una operación individual
   */
  async syncOperation(operation: PendingOperation): Promise<void> {
    const { type, entity, data } = operation

    switch (entity) {
      case 'venta':
        if (type === 'create') {
          await ventasService.create(data)
        } else {
          throw new Error(`Operación ${type} no soportada para ventas`)
        }
        break

      case 'cliente':
        if (type === 'create') {
          await clientesService.create(data)
        } else if (type === 'update') {
          await clientesService.update(data.id, data)
        } else if (type === 'delete') {
          await clientesService.delete(data.id)
        }
        break

      case 'pago':
        if (type === 'create') {
          await pagosService.create(data)
        } else if (type === 'delete') {
          // pagosService.delete requiere ventaId
          await pagosService.delete(data.id, data.venta_id)
        } else {
          throw new Error(`Operación ${type} no soportada para pagos`)
        }
        break

      case 'motor':
        if (type === 'create') {
          await motoresService.create(data)
        } else if (type === 'update') {
          await motoresService.update(data.id, data)
        } else if (type === 'delete') {
          await motoresService.delete(data.id)
        }
        break

      default:
        throw new Error(`Tipo de entidad desconocido: ${entity}`)
    }
  },

  /**
   * Notificar al usuario sobre sincronización exitosa
   */
  notifySyncSuccess(count: number): void {
    // Disparar evento para que los componentes puedan mostrar notificaciones
    window.dispatchEvent(
      new CustomEvent('sync-success', {
        detail: { count },
      })
    )
  },

  /**
   * Verificar si hay operaciones pendientes
   */
  hasPendingOperations(): boolean {
    return offlineSyncService.getPendingCount() > 0
  },
}

