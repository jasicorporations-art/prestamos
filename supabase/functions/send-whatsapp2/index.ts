import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Twilio WhatsApp - Secrets en Supabase Edge Functions
// Acepta TWILIO_SID o TWILIO_ACCOUNT_SID; TWILIO_TOKEN o TWILIO_AUTH_TOKEN (Account SID empieza con AC...)
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_SID') || Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_TOKEN') || Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_NUMBER')
// Plantilla aprobada para recibos (fuera de ventana 24h). 7 variables: {{1}} nombre, {{2}} monto, {{3}} fecha, {{4}} nº cuota, {{5}} cuotas restantes, {{6}} saldo, {{7}} empresa.
const TWILIO_CONTENT_SID_RECIBO = Deno.env.get('TWILIO_CONTENT_SID_RECIBO') || 'HXce0778ab92c607435c52876cb3ccfa2e'
const TWILIO_CONTENT_SID_RECORDATORIO = Deno.env.get('TWILIO_CONTENT_SID_RECORDATORIO')
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID')

interface WhatsAppPayloadRecordatorio {
  tipo?: 'recordatorio'
  telefono_cliente: string
  nombre_cliente: string
  monto_cuota: number
  fecha_vencimiento?: string
  nombre_empresa?: string
  link_pago?: string
}

interface WhatsAppPayloadRecibo {
  tipo: 'recibo'
  telefono_cliente: string
  nombre_cliente: string
  monto_cobrado: number
  fecha: string
  balance_restante: number
  numero_cuota?: number
  cuotas_restantes?: number
  nombre_empresa?: string
}

interface WhatsAppPayloadAmortizacion {
  tipo: 'amortizacion'
  telefono_cliente: string
  nombre_cliente: string
  venta_id: string
  nombre_empresa?: string
  link_amortizacion?: string
}

type WhatsAppPayload = WhatsAppPayloadRecordatorio | WhatsAppPayloadRecibo | WhatsAppPayloadAmortizacion

function formatTelefono(telefono: string): string {
  const digits = String(telefono || '').replace(/\s/g, '').replace(/\D/g, '')
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

/** Sanitiza un valor para ContentVariables: Twilio no acepta null ni string vacío; máx 1600 chars. */
function sanitizeContentVar(value: unknown): string {
  if (value == null) return '—'
  const s = String(value).trim()
  if (s.length === 0) return '—'
  return s.slice(0, 1600)
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
        JSON.stringify({
          error: 'Twilio no configurado. En Supabase Edge Functions Secrets agrega: TWILIO_SID (o TWILIO_ACCOUNT_SID), TWILIO_TOKEN (o TWILIO_AUTH_TOKEN), TWILIO_NUMBER. Account SID empieza con AC...',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body: WhatsAppPayload = await req.json()

    if (body.tipo === 'recibo' && !TWILIO_MESSAGING_SERVICE_SID) {
      return new Response(
        JSON.stringify({ error: 'Para enviar recibos por WhatsApp se requiere TWILIO_MESSAGING_SERVICE_SID en Edge Functions Secrets.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { telefono_cliente, nombre_cliente } = body
    if (!telefono_cliente || !nombre_cliente) {
      return new Response(
        JSON.stringify({ error: 'Faltan telefono_cliente o nombre_cliente' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let mensaje: string | null = null
    if (body.tipo !== 'recibo' && body.tipo !== 'amortizacion' && !TWILIO_CONTENT_SID_RECORDATORIO) {
      const { monto_cuota, link_pago } = body
      const montoFormateado = typeof monto_cuota === 'number'
        ? monto_cuota.toLocaleString('es-DO', { minimumFractionDigits: 2 })
        : String(monto_cuota || '0')
      mensaje = `Hola ${nombre_cliente}, te recordamos que tu cuota de $${montoFormateado} en Jasi Corporations vence pronto. Evita cargos por mora.`
      if (link_pago) mensaje += `\n\nPaga aquí: ${link_pago}`
    }

    const toNumber = formatTelefono(telefono_cliente)
    const toWhatsApp = `whatsapp:+${toNumber}`

    const form = new URLSearchParams()
    form.append('To', toWhatsApp)

    if (body.tipo === 'recibo') {
      const CONTENT_SID_RECIBO = TWILIO_CONTENT_SID_RECIBO

      const fechaFormateada = formatFecha(body.fecha || new Date().toISOString())
      const montoFormateado = typeof body.monto_cobrado === 'number'
        ? `RD$${body.monto_cobrado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
        : `RD$${String(body.monto_cobrado ?? '0')}`
      const balanceFormateado = typeof body.balance_restante === 'number'
        ? `RD$${body.balance_restante.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
        : `RD$${String(body.balance_restante ?? '0')}`
      const nombreEmpresa = (body.nombre_empresa && body.nombre_empresa.trim())
        ? body.nombre_empresa.trim()
        : 'Tu financiera'

      const contentVariables: Record<string, string> = {
        '1': sanitizeContentVar(nombre_cliente || 'Cliente'),
        '2': sanitizeContentVar(montoFormateado),
        '3': sanitizeContentVar(fechaFormateada),
        '4': sanitizeContentVar(body.numero_cuota != null && body.numero_cuota !== '' ? String(body.numero_cuota) : '0'),
        '5': sanitizeContentVar(body.cuotas_restantes != null && body.cuotas_restantes !== '' ? String(body.cuotas_restantes) : '0'),
        '6': sanitizeContentVar(balanceFormateado),
        '7': sanitizeContentVar(nombreEmpresa),
      }

      form.append('ContentSid', CONTENT_SID_RECIBO)
      form.append('ContentVariables', JSON.stringify(contentVariables))

      if (TWILIO_MESSAGING_SERVICE_SID) {
        form.append('MessagingServiceSid', TWILIO_MESSAGING_SERVICE_SID)
      }
      if (TWILIO_WHATSAPP_NUMBER) {
        const fromDigits = String(TWILIO_WHATSAPP_NUMBER).replace(/\s/g, '').replace(/\D/g, '')
        if (fromDigits.length >= 10) {
          const fromNum = fromDigits.length === 10 && !fromDigits.startsWith('1') ? '1' + fromDigits : fromDigits
          form.append('From', `whatsapp:+${fromNum}`)
        }
      }
    } else if (body.tipo === 'amortizacion') {
      const CONTENT_SID_AMORTIZACION = 'HX08d0f00a7421a2188c5219054d83dc29'
      const nombreEmpresa = (body.nombre_empresa && body.nombre_empresa.trim())
        ? body.nombre_empresa.trim()
        : 'Jasi LLC'
      const contentVariables = {
        '1': String(nombre_cliente || 'Cliente'),
        '2': body.link_amortizacion || 'Ver en web',
        '3': nombreEmpresa,
      }
      form.append('ContentSid', CONTENT_SID_AMORTIZACION)
      form.append('ContentVariables', JSON.stringify(contentVariables))
      if (TWILIO_MESSAGING_SERVICE_SID) {
        form.append('MessagingServiceSid', TWILIO_MESSAGING_SERVICE_SID)
      }
    } else if (body.tipo === 'recordatorio' && TWILIO_CONTENT_SID_RECORDATORIO && TWILIO_MESSAGING_SERVICE_SID) {
      const fechaVenc = body.fecha_vencimiento ? formatFecha(body.fecha_vencimiento) : '—'
      const montoFormateado = typeof body.monto_cuota === 'number'
        ? `RD$${body.monto_cuota.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
        : `RD$${String(body.monto_cuota ?? '0')}`
      const nombreEmpresa = (body.nombre_empresa && body.nombre_empresa.trim())
        ? body.nombre_empresa.trim()
        : 'Jasi Corporations'
      const contentVariables = {
        '1': String(nombre_cliente || 'Cliente'),
        '2': montoFormateado,
        '3': fechaVenc,
        '4': nombreEmpresa,
      }
      form.append('ContentSid', TWILIO_CONTENT_SID_RECORDATORIO)
      form.append('ContentVariables', JSON.stringify(contentVariables))
      form.append('MessagingServiceSid', TWILIO_MESSAGING_SERVICE_SID)
    } else {
      const fromNum = formatTelefono(TWILIO_WHATSAPP_NUMBER)
      const fromWhatsApp = TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
        ? TWILIO_WHATSAPP_NUMBER
        : `whatsapp:+${fromNum}`
      form.append('From', fromWhatsApp)
      form.append('Body', mensaje || `Hola ${nombre_cliente}, tienes una cuota pendiente.`)
    }

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

    const twilioData = await twilioRes.json().catch(() => ({}))

    if (!twilioRes.ok) {
      const twilioMsg = twilioData?.message || twilioData?.error_message || twilioData?.more_info
      const twilioCode = twilioData?.code != null ? twilioData.code : ''
      const errorText = [twilioCode, twilioMsg].filter(Boolean).join(': ') || JSON.stringify(twilioData)
      return new Response(
        JSON.stringify({ error: errorText || 'Error Twilio', details: twilioData }),
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
