import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { createClientFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { actividadService } from '@/lib/services/actividad'
import { normalizarE164 } from '@/lib/utils/telefonoE164'
import { sendText } from '@/lib/evolution-railway'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BASE_URL_DOCUMENTOS = process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'https://prestamos.jasicorporations.com'

/**
 * Envía notificación de amortización por WhatsApp vía Evolution API (Railway).
 * Solo envía si empresas.whatsapp_enabled es true y cliente tiene teléfono válido.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado', enviado: false }, { status: 401 })
    }

    const body = await request.json()
    const ventaId = body.venta_id as string
    if (!ventaId) {
      return NextResponse.json({ error: 'Falta venta_id', enviado: false }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data: venta, error: ventaError } = await admin
      .from('ventas')
      .select(`
        id,
        empresa_id,
        compania_id,
        monto_total,
        cliente:clientes(id, nombre_completo, celular, whatsapp_activo)
      `)
      .eq('id', ventaId)
      .single()

    if (ventaError || !venta) {
      return NextResponse.json({ error: 'Venta no encontrada', enviado: false }, { status: 404 })
    }

    const empresaId = venta.empresa_id || venta.compania_id
    const { data: emp } = await admin.from('empresas').select('whatsapp_enabled').eq('id', empresaId).maybeSingle()
    if (!(emp as { whatsapp_enabled?: boolean } | null)?.whatsapp_enabled) {
      return NextResponse.json({
        error: 'Activa WhatsApp ($20) en Conexión WhatsApp para enviar la tabla de amortización.',
        enviado: false,
      }, { status: 403 })
    }

    const cliente = (venta as any).cliente
    const whatsappActivo = (cliente?.whatsapp_activo ?? true)
    if (whatsappActivo !== true) {
      return NextResponse.json({
        enviado: false,
        mensaje: 'Cliente no tiene WhatsApp activo.',
      })
    }

    const celular = cliente?.celular?.trim()
    const telefonoE164 = normalizarE164(celular)
    if (!telefonoE164) {
      return NextResponse.json({
        enviado: false,
        mensaje: 'Cliente sin teléfono válido (E.164).',
      })
    }

    const nombreCliente = cliente?.nombre_completo || 'Cliente'
    let nombreCompania = 'JASICORPORATIONS'
    const { data: empNombre } = await admin.from('empresas').select('nombre').eq('id', empresaId).maybeSingle()
    if (empNombre?.nombre) nombreCompania = String(empNombre.nombre)
    const enlacePdf = `${BASE_URL_DOCUMENTOS}/documentos/amortizacion-${ventaId}.pdf`
    const monto = Number((venta as any).monto_total ?? 0)
    const texto = `Hola ${nombreCliente}, tu préstamo en ${nombreCompania} ha sido registrado.\n\n📋 Tabla de amortización: ${enlacePdf}\n\nMonto total: $${monto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}.`

    const result = await sendText(admin, empresaId, telefonoE164, texto)
    if (!result.ok) {
      console.error('[enviar-amortizacion-whatsapp] Evolution:', result.error)
      return NextResponse.json({ enviado: false, error: result.error }, { status: 502 })
    }

    const supabase = createClientFromRequest(request)
    await actividadService.registrarActividadDesdeServidor(
      supabase,
      'Envio amortizacion por WhatsApp',
      `Enviado a ${telefonoE164}`,
      'prestamo',
      ventaId
    )

    return NextResponse.json({ enviado: true })
  } catch (err) {
    console.error('[enviar-amortizacion-whatsapp] Error:', err)
    const msg = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json(
      { error: msg, enviado: false },
      { status: 500 }
    )
  }
}
