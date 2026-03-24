import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function getPerfil(admin: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const p1 = await admin.from('perfiles').select('rol, empresa_id').eq('user_id', userId).maybeSingle()
  if (p1.data) return p1.data as { rol?: string; empresa_id?: string | null }
  const p2 = await admin.from('perfiles').select('rol, empresa_id').eq('usuario_id', userId).maybeSingle()
  return (p2.data || null) as { rol?: string; empresa_id?: string | null } | null
}

function isMissingColumn(msg: string): boolean {
  const m = (msg || '').toLowerCase()
  return m.includes('column') && (m.includes('does not exist') || m.includes('not exist'))
}

/**
 * Quita la contraseña del portal: el cliente vuelve a poder entrar con últimos 4 / PIN de solicitud.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const perfil = await getPerfil(admin, user.id)
    const rol = String(perfil?.rol || '')
      .toLowerCase()
      .replace(/\s+/g, '_')
    const permitido = rol === 'admin' || rol === 'super_admin'
    if (!permitido || !perfil?.empresa_id) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const clienteId = params.id
    const empresaId = perfil.empresa_id

    const { data: cliente, error: cErr } = await admin
      .from('clientes')
      .select('id, empresa_id')
      .eq('id', clienteId)
      .maybeSingle()

    if (cErr || !cliente?.id) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    if (String((cliente as { empresa_id?: string }).empresa_id) !== String(empresaId)) {
      return NextResponse.json({ error: 'Cliente no pertenece a su empresa' }, { status: 403 })
    }

    const { error: uErr } = await admin
      .from('clientes')
      .update({
        portal_password: null,
        portal_password_updated_at: null,
      })
      .eq('id', clienteId)
      .eq('empresa_id', empresaId)

    if (uErr) {
      if (isMissingColumn(uErr.message || '')) {
        return NextResponse.json(
          {
            error:
              'La columna portal_password no existe. Ejecute supabase/agregar-portal-password-clientes.sql',
          },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: uErr.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      mensaje: 'Acceso del portal restablecido. El cliente podrá entrar con los últimos 4 del teléfono o PIN de solicitud.',
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al restablecer' },
      { status: 500 }
    )
  }
}
