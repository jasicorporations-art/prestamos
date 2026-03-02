/**
 * Escapa un valor para usarlo en filtros .or() de PostgREST/Supabase.
 * Valores con espacios, comas o comillas deben ir entre comillas dobles.
 * @see https://postgrest.org/en/stable/references/api/tables_views.html#operators
 */
export function escapeFilterValue(value: string): string {
  if (value === '') return value
  if (/[\s,"\\]/.test(value)) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Construye la expresión .or() para filtrar por empresa_id (esquema UUID).
 * compania_id ya no se usa en el rebuild.
 */
export function orEmpresaCompania(empresaId: string): string {
  const v = escapeFilterValue(empresaId)
  return `empresa_id.eq.${v}`
}
