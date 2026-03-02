import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { resend, FROM_EMAIL } from '@/lib/resend'
import PlanPagosEmail from '@/emails/PlanPagosEmail'
import { render } from '@react-email/render'
import React from 'react'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Envía correo con la tabla de amortización al crear un préstamo/financiamiento.
 * Acepta sesión por cookies o Authorization: Bearer.
 * Solo envía si el cliente tiene email válido.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado', enviado: false }, { status: 401 })
    }

    if (!resend) {
      return NextResponse.json(
        { error: 'Resend no configurado', enviado: false },
        { status: 500 }
      )
    }

    const body = await request.json()
    const ventaId = body.venta_id as string
    if (!ventaId) {
      return NextResponse.json(
        { error: 'Falta venta_id', enviado: false },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdmin()
    const { data: venta, error: ventaError } = await admin
      .from('ventas')
      .select(`
        id,
        empresa_id,
        compania_id,
        cliente:clientes(id, nombre_completo, email)
      `)
      .eq('id', ventaId)
      .single()

    if (ventaError || !venta) {
      return NextResponse.json(
        { error: 'Venta no encontrada', enviado: false },
        { status: 404 }
      )
    }

    const cliente = (venta as any).cliente
    const emailCliente = cliente?.email?.trim()
    if (!emailCliente || !emailCliente.includes('@')) {
      return NextResponse.json({
        enviado: false,
        mensaje: 'Cliente sin email válido. No se envió correo.',
      })
    }

    // Obtener cuotas detalladas (reintentar una vez si vienen vacías por race al crear la venta)
    let tablaAmortizacion: Array<{ numero_cuota: number; fecha_pago: string; cuota_fija: number; interes_mes?: number; abono_capital?: number; saldo_pendiente?: number }> = []
    for (let intento = 0; intento < 2; intento++) {
      const { data: cuotasDetalladas, error: cuotasError } = await admin
        .from('cuotas_detalladas')
        .select('numero_cuota, fecha_pago, cuota_fija, interes_mes, abono_capital, saldo_pendiente')
        .eq('venta_id', ventaId)
        .order('numero_cuota', { ascending: true })

      if (cuotasError) {
        console.error('[enviar-amortizacion-email] Error cuotas:', cuotasError)
        return NextResponse.json(
          { error: 'Error obteniendo tabla de amortización', enviado: false },
          { status: 500 }
        )
      }
      tablaAmortizacion = cuotasDetalladas || []
      if (tablaAmortizacion.length > 0) break
      if (intento === 0) await new Promise((r) => setTimeout(r, 1500))
    }

    if (tablaAmortizacion.length === 0) {
      return NextResponse.json({
        enviado: false,
        mensaje: 'No hay cuotas detalladas para esta venta. Espera unos segundos y vuelve a abrir la venta para reenviar el correo.',
      })
    }

    // Obtener nombre de la empresa y email para BCC
    const empresaId = (venta as any).empresa_id || (venta as any).compania_id
    let nombreEmpresa = 'JASICORPORATIONS'
    let emailBcc: string | undefined
    if (empresaId) {
      const { data: emp } = await admin
        .from('empresas')
        .select('nombre, email')
        .eq('id', empresaId)
        .maybeSingle()
      if (emp) {
        nombreEmpresa = emp.nombre || nombreEmpresa
        if (emp.email?.trim()?.includes('@')) {
          emailBcc = emp.email.trim()
        }
      }
    }

    const ventaIdDisplay = ventaId.slice(-6).toUpperCase()

    const emailHtml = await render(
      React.createElement(PlanPagosEmail, {
        nombreCliente: cliente?.nombre_completo || 'Cliente',
        ventaId,
        nombreEmpresa,
        tablaAmortizacion,
      })
    )

    const sendOptions: Parameters<typeof resend.emails.send>[0] = {
      from: FROM_EMAIL,
      to: emailCliente,
      subject: `Tu Plan de Pagos - Préstamo #${ventaIdDisplay}`,
      html: emailHtml,
    }
    if (emailBcc) {
      sendOptions.bcc = [emailBcc]
    }

    const { data, error } = await resend.emails.send(sendOptions)

    if (error) {
      console.error('[enviar-amortizacion-email] Error Resend:', error)
      return NextResponse.json({
        enviado: false,
        error: error.message,
      })
    }

    return NextResponse.json({
      enviado: true,
      emailId: data?.id,
    })
  } catch (err: any) {
    console.error('[enviar-amortizacion-email] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Error enviando correo', enviado: false },
      { status: 500 }
    )
  }
}
