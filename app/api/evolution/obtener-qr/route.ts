import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { fetchQR } from '@/lib/evolution-railway'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const admin = getSupabaseAdmin()
    const { data: perfiles } = await admin.from('perfiles').select('empresa_id, compania_id').eq('user_id', user.id)
    const perfil = Array.isArray(perfiles) && perfiles.length > 0 ? perfiles[0] : null
    const empresaId = (perfil as { empresa_id?: string; compania_id?: string } | null)?.empresa_id ?? (perfil as { empresa_id?: string; compania_id?: string } | null)?.compania_id ?? null
    if (!empresaId) return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 400 })
    const { data: emp } = await (admin as any).from('empresas').select('whatsapp_premium').eq('id', empresaId).maybeSingle()
    if (!(emp as { whatsapp_premium?: boolean } | null)?.whatsapp_premium) {
      return NextResponse.json(
        { error: 'Tu empresa debe tener WhatsApp Premium activo para generar el código QR.' },
        { status: 403 }
      )
    }
    const result = await fetchQR(admin, empresaId)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 502 })
    try {
      const { data: emp } = await admin.from('empresas').select('whatsapp_instance').eq('id', empresaId).maybeSingle()
      if (!(emp as { whatsapp_instance?: string } | null)?.whatsapp_instance) {
        await (admin as any).from('empresas').update({ whatsapp_instance: result.instance }).eq('id', empresaId)
      }
    } catch {
      // ignorar
    }
    return NextResponse.json({ qr: result.qr, instance: result.instance })
  } catch (e) {
    console.error('[evolution/obtener-qr]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
