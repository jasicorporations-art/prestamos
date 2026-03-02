import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_TOKEN')
const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_NUMBER')

interface WhatsAppPayloadRecordatorio {
  tipo?: 'recordatorio'
  telefono_cliente: string
  nombre_cliente: string
  monto_cuota: number
  link_pago?: string
}

interface WhatsAppPayloadRecibo {
  tipo: 'recibo'
  telefono_cliente: string
  nombre_cliente: string
  monto_cobrado: number
  fecha: string
  balance_restante: number
}

type WhatsAppPayload = WhatsAppPayloadRecordatorio | WhatsAppPayloadRecibo

function formatTelefono(telefono: string): string {
  const digits = telefono.replace(/\D/g, '')
  if (digits.startsWith('1') && digits.length === 11) return digits
  if (digits.length === 10) return '1' + digits
  return digits
}

function formatFecha(fecha: string): string {
  try {
    const d = new Date(fecha)
    return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return fecha
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método no permitido' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      return new Response(
        JSON.stringify({ error: 'Twilio no configurado. Verifica TWILIO_SID, TWILIO_TOKEN y TWILIO_NUMBER.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body: WhatsAppPayload = await req.json()
    const { telefono_cliente, nombre_cliente } = body

    if (!telefono_cliente || !nombre_cliente) {
      return new Response(
        JSON.stringify({ error: 'Faltan telefono_cliente o nombre_cliente' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let mensaje: string
    if (body.tipo === 'recibo') {
      const montoCobrado = typeof body.monto_cobrado === 'number'
        ? body.monto_cobrado.toLocaleString('es-DO', { minimumFractionDigits: 2 })
        : String(body.monto_cobrado || '0')
      const balance = typeof body.balance_restante === 'number'
        ? body.balance_restante.toLocaleString('es-DO', { minimumFractionDigits: 2 })
        : String(body.balance_restante || '0')
      const fecha = formatFecha(body.fecha || new Date().toISOString())
      mensaje = `✅ ¡Hola ${nombre_cliente}! Confirmamos tu pago de RD$${montoCobrado} realizado el ${fecha}. Tu balance restante es RD$${balance}. Gracias por tu puntualidad. Jasicorporations.`
    } else {
      const { monto_cuota, link_pago } = body
      const montoFormateado = typeof monto_cuota === 'number'
        ? monto_cuota.toLocaleString('es-DO', { minimumFractionDigits: 2 })
        : String(monto_cuota || '0')
      mensaje = `Hola ${nombre_cliente}, te recordamos que tu cuota de $${montoFormateado} en Jasi Corporations vence pronto. Evita cargos por mora.`
      if (link_pago) {
        mensaje += `\n\nPaga aquí: ${link_pago}`
      }
    }

    const toNumber = formatTelefono(telefono_cliente)
    const toWhatsApp = `whatsapp:+${toNumber}`
    const fromWhatsApp = TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
      ? TWILIO_WHATSAPP_NUMBER
      : `whatsapp:${TWILIO_WHATSAPP_NUMBER}`

    const form = new URLSearchParams()
    form.append('To', toWhatsApp)
    form.append('From', fromWhatsApp)
    form.append('Body', mensaje)

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
      },
      body: form.toString(),
    })

    const twilioData = await twilioRes.json()

    if (!twilioRes.ok) {
      return new Response(
        JSON.stringify({ error: 'Error Twilio', details: twilioData }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, sid: twilioData.sid }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return new Response(
      JSON.stringify({ error: 'Error enviando WhatsApp', details: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
