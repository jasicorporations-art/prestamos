/**
 * Reintentos con backoff para evitar condición de carrera cuando la API se llama
 * justo después de un insert que puede no estar confirmado (committed) aún.
 *
 * Uso: llamar a fetch(); si no hay resultado y no hay error de BD, esperar y reintentar.
 * Delays: 0 ms, 400 ms, 800 ms, 1.2 s (4 intentos, ~2.4 s máximo).
 */

export const RETRY_DELAYS_MS = [0, 400, 800, 1200] as const
export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length

/**
 * Ejecuta la función fetchFn hasta que devuelva un resultado truthy o haya error de BD.
 * Entre intentos espera RETRY_DELAYS_MS[i] ms.
 * @param fetchFn - Función async sin argumentos que hace la consulta y actualiza estado externo
 * @param hasResult - Función que indica si ya tenemos resultado (p. ej. () => !!pago)
 * @param hasDbError - Función que indica si hubo error de BD (no reintentar), p. ej. () => !!pagoError
 */
export async function retryUntilFound(
  fetchFn: () => Promise<void>,
  hasResult: () => boolean,
  hasDbError: () => boolean
): Promise<void> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[i]))
    }
    await fetchFn()
    if (hasResult()) return
    if (hasDbError()) return
  }
}
