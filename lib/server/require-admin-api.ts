/**
 * Utilidades compartidas para rutas `/api/admin/*`:
 * normalización de roles y re-export del perfil multi-tenant usado en pagos por verificar.
 *
 * Convención: con `getSupabaseAdmin`, siempre validar sesión + rol + acotar datos al tenant del perfil.
 */

export {
  getPerfilPagosVerificar,
  tenantIdsUnicos,
  type PerfilPagosVerificar,
} from '@/lib/server/pagos-pendientes-verificacion-tenant'

export function normalizeRol(rol: string | null | undefined): string {
  return String(rol || '')
    .toLowerCase()
    .replace(/\s+/g, '_')
}

export function isRolSuperAdmin(rol: string | null | undefined): boolean {
  const r = normalizeRol(rol)
  return r === 'super_admin' || r === 'superadmin'
}

/** Admin de empresa o plataforma (sin cobrador). */
export function isRolAdminOSuper(rol: string | null | undefined): boolean {
  const r = normalizeRol(rol)
  return r === 'admin' || isRolSuperAdmin(rol)
}

/** Incluye cobrador (p. ej. comprobantes, pagos por verificar). */
export function isRolCobradorAdminOSuper(rol: string | null | undefined): boolean {
  const r = normalizeRol(rol)
  return isRolAdminOSuper(rol) || r === 'cobrador'
}
