import { NextRequest, NextResponse } from 'next/server'
import { getStripeInstance } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { agregarCreditosExtension, COSTO_TWILIO_POR_MENSAJE } from '@/lib/services/whatsapp-consumo'
import Stripe from 'stripe'

// Deshabilitar el parsing del body para webhooks de Stripe
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Webhook de Stripe activo. Solo acepta POST desde Stripe.',
  })
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET no está configurada')
    return NextResponse.json(
      { error: 'Webhook secret no configurada' },
      { status: 500 }
    )
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Falta la firma de Stripe' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    const stripe = getStripeInstance()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Error verificando webhook de Stripe:', err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  try {
    // Manejar diferentes tipos de eventos
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const productType = session.metadata?.productType || session.metadata?.tipo

        // Paquete Extensión 200 créditos
        if (productType === 'whatsapp_extension_200') {
          const empresaId = session.metadata?.empresaId
          const creditos = parseInt(session.metadata?.creditos || '200', 10)
          const montoUsd = parseFloat(session.metadata?.montoUsd || '10')
          const costoProveedor = creditos * COSTO_TWILIO_POR_MENSAJE
          if (empresaId) {
            try {
              await agregarCreditosExtension(
                empresaId,
                creditos,
                session.id,
                montoUsd,
                costoProveedor
              )
              console.log(`✅ Extensión ${creditos} créditos agregada para empresa ${empresaId}`)
            } catch (e) {
              console.error('Error agregando créditos extensión:', e)
            }
          }
          break
        }

        // WhatsApp Premium ($30/mes)
        if (productType === 'whatsapp_premium') {
          const userId =
            session.client_reference_id ||
            session.metadata?.userId ||
            null
          let resolvedUserId = userId
          if (!resolvedUserId && session.customer_email) {
            const { data: { users } } = await getSupabaseAdmin().auth.admin.listUsers({ perPage: 1000 })
            const user = users?.find((u) => u.email === session.customer_email)
            resolvedUserId = user?.id ?? null
          }
          const today = new Date()
          const premiumUntil = new Date(today)
          premiumUntil.setDate(premiumUntil.getDate() + 30)
          const premiumUntilStr = premiumUntil.toISOString().split('T')[0]
          const updatePayload = { has_whatsapp_premium: true, premium_until: premiumUntilStr }
          const admin = getSupabaseAdmin()

          if (resolvedUserId) {
            const { error: perfError } = await admin
              .from('perfiles')
              .update(updatePayload)
              .eq('user_id', resolvedUserId)
            if (perfError) {
              console.error('Error actualizando perfil WhatsApp Premium por user_id:', perfError)
            } else {
              console.log(`WhatsApp Premium activado para user_id=${resolvedUserId}`)
            }
          }
          if (session.customer_email?.trim()) {
            const { error: emailError } = await admin
              .from('perfiles')
              .update(updatePayload)
              .eq('email', session.customer_email.trim())
            if (emailError) {
              console.error('Error actualizando perfil WhatsApp Premium por email:', emailError)
            } else {
              console.log(`WhatsApp Premium actualizado por email=${session.customer_email}`)
            }
          }
          break
        }

        // WhatsApp Evolution ($30/30 días) - sistema Evolution API
        if (productType === 'whatsapp_evolution') {
          const userId =
            session.client_reference_id ||
            session.metadata?.userId ||
            null
          let resolvedUserId = userId
          if (!resolvedUserId && session.customer_email) {
            const { data: { users } } = await getSupabaseAdmin().auth.admin.listUsers({ perPage: 1000 })
            const user = users?.find((u) => u.email === session.customer_email)
            resolvedUserId = user?.id ?? null
          }
          const today = new Date()
          const premiumUntil = new Date(today)
          premiumUntil.setDate(premiumUntil.getDate() + 30)
          const premiumUntilStr = premiumUntil.toISOString().split('T')[0]
          const updatePayload = { has_evolution_whatsapp: true, premium_until_evolution: premiumUntilStr }
          const admin = getSupabaseAdmin()

          if (resolvedUserId) {
            const { error: perfError } = await admin
              .from('perfiles')
              .update(updatePayload)
              .eq('user_id', resolvedUserId)
            if (perfError) {
              console.error('Error actualizando perfil WhatsApp Evolution por user_id:', perfError)
            } else {
              console.log(`WhatsApp Evolution activado para user_id=${resolvedUserId}`)
            }
          }
          if (session.customer_email?.trim()) {
            const { error: emailError } = await admin
              .from('perfiles')
              .update(updatePayload)
              .eq('email', session.customer_email.trim())
            if (emailError) {
              console.error('Error actualizando perfil WhatsApp Evolution por email:', emailError)
            } else {
              console.log(`WhatsApp Evolution actualizado por email=${session.customer_email}`)
            }
          }
          break
        }

        // Suscripciones de planes
        const userId = session.metadata?.userId
        const planType = session.metadata?.planType as string
        const isLifetime = session.metadata?.isLifetime === 'true'
        
        if (userId && planType) {
          const supabaseAdmin = getSupabaseAdmin()
          
          // Preparar metadata del usuario
          const userMetadata: any = {
            planType: planType,
            isActive: true,
          }
          
          // Si es plan INFINITO (pago único), establecer expires_at a 100 años en el futuro
          if (isLifetime || planType === 'INFINITO') {
            const expirationDate = new Date('2125-01-01')
            userMetadata.expires_at = expirationDate.toISOString().split('T')[0]
            userMetadata.isLifetime = true
            console.log(`✅ Plan Infinito activado para usuario ${userId}, expira: ${userMetadata.expires_at}`)
          } else {
            // Para suscripciones normales, guardar customerId y subscriptionId
            userMetadata.stripeCustomerId = session.customer
            userMetadata.subscriptionId = session.subscription
          }
          
          // Actualizar usuario
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { user_metadata: userMetadata }
          )

          if (updateError) {
            console.error('Error actualizando usuario:', updateError)
            // Continuar aunque haya error para no fallar el webhook
          } else {
            console.log(`✅ Suscripción activada para usuario ${userId}, plan: ${planType}`)
          }
        }
        break
      }
      
      case 'payment_intent.succeeded': {
        // Manejar pagos únicos (Plan Infinito)
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Buscar el checkout session relacionado
        if (paymentIntent.metadata?.userId && paymentIntent.metadata?.planType === 'INFINITO') {
          const userId = paymentIntent.metadata.userId
          const supabaseAdmin = getSupabaseAdmin()
          
          const expirationDate = new Date('2125-01-01')
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            {
              user_metadata: {
                planType: 'INFINITO',
                isActive: true,
                expires_at: expirationDate.toISOString().split('T')[0],
                isLifetime: true,
                stripePaymentIntentId: paymentIntent.id,
              },
            }
          )

          if (updateError) {
            console.error('Error actualizando usuario con plan Infinito:', updateError)
          } else {
            console.log(`✅ Plan Infinito activado para usuario ${userId} (pago único)`)
          }
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const isActive = subscription.status === 'active' || subscription.status === 'trialing'
        
        console.log(`📊 Suscripción ${subscription.status} para customer ${customerId}`)
        
        // Buscar usuario por customerId en metadata
        try {
          const supabaseAdmin = getSupabaseAdmin()
          const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
          
          if (!listError && users) {
            // Buscar usuario que tenga este customerId en metadata
            const userWithCustomer = users.find(
              (user) => user.user_metadata?.stripeCustomerId === customerId
            )
            
            if (userWithCustomer) {
              // Actualizar estado de suscripción
              const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                userWithCustomer.id,
                {
                  user_metadata: {
                    ...userWithCustomer.user_metadata,
                    isActive: isActive,
                    subscriptionId: subscription.id,
                  },
                }
              )
              
              if (updateError) {
                console.error('Error actualizando suscripción:', updateError)
              } else {
                console.log(`✅ Suscripción ${isActive ? 'activada' : 'desactivada'} para usuario ${userWithCustomer.id}`)
              }
            } else {
              console.warn(`⚠️ No se encontró usuario con customerId ${customerId}`)
            }
          }
        } catch (error) {
          console.error('Error buscando usuario por customerId:', error)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        
        console.log(`✅ Pago exitoso para customer ${customerId}`)
        
        // Si la suscripción está activa, asegurar que isActive = true
        // Esto se maneja mejor con el evento subscription.updated
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        
        console.log(`❌ Pago fallido para customer ${customerId}`)
        
        // Buscar usuario por customerId en metadata
        try {
          const supabaseAdmin = getSupabaseAdmin()
          const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
          
          if (!listError && users) {
            // Buscar usuario que tenga este customerId en metadata
            const userWithCustomer = users.find(
              (user) => user.user_metadata?.stripeCustomerId === customerId
            )
            
            if (userWithCustomer) {
              // Desactivar suscripción
              const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                userWithCustomer.id,
                {
                  user_metadata: {
                    ...userWithCustomer.user_metadata,
                    isActive: false,
                  },
                }
              )
              
              if (updateError) {
                console.error('Error desactivando suscripción:', updateError)
              } else {
                console.log(`❌ Suscripción desactivada para usuario ${userWithCustomer.id} por pago fallido`)
              }
            } else {
              console.warn(`⚠️ No se encontró usuario con customerId ${customerId}`)
            }
          }
        } catch (error) {
          console.error('Error buscando usuario por customerId:', error)
        }
        break
      }

      default:
        console.log(`Evento no manejado: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error procesando webhook:', error)
    return NextResponse.json(
      { error: 'Error procesando webhook' },
      { status: 500 }
    )
  }
}

