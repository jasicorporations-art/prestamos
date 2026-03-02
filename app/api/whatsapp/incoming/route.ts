import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Webhook de WhatsApp para mensajes entrantes (Twilio).
 * Cuando un cliente escribe, responde con mensaje automático.
 *
 * Configura en Twilio Console:
 * - WhatsApp Senders → Tu número → When a message comes in: POST https://tu-dominio.com/api/whatsapp/incoming
 */

/** GET: Solo para verificar que el endpoint existe (al abrir en navegador) */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Webhook WhatsApp activo. Twilio debe enviar POST, no GET.',
    endpoint: '/api/whatsapp/incoming',
  })
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let body: Record<string, string>

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text()
      body = Object.fromEntries(new URLSearchParams(text))
    } else {
      body = (await request.json()) as Record<string, string>
    }

    const fromRaw = body.From || body.from
    const messageBody = body.Body || body.body || ''

    if (!fromRaw) {
      return new NextResponse('Missing From', { status: 400 })
    }

    // From viene como "whatsapp:+18091234567" - extraer número
    const fromNumber = fromRaw.replace(/^whatsapp:/i, '').replace(/\D/g, '')
    const toReply = fromNumber.startsWith('1') && fromNumber.length === 11
      ? fromNumber
      : '1' + fromNumber

    // Buscar cliente por celular para obtener nombre de empresa
    let nombreEmpresa = 'JasiCorporations'
    const admin = getSupabaseAdmin()

    const celularVariantes = [
      toReply,
      '+' + toReply,
      toReply.replace(/^1/, ''),
      '809' + toReply.slice(-7),
      '829' + toReply.slice(-7),
      '849' + toReply.slice(-7),
    ]
    const orClause = celularVariantes.map((c) => `celular.eq.${c}`).join(',')

    const { data: clientes } = await admin
      .from('clientes')
      .select('id')
      .or(orClause)
      .limit(1)

    if (clientes && clientes.length > 0) {
      const clienteId = clientes[0].id
      const { data: venta } = await admin
        .from('ventas')
        .select('empresa_id, compania_id')
        .eq('cliente_id', clienteId)
        .eq('status', 'active')
        .limit(1)
        .single()

      if (venta?.empresa_id) {
        const { data: emp } = await admin
          .from('empresas')
          .select('nombre')
          .eq('id', venta.empresa_id)
          .single()
        if (emp?.nombre) nombreEmpresa = emp.nombre
      } else if (venta?.compania_id && typeof venta.compania_id === 'string') {
        const { data: emp } = await admin
          .from('empresas')
          .select('nombre')
          .eq('id', venta.compania_id)
          .single()
        if (emp?.nombre) nombreEmpresa = emp.nombre
      }
    }

    const mensajeRespuesta = `Gracias por contactar a nombre de ${nombreEmpresa}. Este es un servicio automático de recibos.`

    const twilioSid = process.env.TWILIO_SID || process.env.TWILIO_ACCOUNT_SID
    const twilioToken = process.env.TWILIO_TOKEN || process.env.TWILIO_AUTH_TOKEN
    const twilioNumber = process.env.TWILIO_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER

    if (!twilioSid || !twilioToken || !twilioNumber) {
      console.warn('WhatsApp incoming: Twilio no configurado en Vercel. Respuesta no enviada.')
      return new NextResponse(null, { status: 200 })
    }

    const fromWhatsApp = twilioNumber.startsWith('whatsapp:')
      ? twilioNumber
      : `whatsapp:${twilioNumber}`
    const toWhatsApp = `whatsapp:+${toReply}`

    const form = new URLSearchParams()
    form.append('To', toWhatsApp)
    form.append('From', fromWhatsApp)
    form.append('Body', mensajeRespuesta)

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
    const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')

    await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: form.toString(),
    })
  } catch (err) {
    console.error('Error webhook WhatsApp incoming:', err)
  }

  return new NextResponse(null, { status: 200 })
}
