import { NextRequest, NextResponse } from 'next/server'
import { getStripeInstance } from '@/lib/stripe'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const WHATSAPP_PREMIUM_PRICE = 30 // USD

function isPremiumFlag(v: unknown): boolean {
  if (v === true || v === 1) return true
  const s = typeof v === 'string' ? v.toLowerCase().trim() : ''
  return s === 'true' || s === 't' || s === '1' || s === 'yes' || s === 'si'
}
function premiumVigente(premiumUntil: string | null | undefined): boolean {
  if (!premiumUntil) return true
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const hasta = new Date(premiumUntil)
  hasta.setHours(0, 0, 0, 0)
  return hasta >= hoy
}

/**
 * Acepta sesión por cookies o por Authorization: Bearer <token> (sesión en localStorage).
 * No crea sesión si el usuario o su empresa ya tienen WhatsApp Premium activo.
 */
export async function POST(request: NextRequest) {
  try {
    const finalUser = await getUserFromRequest(request)
    if (!finalUser) {
      return NextResponse.json(
        { error: 'No autenticado. Inicia sesión para continuar.' },
        { status: 401 }
      )
    }

    const admin = getSupabaseAdmin()
    type Row = { empresa_id?: string | null; compania_id?: string | null; has_whatsapp_premium?: unknown; premium_until?: string | null; rol?: string | null }
    let lista: Row[] = []
    const { data: perfilList } = await admin
      .from('perfiles')
      .select('empresa_id, compania_id, has_whatsapp_premium, premium_until, rol')
      .eq('user_id', finalUser.id)
    lista = Array.isArray(perfilList) ? perfilList : []
    if (lista.length === 0 && (finalUser.email ?? '').trim().includes('@')) {
      const { data: porEmail } = await admin
        .from('perfiles')
        .select('empresa_id, compania_id, has_whatsapp_premium, premium_until, rol')
        .eq('email', (finalUser.email ?? '').trim())
      if (Array.isArray(porEmail) && porEmail.length > 0) lista = porEmail
    }
    const perfil = lista[0] ?? null
    let tienePremium = lista.some((p) => isPremiumFlag(p.has_whatsapp_premium) && premiumVigente(p.premium_until))
    if ((perfil?.rol ?? '').toLowerCase() === 'super_admin') tienePremium = true
    if (!tienePremium && perfil) {
      const companyId = perfil.empresa_id || perfil.compania_id
      if (companyId) {
        const { data: perfilesCompania } = await admin
          .from('perfiles')
          .select('id, has_whatsapp_premium, premium_until')
          .or(`empresa_id.eq.${companyId},compania_id.eq.${companyId}`)
        tienePremium = (perfilesCompania ?? []).some(
          (p: Row) => isPremiumFlag(p.has_whatsapp_premium) && premiumVigente(p.premium_until)
        )
      }
    }
    if (tienePremium) {
      return NextResponse.json(
        { error: 'Ya tienes WhatsApp Premium activo. No es necesario volver a comprar. Recarga la página de Recordatorios.' },
        { status: 400 }
      )
    }

    const stripe = getStripeInstance()
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'WhatsApp Premium',
              description: 'Módulo de recordatorios automáticos por WhatsApp (30 días)',
            },
            unit_amount: WHATSAPP_PREMIUM_PRICE * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/recordatorios?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/recordatorios?canceled=true`,
      customer_email: finalUser.email || undefined,
      client_reference_id: finalUser.id,
      metadata: {
        userId: finalUser.id,
        userEmail: finalUser.email || '',
        productType: 'whatsapp_premium',
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al crear sesión de checkout'
    console.error('Error create-checkout-whatsapp:', error)
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}
