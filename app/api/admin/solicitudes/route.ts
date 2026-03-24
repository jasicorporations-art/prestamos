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

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const admin = getSupabaseAdmin()
    const perfil = await getPerfil(admin, user.id)
    const rol = (perfil?.rol || '').toLowerCase().replace(/\s+/g, '_')
    const esAdmin = rol === 'admin' || rol === 'super_admin' || rol === 'superadmin'
    if (!esAdmin || !perfil?.empresa_id) {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
    }

    const { data, error } = await admin
      .from('solicitudes_prestamos')
      .select('id,empresa_id,datos_cliente,monto_solicitado,descripcion,fotos_producto,estado,created_at,aprobado_cliente_id,aprobado_motor_id,aprobado_venta_id')
      .eq('id_empresa', perfil.empresa_id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ solicitudes: data || [] })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error listando solicitudes' }, { status: 500 })
  }
}
