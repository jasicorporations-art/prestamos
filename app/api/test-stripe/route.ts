import { NextRequest, NextResponse } from 'next/server'
import { getStripeInstance } from '@/lib/stripe'

/**
 * Endpoint de prueba para verificar la configuración de Stripe
 * GET /api/test-stripe
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar variables de entorno
    const checks = {
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
      NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
    }

    // Intentar crear instancia de Stripe
    let stripeInstance = null
    let stripeError = null
    try {
      stripeInstance = getStripeInstance()
    } catch (error: any) {
      stripeError = error.message
    }

    // Verificar formato de claves
    const secretKeyFormat = process.env.STRIPE_SECRET_KEY?.startsWith('sk_') || false
    const publishableKeyFormat = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_') || false
    const webhookSecretFormat = process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_') || false

    const status = {
      environment: process.env.NODE_ENV,
      checks: {
        ...checks,
        secretKeyFormat,
        publishableKeyFormat,
        webhookSecretFormat,
      },
      stripeInstance: !!stripeInstance,
      stripeError,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      webhookUrl: process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/stripe` 
        : 'No configurada',
    }

    const allChecksPass = 
      checks.STRIPE_SECRET_KEY &&
      checks.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
      checks.STRIPE_WEBHOOK_SECRET &&
      checks.NEXT_PUBLIC_APP_URL &&
      secretKeyFormat &&
      publishableKeyFormat &&
      webhookSecretFormat &&
      !!stripeInstance

    return NextResponse.json({
      success: allChecksPass,
      message: allChecksPass 
        ? '✅ Todas las configuraciones de Stripe están correctas' 
        : '⚠️ Algunas configuraciones faltan o son incorrectas',
      status,
      instructions: {
        nextSteps: allChecksPass 
          ? [
              '1. Verifica que el webhook esté configurado en Stripe Dashboard',
              '2. Prueba hacer un checkout en /precios',
              '3. Verifica los eventos del webhook en Stripe Dashboard',
            ]
          : [
              '1. Verifica que todas las variables estén configuradas en Vercel',
              '2. Asegúrate de que los formatos de las claves sean correctos',
              '3. Redesplega la aplicación después de agregar las variables',
            ],
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: 'Error al verificar configuración de Stripe',
      },
      { status: 500 }
    )
  }
}

