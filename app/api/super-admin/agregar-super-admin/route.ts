import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/auth-super-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })

  try {
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    const admin = createServiceRoleClient()

    // Buscar usuario por email en auth.users
    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (usersError) throw usersError

    const user = usersData?.users?.find((u) => u.email?.toLowerCase() === email)
    if (!user) {
      return NextResponse.json({ error: `Usuario ${email} no encontrado en auth.users` }, { status: 404 })
    }

    // Upsert perfil con rol super_admin
    const perfilData = {
      user_id: user.id,
      rol: 'super_admin',
      activo: true,
      nombre_completo: 'Super Administrador',
      empresa_id: null,
      compania_id: null,
      app_id: null,
      terminos_aceptados: true,
      privacidad_aceptada: true,
      fecha_aceptacion: new Date().toISOString(),
      privacidad_fecha_aceptacion: new Date().toISOString(),
    }

    const { error: upsertError } = await admin
      .from('perfiles')
      .upsert(perfilData, { onConflict: 'user_id' })

    if (upsertError) throw upsertError

    return NextResponse.json({
      ok: true,
      mensaje: `Super Admin asignado correctamente a ${email}`,
    })
  } catch (e: any) {
    console.error('[agregar-super-admin]', e)
    return NextResponse.json({ error: e?.message || 'Error al asignar Super Admin' }, { status: 500 })
  }
}
