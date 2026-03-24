/**
 * Indica si el cliente tiene contraseña de portal propia (hash scrypt en BD).
 * Sin dependencias de Node (sirve en cliente tras quitar el campo sensible del objeto).
 */
export function tienePortalPasswordConfigurada(stored: unknown): boolean {
  const s = stored != null ? String(stored).trim() : ''
  return s.startsWith('scrypt$') && s.length > 16
}
