import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { sendText } from '@/lib/evolution-railway'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** POST: Envía mensaje de texto por Evolution. Solo si empresa tiene whatsapp_enabled. Uso interno (recibo/amortización). */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'No autenticado', ok: false }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const { number, text, empresa_id: bodyEmpresaId } = body as { number?: string; text?: string; empresa_id?: string }
    if (!number || !text) return NextResponse.json({ error: 'Faltan number y text', ok: false }, { status: 400 })
    const admin = getSupabaseAdmin()
    let empresaId = bodyEmpresaId
    if (!empresaId) {
      const { data: perfiles } = await admin.from('perfiles').select('empresa_id, compania_id').eq('user_id', user.id)
      const perfil = Array.isArray(perfiles) && perfiles.length > 0 ? perfiles[0] : null
      empresaId = (perfil as { empresa_id?: string; compania_id?: string } | null)?.empresa_id ?? (perfil as { empresa_id?: string; compania_id?: string } | null)?.compania_id ?? null
    }
    if (!empresaId) return NextResponse.json({ error: 'Sin empresa', ok: false }, { status: 400 })
    const out = await sendText(admin, empresaId, number, text)
    if (!out.ok) return NextResponse.json({ error: out.error, ok: false }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[evolution/send-text]', e)
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
