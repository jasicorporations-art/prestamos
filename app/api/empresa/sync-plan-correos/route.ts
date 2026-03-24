import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { syncEmpresaPlanCorreoForUser } from '@/lib/server/syncEmpresaPlanCorreo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST: alinea `empresas.plan_suscripcion` con `user_metadata.planType` (Stripe / registro).
 * Idempotente. Llamar tras login o compra de plan.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    let bodyOverride: string | null = null
    try {
      const body = await request.json().catch(() => ({}))
      if (typeof body?.planTypeOverride === 'string' && body.planTypeOverride.trim()) {
        bodyOverride = body.planTypeOverride.trim()
      }
    } catch {
      /* sin body */
    }

    const admin = getSupabaseAdmin()
    const result = await syncEmpresaPlanCorreoForUser(
      admin,
      user.id,
      bodyOverride ?? undefined
    )

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'No se pudo sincronizar' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      plan_correo: result.planCorreo,
      empresas_actualizadas: result.actualizadas ?? 0,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error'
    console.error('[sync-plan-correos]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
