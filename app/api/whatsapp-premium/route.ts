import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET: Indica si el usuario (o su compañía) tiene WhatsApp Premium activo.
 * Usa herencia por compañía: si algún usuario de la misma compañía tiene premium, devuelve true.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ tienePremium: false })

    const admin = getSupabaseAdmin()
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const premiumVigente = (premiumUntil: string | null | undefined) => {
      if (!premiumUntil) return true
      const hasta = new Date(premiumUntil)
      hasta.setHours(0, 0, 0, 0)
      return hasta >= hoy
    }
    const isPremiumFlag = (v: unknown) => {
      if (v === true || v === 1) return true
      const s = typeof v === 'string' ? v.toLowerCase().trim() : ''
      return s === 'true' || s === 't' || s === '1' || s === 'yes' || s === 'si'
    }

    let lista: Array<{ empresa_id?: string | null; compania_id?: string | null; has_whatsapp_premium?: unknown; premium_until?: string | null; rol?: string | null }> = []
    const { data: perfilList } = await admin
      .from('perfiles')
      .select('empresa_id, compania_id, has_whatsapp_premium, premium_until, rol')
      .eq('user_id', user.id)
    lista = Array.isArray(perfilList) ? perfilList : []

    if (lista.length === 0 && (user.email ?? '').trim().includes('@')) {
      const { data: porEmail } = await admin
        .from('perfiles')
        .select('empresa_id, compania_id, has_whatsapp_premium, premium_until, rol')
        .eq('email', (user.email ?? '').trim())
      if (Array.isArray(porEmail) && porEmail.length > 0) lista = porEmail
    }

    const perfil = lista[0] ?? null
    if (lista.length === 0) return NextResponse.json({ tienePremium: false })

    let tienePremium = lista.some((p) => isPremiumFlag(p.has_whatsapp_premium) && premiumVigente(p.premium_until))
    if (tienePremium) return NextResponse.json({ tienePremium: true })
    if ((perfil.rol ?? '').toLowerCase() === 'super_admin') return NextResponse.json({ tienePremium: true })

    const companyId = perfil.empresa_id || perfil.compania_id
    if (!companyId) return NextResponse.json({ tienePremium: false })

    const { data: perfilesCompania } = await admin
      .from('perfiles')
      .select('id, has_whatsapp_premium, premium_until')
      .or(`empresa_id.eq.${companyId},compania_id.eq.${companyId}`)

    const algunoVigente = (perfilesCompania ?? []).some(
      (p) => isPremiumFlag(p.has_whatsapp_premium) && premiumVigente(p.premium_until)
    )
    return NextResponse.json({ tienePremium: !!algunoVigente })
  } catch (e) {
    console.error('[whatsapp-premium] Error:', e)
    return NextResponse.json({ tienePremium: false })
  }
}
