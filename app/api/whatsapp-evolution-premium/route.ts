import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET: Indica si el usuario (o su compañía) tiene WhatsApp Evolution activo (pagado).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ tieneEvolutionPremium: false })

    const admin = getSupabaseAdmin()
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const evolutionVigente = (premiumUntil: string | null | undefined) => {
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

    type Row = {
      empresa_id?: string | null
      compania_id?: string | null
      has_evolution_whatsapp?: unknown
      premium_until_evolution?: string | null
      rol?: string | null
    }
    let lista: Row[] = []
    const { data: perfilList } = await admin
      .from('perfiles')
      .select('empresa_id, compania_id, has_evolution_whatsapp, premium_until_evolution, rol')
      .eq('user_id', user.id)
    lista = Array.isArray(perfilList) ? perfilList : []

    if (lista.length === 0 && (user.email ?? '').trim().includes('@')) {
      const { data: porEmail } = await admin
        .from('perfiles')
        .select('empresa_id, compania_id, has_evolution_whatsapp, premium_until_evolution, rol')
        .eq('email', (user.email ?? '').trim())
      if (Array.isArray(porEmail) && porEmail.length > 0) lista = porEmail
    }

    if (lista.length === 0) return NextResponse.json({ tieneEvolutionPremium: false })

    const perfil = lista[0] ?? null
    let tiene = lista.some(
      (p) => isPremiumFlag(p.has_evolution_whatsapp) && evolutionVigente(p.premium_until_evolution)
    )
    if ((perfil?.rol ?? '').toLowerCase() === 'super_admin') return NextResponse.json({ tieneEvolutionPremium: true })
    if (tiene) return NextResponse.json({ tieneEvolutionPremium: true })

    const companyId = perfil?.empresa_id || perfil?.compania_id
    if (!companyId) return NextResponse.json({ tieneEvolutionPremium: false })

    const { data: perfilesCompania } = await admin
      .from('perfiles')
      .select('id, has_evolution_whatsapp, premium_until_evolution')
      .or(`empresa_id.eq.${companyId},compania_id.eq.${companyId}`)

    const algunoVigente = (perfilesCompania ?? []).some(
      (p: Row) =>
        isPremiumFlag(p.has_evolution_whatsapp) && evolutionVigente(p.premium_until_evolution)
    )
    return NextResponse.json({ tieneEvolutionPremium: !!algunoVigente })
  } catch (e) {
    console.error('[whatsapp-evolution-premium] Error:', e)
    return NextResponse.json({ tieneEvolutionPremium: false })
  }
}
