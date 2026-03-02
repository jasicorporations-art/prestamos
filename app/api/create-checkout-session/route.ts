import { NextRequest, NextResponse } from 'next/server'
import { getStripeInstance } from '@/lib/stripe'
import { PLANES, type PlanType } from '@/lib/config/planes'
import { getUserFromRequest } from '@/lib/supabase-server'

// Marcar como dinámico para poder leer cookies
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Acepta sesión por cookies o por Authorization: Bearer <token> (sesión en localStorage).
 */
export async function POST(request: NextRequest) {
  try {
    const finalUser = await getUserFromRequest(request)
    if (!finalUser) {
      return NextResponse.json(
        { error: 'No autenticado. Por favor, inicia sesión para continuar.' },
        { status: 401 }
      )
    }

    const { planType } = await request.json()

    if (!planType || !['INICIAL', 'BRONCE', 'PLATA', 'ORO', 'INFINITO'].includes(planType)) {
      return NextResponse.json(
        { error: 'Plan inválido' },
        { status: 400 }
      )
    }

    const plan = PLANES[planType as PlanType]
    const userEmail = finalUser.email

    // Obtener instancia de Stripe
    const stripe = getStripeInstance()

    // Determinar si es pago único o suscripción
    const isOneTimePayment = plan.periodo === 'pago_unico'
    
    // Crear sesión de checkout en Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: plan.nombre,
              description: plan.descripcion,
            },
            ...(isOneTimePayment
              ? {
                  // Pago único
                  unit_amount: Math.round(plan.precio * 100), // Convertir a centavos
                }
              : {
                  // Suscripción recurrente
                  recurring: {
                    interval: plan.periodo === 'mes' ? 'month' : 'year',
                  },
                  unit_amount: Math.round(plan.precio * 100), // Convertir a centavos
                }),
          },
          quantity: 1,
        },
      ],
      mode: isOneTimePayment ? 'payment' : 'subscription',
      success_url: `${request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/precios?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/precios?canceled=true`,
      customer_email: userEmail,
      metadata: {
        userId: finalUser.id,
        planType: planType,
        userEmail: userEmail || '',
        isLifetime: isOneTimePayment ? 'true' : 'false',
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error('Error creando sesión de checkout:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear sesión de checkout' },
      { status: 500 }
    )
  }
}
