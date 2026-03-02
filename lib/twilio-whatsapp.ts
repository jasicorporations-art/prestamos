/**
 * Envío de WhatsApp vía Supabase Edge Function send-whatsapp2.
 * La Edge Function hace fetch REST a la API de Twilio (Content Template o Body).
 */

export type PayloadAmortizacion = {
  tipo: 'amortizacion'
  telefono_cliente: string
  nombre_cliente: string
  venta_id: string
  nombre_empresa?: string
  link_amortizacion?: string
}

export type PayloadRecibo = {
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

export type PayloadRecordatorio = {
  tipo: 'recordatorio'
  telefono_cliente: string
  nombre_cliente: string
  monto_cuota: number
  fecha_vencimiento: string
  nombre_empresa?: string
}

export type PayloadWhatsApp = PayloadAmortizacion | PayloadRecibo | PayloadRecordatorio

/**
 * Llama a la Edge Function send-whatsapp2 de Supabase para enviar el mensaje WhatsApp.
 * @returns { sid: string } en éxito
 * @throws Error si la Edge Function o Twilio devuelve error
 */
export async function enviarWhatsAppViaEdgeFunction(
  payload: PayloadWhatsApp
): Promise<{ sid: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  }

  const url = `${supabaseUrl}/functions/v1/send-whatsapp2`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  let data: { sid?: string; error?: string; details?: string } = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(text || `Error ${res.status}`)
  }

  if (!res.ok) {
    let msg = data.error || res.statusText || 'Error enviando WhatsApp'
    if (data.details && typeof data.details === 'object' && (data.details as any).message) {
      msg = (data.details as any).message
      if ((data.details as any).code != null) msg = `${(data.details as any).code}: ${msg}`
    } else if (data.details && typeof data.details === 'string') {
      msg = data.details
    }
    throw new Error(msg)
  }
  if (!data.sid && !(data as any).success) {
    throw new Error(data.error || 'La Edge Function no devolvió sid')
  }
  const sid = data.sid ?? (data as any).sid
  if (!sid) throw new Error('La Edge Function no devolvió sid')
  return { sid }
}
