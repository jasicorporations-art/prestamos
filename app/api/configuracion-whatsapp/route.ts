import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Row = {
  empresa_id?: string | null
  compania_id?: string | null
}

/**
 * GET: Devuelve la configuración WhatsApp de la empresa del usuario.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const admin = getSupabaseAdmin()
    let lista: Row[] = []
    const { data: perfilList } = await admin
      .from('perfiles')
      .select('empresa_id, compania_id')
      .eq('user_id', user.id)
    lista = Array.isArray(perfilList) ? perfilList : []
    if (lista.length === 0 && (user.email ?? '').trim().includes('@')) {
      const { data: porEmail } = await admin
        .from('perfiles')
        .select('empresa_id, compania_id')
        .eq('email', (user.email ?? '').trim())
      if (Array.isArray(porEmail) && porEmail.length > 0) lista = porEmail
    }
    const empresaId = lista[0]?.empresa_id || lista[0]?.compania_id
    if (!empresaId) return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 400 })

    const { data, error } = await admin
      .from('configuracion_whatsapp')
      .select('metodo_envio, evolution_instance, evolution_apikey, evolution_base_url')
      .eq('empresa_id', empresaId)
      .maybeSingle()

    if (error) {
      console.warn('[configuracion-whatsapp] GET error:', error)
      return NextResponse.json(
        { metodo_envio: 'TWILIO', evolution_instance: null, evolution_apikey: null, evolution_base_url: null },
        { status: 200 }
      )
    }

    const row = data as Record<string, unknown> | null
    return NextResponse.json({
      metodo_envio: row?.metodo_envio ?? 'TWILIO',
      evolution_instance: row?.evolution_instance ?? null,
      evolution_apikey: row?.evolution_apikey ?? null,
      evolution_base_url: row?.evolution_base_url ?? null,
    })
  } catch (e) {
    console.error('[configuracion-whatsapp] GET:', e)
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
  }
}

/**
 * PATCH: Actualiza la configuración WhatsApp de la empresa.
 * Body: { metodo_envio?, evolution_base_url?, evolution_instance?, evolution_apikey? }
 * Solo se permite metodo_envio: 'EVOLUTION' si la empresa tiene Evolution premium.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const admin = getSupabaseAdmin()
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
    const empresaId = lista[0]?.empresa_id || lista[0]?.compania_id
    if (!empresaId) return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 400 })

    type PerfilRow = Row & { has_evolution_whatsapp?: unknown; premium_until_evolution?: string | null; rol?: string | null }
    const perfil = lista[0] as PerfilRow | undefined
    const hoy = new Date().toISOString().slice(0, 10)
    const evolutionVigente = (until: string | null | undefined) => !until || until >= hoy
    const isEvolution = (v: unknown) => v === true || v === 1 || String(v).toLowerCase() === 'true'
    let tieneEvolutionPremium = perfil && isEvolution(perfil.has_evolution_whatsapp) && evolutionVigente(perfil.premium_until_evolution)
    if ((perfil?.rol ?? '').toLowerCase() === 'super_admin') tieneEvolutionPremium = true
    if (!tieneEvolutionPremium && empresaId) {
      const { data: comp } = await admin
        .from('perfiles')
        .select('has_evolution_whatsapp, premium_until_evolution')
        .or(`empresa_id.eq.${empresaId},compania_id.eq.${empresaId}`)
      tieneEvolutionPremium = (comp ?? []).some(
        (p: PerfilRow) => isEvolution(p.has_evolution_whatsapp) && evolutionVigente(p.premium_until_evolution)
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      metodo_envio?: string
      evolution_base_url?: string | null
      evolution_instance?: string | null
      evolution_apikey?: string | null
    }
    const metodo = (body.metodo_envio ?? '').trim().toUpperCase()
    if (metodo === 'EVOLUTION' && !tieneEvolutionPremium) {
      return NextResponse.json(
        { error: 'Debes activar WhatsApp Evolution ($30) antes de usar Evolution API. Ve a Recordatorios y activa Evolution.' },
        { status: 403 }
      )
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (metodo === 'TWILIO' || metodo === 'EVOLUTION') updates.metodo_envio = metodo
    if (body.evolution_base_url !== undefined) updates.evolution_base_url = body.evolution_base_url?.trim() || null
    if (body.evolution_instance !== undefined) updates.evolution_instance = body.evolution_instance?.trim() || null
    if (body.evolution_apikey !== undefined) updates.evolution_apikey = body.evolution_apikey?.trim() || null

    const { error: upsertError } = await admin.from('configuracion_whatsapp').upsert(
      { empresa_id: empresaId, ...updates },
      { onConflict: 'empresa_id' }
    )

    if (upsertError) {
      console.error('[configuracion-whatsapp] PATCH:', upsertError)
      return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[configuracion-whatsapp] PATCH:', e)
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 })
  }
}
