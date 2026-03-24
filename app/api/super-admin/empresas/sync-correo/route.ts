import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/auth-super-admin'
import { syncEmpresaPlanCorreoForUser } from '@/lib/server/syncEmpresaPlanCorreo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Alinea empresas.plan_suscripcion + límite de correos con el plan SaaS (metadata Stripe)
 * del dueño y administradores del tenant.
 */
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })
  try {
    const body = await request.json()
    const empresaId = typeof body?.empresa_id === 'string' ? body.empresa_id.trim() : ''
    if (!empresaId) {
      return NextResponse.json({ error: 'empresa_id requerido' }, { status: 400 })
    }

    const admin = createServiceRoleClient()
    const { data: emp, error: empErr } = await admin
      .from('empresas')
      .select('user_id')
      .eq('id', empresaId)
      .maybeSingle()

    if (empErr) throw empErr
    const ownerId = (emp as { user_id?: string } | null)?.user_id
    if (!ownerId) {
      return NextResponse.json({ error: 'Empresa sin user_id (dueño)' }, { status: 400 })
    }

    const result = await syncEmpresaPlanCorreoForUser(admin, String(ownerId), null, { force: false })
    if (!result.ok && result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      actualizadas: result.actualizadas ?? 0,
      planCorreo: result.planCorreo,
    })
  } catch (e: unknown) {
    console.error('[sync-correo]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al sincronizar' },
      { status: 500 }
    )
  }
}
