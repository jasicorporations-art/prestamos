import Stripe from 'stripe'

// Crear instancia de Stripe solo si la clave está disponible
// Esto evita errores durante el build cuando las variables no están configuradas
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  : null

// Función helper para obtener stripe o lanzar error
export function getStripeInstance(): Stripe {
  if (!stripe) {
    throw new Error('STRIPE_SECRET_KEY no está configurada. Por favor, configura esta variable de entorno en Vercel.')
  }
  return stripe
}

