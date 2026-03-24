/** Valores en BD para `pagos_pendientes_verificacion.estado` (mayúscula inicial). */
export type EstadoPagoVerificacion = 'Pendiente' | 'Verificado' | 'Rechazado'

export function normalizarEstadoPagoVerificacion(raw: unknown): EstadoPagoVerificacion {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()

  if (s === 'verificado' || s === 'aprobado' || s === 'confirmado') {
    return 'Verificado'
  }

  if (s === 'rechazado') {
    return 'Rechazado'
  }

  // Valores legacy / APIs antiguas que aún cuentan como pendiente de revisión
  if (
    s === 'pendiente_verificacion' ||
    s === 'pendiente de verificacion' ||
    s === 'pending' ||
    s === 'en_revision' ||
    s === 'en revision'
  ) {
    return 'Pendiente'
  }

  return 'Pendiente'
}

export function esPendientePagoVerificacion(estado: unknown): boolean {
  return normalizarEstadoPagoVerificacion(estado) === 'Pendiente'
}
