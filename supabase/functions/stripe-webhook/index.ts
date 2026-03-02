import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-11-20',
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método no permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET no configurada')
    return new Response(
      JSON.stringify({ error: 'Webhook secret no configurada' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'Falta la firma stripe-signature' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let body: string
  try {
    body = await req.text()
  } catch (e) {
    console.error('Error leyendo body:', e)
    return new Response(
      JSON.stringify({ error: 'Error leyendo body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET,
      undefined,
      cryptoProvider
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error verificando firma'
    console.error('Error verificando webhook Stripe:', msg)
    return new Response(
      JSON.stringify({ error: `Webhook inválido: ${msg}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response(
      JSON.stringify({ received: true, event: event.type }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const session = event.data.object as Stripe.Checkout.Session
  const productType = session.metadata?.productType || session.metadata?.tipo

  if (productType !== 'whatsapp_premium') {
    return new Response(
      JSON.stringify({ received: true, skipped: 'otro producto' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let userId: string | null = null

  if (session.client_reference_id) {
    userId = session.client_reference_id
  } else if (session.metadata?.userId) {
    userId = session.metadata.userId
  } else if (session.customer_email) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data } = await supabase.auth.admin.listUsers({ perPage: 500 })
    const user = data?.users?.find((u) => u.email === session.customer_email)
    if (user) userId = user.id
  }

  if (!userId) {
    console.error('No se pudo identificar usuario en checkout.session', {
      client_reference_id: session.client_reference_id,
      metadata: session.metadata,
      customer_email: session.customer_email,
    })
    return new Response(
      JSON.stringify({ error: 'Usuario no identificado' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const premiumUntil = new Date()
  premiumUntil.setDate(premiumUntil.getDate() + 30)
  const premiumUntilStr = premiumUntil.toISOString().split('T')[0]

  const { error } = await supabase
    .from('perfiles')
    .update({
      has_whatsapp_premium: true,
      premium_until: premiumUntilStr,
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Error actualizando perfil:', error)
    return new Response(
      JSON.stringify({ error: 'Error actualizando perfil' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`WhatsApp Premium activado para user_id=${userId}, premium_until=${premiumUntilStr}`)
  return new Response(
    JSON.stringify({ received: true, updated: userId }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
