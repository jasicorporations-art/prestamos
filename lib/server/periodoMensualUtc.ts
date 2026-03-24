/** Primer día del mes actual en UTC (YYYY-MM-DD), alineado con `periodo_mensual_actual_utc()` en SQL. */
export function periodoMensualActualUtcYmd(): string {
  const n = new Date()
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)).toISOString().slice(0, 10)
}
