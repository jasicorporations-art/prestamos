import { NextRequest } from 'next/server'
import { getUserFromRequest, createServiceRoleClient } from '@/lib/supabase-server'

/** Acepta super_admin en BD con cualquier capitalización o variante. */
export function rolEsSuperAdmin(rol: string | null | undefined): boolean {
  const n = String(rol || '').trim().toLowerCase().replace(/\s+/g, '_')
  return n === 'super_admin' || n === 'superadmin'
}

/**
 * Verifica JWT (cookies o Bearer) y rol super_admin leyendo perfiles con service role.
 * Importante: con solo Bearer, antes se consultaba `perfiles` con cliente anónimo sin JWT en PostgREST,
 * y RLS devolvía vacío → 403 o fallos en cadena. Service role + user_id del token resuelve eso.
 */
export async function requireSuperAdmin(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return { ok: false as const, status: 401, body: { error: 'No autenticado' } }
    }

    const admin = createServiceRoleClient()
    const { data: perfil, error } = await admin
      .from('perfiles')
      .select('rol')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('[requireSuperAdmin] perfiles:', error.message)
      return { ok: false as const, status: 500, body: { error: 'No se pudo verificar el perfil' } }
    }

    if (!rolEsSuperAdmin(perfil?.rol)) {
      return { ok: false as const, status: 403, body: { error: 'Se requiere rol super_admin' } }
    }

    return { ok: true as const }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('SUPABASE_SERVICE_ROLE_KEY') || msg.includes('required for super-admin')) {
      return { ok: false as const, status: 500, body: { error: 'Service role no configurada en el servidor' } }
    }
    console.error('[requireSuperAdmin]', e)
    return { ok: false as const, status: 500, body: { error: msg } }
  }
}
