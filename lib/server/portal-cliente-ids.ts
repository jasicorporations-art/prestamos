import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Misma lógica que el resumen del portal: el titular puede tener varias filas en `clientes`
 * (misma cédula, empresa o legacy null). Las ventas/pagos pueden estar ligados a cualquiera de esos IDs.
 */
export async function expandClienteIdsPortal(
  admin: SupabaseClient,
  clienteIdSesion: string,
  empresaIdSesion: string,
  cedulaConocida?: string | null
): Promise<string[]> {
  const out = new Set<string>()
  out.add(String(clienteIdSesion))

  let cedula = cedulaConocida != null ? String(cedulaConocida).trim() : ''
  if (!cedula) {
    const { data: row } = await admin
      .from('clientes')
      .select('cedula')
      .eq('id', clienteIdSesion)
      .eq('empresa_id', empresaIdSesion)
      .maybeSingle()
    cedula = String((row as { cedula?: string | null } | null)?.cedula || '').trim()
  }
  if (!cedula) {
    const { data: rowLegacy } = await admin
      .from('clientes')
      .select('cedula')
      .eq('id', clienteIdSesion)
      .maybeSingle()
    cedula = String((rowLegacy as { cedula?: string | null } | null)?.cedula || '').trim()
  }

  if (!cedula) return [...out]

  const cedNorm = cedula.replace(/-/g, '')
  const formatos = Array.from(new Set([cedNorm, cedula]))
  for (const ced of formatos) {
    const { data: dups } = await admin
      .from('clientes')
      .select('id')
      .eq('cedula', ced)
      .or(`empresa_id.eq.${empresaIdSesion},empresa_id.is.null`)
    for (const d of dups || []) {
      if (d && (d as { id?: string }).id) out.add(String((d as { id: string }).id))
    }
  }

  return [...out]
}

function mismoUuid(a: string, b: string): boolean {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
}

/** empresa_id efectivo de la venta (muchas BDs usan compania_id como tenant). */
export function empresaIdEfectivoVenta(venta: {
  empresa_id?: string | null
  compania_id?: string | null
}): string {
  const e = venta?.empresa_id != null ? String(venta.empresa_id).trim() : ''
  const c = venta?.compania_id != null ? String(venta.compania_id).trim() : ''
  return e || c || ''
}

/**
 * ¿La venta pertenece al tenant de la sesión del portal?
 */
export function ventaPerteneceAlTenantPortal(
  venta: { empresa_id?: string | null; compania_id?: string | null },
  empresaIdSesion: string
): boolean {
  const tid = empresaIdEfectivoVenta(venta)
  if (!tid) return true
  return mismoUuid(tid, empresaIdSesion)
}
