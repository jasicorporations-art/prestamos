import { NextRequest, NextResponse } from 'next/server'
import { getStripeInstance } from '@/lib/stripe'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { CREDITOS_PAQUETE_EXTENSION } from '@/lib/services/whatsapp-consumo'

const PRECIO_EXTENSION_USD = 10

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Crea sesión de checkout para Paquete de Extensión de 200 Notificaciones.
 * Acepta sesión por cookies o por Authorization: Bearer <token> (sesión en localStorage).
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
    const isPremium = (v: unknown) => {
      if (v === true || v === 1) return true
      const s = typeof v === 'string' ? v.toLowerCase().trim() : ''
      return s === 'true' || s === 't' || s === '1' || s === 'yes' || s === 'si'
    }

    const { data: perfilList } = await admin
      .from('perfiles')
      .select('empresa_id, compania_id, has_whatsapp_premium')
      .eq('user_id', finalUser.id)

    const lista = Array.isArray(perfilList) ? perfilList : []
    const perfil = lista[0] ?? null
    let empresaId: string | null = null
    if (lista.some((p) => isPremium(p.has_whatsapp_premium)) && perfil) {
      empresaId = perfil.empresa_id || perfil.compania_id
    }
    if (!empresaId && perfil) {
      const companyId = perfil.empresa_id || perfil.compania_id
      if (companyId) {
        const { data: perfilesCompania } = await admin
          .from('perfiles')
          .select('id, has_whatsapp_premium')
          .or(`empresa_id.eq.${companyId},compania_id.eq.${companyId}`)
        if ((perfilesCompania ?? []).some((p) => isPremium(p.has_whatsapp_premium))) empresaId = companyId
      }
    }
    if (!empresaId) {
      return NextResponse.json(
        { error: 'Se requiere suscripción activa de notificaciones para comprar extensiones.' },
        { status: 403 }
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
              name: 'Paquete de Extensión de 200 Notificaciones',
              description: `Suma ${CREDITOS_PAQUETE_EXTENSION} créditos a tu balance actual para continuar enviando recibos y recordatorios.`,
            },
            unit_amount: PRECIO_EXTENSION_USD * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/recordatorios?extension_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/recordatorios?extension_canceled=true`,
      customer_email: finalUser.email || undefined,
      client_reference_id: finalUser.id,
      metadata: {
        userId: finalUser.id,
        empresaId,
        productType: 'whatsapp_extension_200',
        creditos: String(CREDITOS_PAQUETE_EXTENSION),
        montoUsd: String(PRECIO_EXTENSION_USD),
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al crear sesión de checkout'
    console.error('Error create-checkout-whatsapp-extension:', error)
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}
