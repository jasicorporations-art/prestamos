import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getConnectionState } from '@/lib/evolution-railway'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** GET: Estado de conexión WhatsApp Evolution de la empresa del usuario. */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'No autenticado', connected: false, plan_whatsapp: false }, { status: 401 })
    const admin = getSupabaseAdmin()
    const { data: perfiles } = await admin.from('perfiles').select('empresa_id, compania_id').eq('user_id', user.id)
    const perfil = Array.isArray(perfiles) && perfiles.length > 0 ? perfiles[0] : null
    const empresaId = (perfil as { empresa_id?: string; compania_id?: string } | null)?.empresa_id ?? (perfil as { empresa_id?: string; compania_id?: string } | null)?.compania_id ?? null
    if (!empresaId) return NextResponse.json({ connected: false, plan_whatsapp: false, error: 'Sin empresa asignada' }, { status: 400 })
    const { data: emp } = await (admin as any).from('empresas').select('whatsapp_premium').eq('id', empresaId).maybeSingle()
    const plan_whatsapp = (emp as { whatsapp_premium?: boolean } | null)?.whatsapp_premium === true
    const result = await getConnectionState(admin, empresaId)
    return NextResponse.json({ connected: result.connected, plan_whatsapp, instance: result.instance, error: result.error })
  } catch (e) {
    console.error('[evolution/connection-state]', e)
    return NextResponse.json({ connected: false, plan_whatsapp: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
