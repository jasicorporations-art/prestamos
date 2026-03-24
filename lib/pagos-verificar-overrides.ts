/**
 * Overrides en sessionStorage: la página "Pagos por verificar" los usa cuando el GET
 * aún devuelve Pendiente pero la acción aprobar/rechazar ya respondió OK (p. ej. lag o
 * filtro tenant en RPC). El AppShell debe usar la misma lógica para el badge/contador.
 */
import {
  type EstadoPagoVerificacion,
  esPendientePagoVerificacion,
  normalizarEstadoPagoVerificacion,
} from '@/lib/estado-pago-verificacion'

export const PAGOS_VERIFICAR_OVERRIDES_KEY = 'pagos_verificar_estado_overrides_v1'

export type OverrideEstado = {
  estado: EstadoPagoVerificacion
  motivo_rechazo?: string | null
}

export function readPagosVerificarOverrides(): Map<string, OverrideEstado> {
  if (typeof window === 'undefined') return new Map()
  try {
    const raw = sessionStorage.getItem(PAGOS_VERIFICAR_OVERRIDES_KEY)
    if (!raw) return new Map()
    const parsed = JSON.parse(raw) as Record<string, { estado?: string; motivo_rechazo?: string | null }>
    const m = new Map<string, OverrideEstado>()
    for (const [k, v] of Object.entries(parsed)) {
      const est = normalizarEstadoPagoVerificacion(v?.estado)
      if (est === 'Verificado' || est === 'Rechazado') {
        m.set(String(k).toLowerCase(), {
          estado: est,
          motivo_rechazo: v?.motivo_rechazo ?? null,
        })
      }
    }
    return m
  } catch {
    return new Map()
  }
}

/** Aplica overrides al contar pendientes (misma regla que la página admin). */
export function estadoEfectivoPagosVerificarItem(
  id: string,
  estadoApi: unknown,
  overrides: Map<string, OverrideEstado>
): EstadoPagoVerificacion {
  const idKey = String(id || '').toLowerCase()
  const backendEstado = normalizarEstadoPagoVerificacion(estadoApi)
  const override = overrides.get(idKey)
  if (override && backendEstado === 'Pendiente') {
    return override.estado
  }
  return backendEstado
}

export function contarPagosVerificarPendientes(
  items: Array<{ id?: string; estado?: unknown }>,
  overrides: Map<string, OverrideEstado>
): number {
  return items.filter((it) =>
    esPendientePagoVerificacion(estadoEfectivoPagosVerificarItem(String(it.id ?? ''), it.estado, overrides))
  ).length
}

export function persistPagosVerificarOverrides(map: Map<string, OverrideEstado>) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(PAGOS_VERIFICAR_OVERRIDES_KEY, JSON.stringify(Object.fromEntries(map)))
  } catch {
    // privado / cuota
  }
}
