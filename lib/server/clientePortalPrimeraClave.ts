import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Primer acceso al portal: últimos 4 del celular o PIN de solicitud de préstamo (misma lógica que login).
 */
export async function verifyPrimeraClavePortal(
  admin: SupabaseClient,
  empresaId: string,
  cedula: string,
  cliente: { celular?: string | null },
  cred: string
): Promise<boolean> {
  const ult4 = String(cliente.celular || '').replace(/\D/g, '').slice(-4)
  if (ult4 && cred === ult4) return true

  const pinHash = createHash('sha256').update(cred).digest('hex')
  const { data: solicitudPin } = await admin
    .from('solicitudes_prestamos')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('pin_hash', pinHash)
    .eq('datos_cliente->>cedula', cedula)
    .limit(1)
    .maybeSingle()

  return !!solicitudPin?.id
}
