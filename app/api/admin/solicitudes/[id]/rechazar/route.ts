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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const admin = getSupabaseAdmin()
    const perfil = await getPerfil(admin, user.id)
    const rol = (perfil?.rol || '').toLowerCase().replace(/\s+/g, '_')
    const esAdmin = rol === 'admin' || rol === 'super_admin' || rol === 'superadmin'
    if (!esAdmin || !perfil?.empresa_id) return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const motivo = typeof body?.motivo_rechazo === 'string' ? body.motivo_rechazo.trim() : null

    const upd = await admin
      .from('solicitudes_prestamos')
      .update({
        estado: 'rechazado',
        aprobado_por_user_id: user.id,
        fecha_decision: new Date().toISOString(),
        motivo_rechazo: motivo || null,
      })
      .eq('id', params.id)
      .eq('id_empresa', perfil.empresa_id)
      .select('*')
      .single()
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 })

    // Buró preventivo: persistir historial global de rechazos (no borrar persona).
    try {
      const cedula = String((upd.data as any)?.datos_cliente?.cedula || '').trim()
      if (cedula && motivo) {
        const { data: persona } = await admin
          .from('personas_central')
          .select('id')
          .eq('cedula', cedula)
          .maybeSingle()
        if (persona?.id) {
          await admin.from('personas_central_rechazos_historial').insert({
            persona_id: persona.id,
            empresa_id: perfil.empresa_id,
            solicitud_id: params.id,
            motivo_rechazo: motivo,
          })
        }
      }
    } catch {
      // No romper el rechazo por fallo de historial central.
    }

    return NextResponse.json({ ok: true, solicitud: upd.data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al rechazar solicitud' }, { status: 500 })
  }
}
