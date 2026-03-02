/** Formato UUID estándar (8-4-4-4-12 hex) */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Verifica si un string es un UUID válido (evita pasar nombres de empresa a columnas UUID) */
export function isValidUUID(s: string | null | undefined): boolean {
  if (s == null || typeof s !== 'string') return false
  return UUID_REGEX.test(s.trim())
}

/**
 * Utilidad para obtener la compañía actual desde localStorage
 * Esto se usa en los servicios para filtrar datos por compañía
 */
export function getCompaniaActual(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  const v = localStorage.getItem('compania_actual')
  if (v === null || v === undefined || typeof v !== 'string') {
    return null
  }
  const trimmed = v.trim()
  if (!trimmed || trimmed === 'SISTEMA') return null
  // Solo devolver si es UUID válido (evita "invalid input syntax for type uuid")
  if (!isValidUUID(trimmed)) {
    localStorage.removeItem('compania_actual') // Limpiar valor inválido (ej. nombre de empresa)
    return null
  }
  return trimmed
}

const PERFIL_TIMEOUT_MS = 6000

/**
 * Obtiene la compañía actual con fallback al perfil del usuario.
 * Útil cuando localStorage aún no se ha inicializado (race condition al cargar).
 * La carga del perfil es la última opción (solo si localStorage no tiene valor).
 * Incluye timeout para evitar bloqueos cuando getPerfilActual() tarda.
 */
export async function getCompaniaActualOrFromPerfil(): Promise<string | null> {
  const fromStorage = getCompaniaActual()
  if (fromStorage) return fromStorage

  try {
    const { perfilesService } = await import('../services/perfiles')
    const perfil = await Promise.race([
      perfilesService.getPerfilActual(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), PERFIL_TIMEOUT_MS)),
    ])
    const raw = perfil?.empresa_id || perfil?.compania_id
    if (raw === null || raw === undefined) {
      return null
    }
    const trimmed = String(raw).trim()
    return trimmed && isValidUUID(trimmed) ? trimmed : null
  } catch {
    return null
  }
}

/**
 * Verifica si una compañía está disponible
 */
export function tieneCompania(): boolean {
  return getCompaniaActual() !== null
}



