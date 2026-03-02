/**
 * Instrumentación de tiempos para diagnóstico de login y carga de datos web.
 * Solo activa en development (NODE_ENV=development).
 */

const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'

export interface AuthTrace {
  clickLogin: number
  signInResolved: number
  onAuthStateChangeSignedIn: number
  perfilFetched: number
  uiLoggedIn: number
}

export interface DataTrace {
  appMount: number
  supabaseReady: number
  sessionDetected: number
  companiaReady: number
  firstFetchStart: number
  firstFetchEnd: number
  dataLoaded: number
  dataError: number
}

let traceStart: number | null = null
let trace: Partial<AuthTrace & DataTrace> = {}
let dataTraceStartTime: number | null = null

export function authTraceStart(label: string) {
  if (!isDev) return
  const now = performance.now()
  traceStart = traceStart ?? now
  trace[label as keyof AuthTrace] = Math.round(now - traceStart)
  console.log(`[AuthTrace] ${label}: +${trace[label as keyof AuthTrace]}ms`)
}

export function authTraceEnd() {
  if (!isDev) return
  const elapsed = traceStart ? Math.round(performance.now() - traceStart) : 0
  console.log('[AuthTrace] === RESUMEN ===', { ...trace, totalMs: elapsed })
  traceStart = null
  trace = {}
}

export function authTraceReset() {
  traceStart = null
  trace = {}
}

/** Inicia trace de carga de datos (dashboard, etc.) */
export function dataTraceStart(label: keyof DataTrace) {
  if (!isDev) return
  const now = performance.now()
  dataTraceStartTime = dataTraceStartTime ?? now
  trace[label] = Math.round(now - dataTraceStartTime)
  console.log(`[DataTrace] ${label}: +${trace[label]}ms`)
}

/** Finaliza trace de datos */
export function dataTraceEnd(success: boolean) {
  if (!isDev) return
  const label = success ? 'dataLoaded' : 'dataError'
  dataTraceStartTime = dataTraceStartTime ?? performance.now()
  trace[label] = Math.round(performance.now() - dataTraceStartTime)
  console.log(`[DataTrace] === RESUMEN ===`, { ...trace, success })
  dataTraceStartTime = null
  trace = {}
}

/** Log de request (endpoint, status, duración) - sin datos sensibles */
export function logRequest(label: string, opts: { status?: number; durationMs?: number; error?: string }) {
  if (!isDev) return
  console.log(`[DataTrace] request ${label}:`, opts)
}
