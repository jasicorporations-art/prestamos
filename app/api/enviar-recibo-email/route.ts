import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { resend, FROM_EMAIL } from '@/lib/resend'
import { formatDateDominican } from '@/lib/utils/dateFormat'
import { retryUntilFound } from '@/lib/utils/retryUntilFound'
import ReciboPagoEmail from '@/emails/ReciboPagoEmail'
import { render } from '@react-email/render'
import React from 'react'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Envía correo de recibo de pago al cliente tras un cobro exitoso.
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
    const pagoId = body.pago_id as string
    if (!pagoId) {
      return NextResponse.json(
        { error: 'Falta pago_id', enviado: false },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdmin()
    type PagoRow = { id: string; monto: number; fecha_pago: string | null; venta_id: string; fecha_hora?: string | null; numero_cuota?: number | null } | null
    let pago: PagoRow = null
    let pagoError: { message?: string } | null = null

    const fetchPago = async () => {
      const res = await admin
        .from('pagos')
        .select('id, monto, fecha_pago, fecha_hora, venta_id')
        .eq('id', pagoId)
        .maybeSingle()
      if (res.error && (res.error as any).message?.includes('column')) {
        const fallback = await admin.from('pagos').select('id, monto, fecha_pago, venta_id').eq('id', pagoId).maybeSingle()
        pagoError = fallback.error as { message?: string } | null
        pago = fallback.data as PagoRow
        return
      }
      pagoError = res.error as { message?: string } | null
      pago = res.data as PagoRow
    }

    await retryUntilFound(fetchPago, () => !!pago, () => !!pagoError)

    if (pagoError || !pago) {
      console.warn('[enviar-recibo-email] Pago no encontrado:', pagoId, (pagoError as any)?.message)
      return NextResponse.json(
        { error: 'Pago no encontrado', enviado: false },
        { status: 404 }
      )
    }

    if (!pago.venta_id) {
      console.warn('[enviar-recibo-email] Pago sin venta_id:', pagoId)
      return NextResponse.json(
        { error: 'Pago sin venta asociada', enviado: false },
        { status: 404 }
      )
    }

    type VentaRow = { id: string; saldo_pendiente?: number; cantidad_cuotas?: number; empresa_id?: string | null; compania_id?: string | null; cliente_id?: string | null }
    const fetchVenta = async (selectCols: string = 'id, saldo_pendiente, cantidad_cuotas, empresa_id, compania_id, cliente_id') => {
      return await admin
        .from('ventas')
        .select(selectCols)
        .eq('id', pago.venta_id)
        .maybeSingle()
    }

    let ventaResult: Awaited<ReturnType<typeof fetchVenta>> | null = null
    let venta: VentaRow | null = null
    let ventaError: { message?: string } | null = null
    const fetchVentaAndAssign = async () => {
      ventaResult = await fetchVenta()
      venta = ventaResult.data as VentaRow | null
      ventaError = ventaResult.error
    }
    await retryUntilFound(fetchVentaAndAssign, () => !!venta, () => !!ventaError)

    let ventaDatosIncompletos = false
    if (ventaError && (ventaError as any).message?.includes('column')) {
      ventaResult = await fetchVenta('id, cliente_id')
      venta = ventaResult.data as VentaRow | null
      ventaError = ventaResult.error
      if (venta) {
        ventaDatosIncompletos = true
        ;(venta as any).saldo_pendiente = undefined
        ;(venta as any).cantidad_cuotas = undefined
      }
    }

    if (ventaError || !venta) {
      console.warn('[enviar-recibo-email] Venta no encontrada:', pago.venta_id, (ventaError as any)?.message)
      return NextResponse.json(
        { error: 'Venta no encontrada', enviado: false },
        { status: 404 }
      )
    }

    const clienteId = (venta as any).cliente_id
    if (!clienteId) {
      return NextResponse.json({ enviado: false, mensaje: 'Venta sin cliente asociado.' })
    }

    const { data: cliente } = await admin
      .from('clientes')
      .select('*')
      .eq('id', clienteId)
      .single()

    const rawEmail = (cliente as any)?.email ?? (cliente as any)?.correo
    const emailCliente = typeof rawEmail === 'string' ? rawEmail.trim() : ''
    if (!emailCliente || !emailCliente.includes('@') || emailCliente.length < 5) {
      return NextResponse.json({
        enviado: false,
        mensaje: 'Cliente sin email válido (revisa los campos email o correo). No se envió correo.',
      })
    }

    // Obtener nombre de la empresa (venta puede tener empresa_id UUID o compania_id como nombre)
    let empresaId = venta.empresa_id || venta.compania_id
    if (!empresaId) {
      const { data: ventaRef } = await admin
        .from('ventas')
        .select('empresa_id, compania_id')
        .eq('id', pago.venta_id)
        .maybeSingle()
      empresaId = (ventaRef as any)?.empresa_id ?? (ventaRef as any)?.compania_id ?? null
    }
    let nombreEmpresa = 'JASICORPORATIONS'
    let emailBcc: string | undefined
    if (empresaId) {
      let emp = (await admin.from('empresas').select('nombre, email').eq('id', empresaId).maybeSingle()).data
      if (!emp && typeof empresaId === 'string' && empresaId.length > 0) {
        emp = (await admin.from('empresas').select('nombre, email').eq('nombre', empresaId).maybeSingle()).data
      }
      if (emp?.nombre) {
        nombreEmpresa = String(emp.nombre).trim()
      }
      if (emp?.email?.trim()?.includes('@')) {
        emailBcc = emp.email.trim()
      }
    }

    // Re-fetch venta para tener saldo_pendiente y cantidad_cuotas actualizados (el front ya actualizó saldo tras el pago)
    await new Promise((r) => setTimeout(r, 800))
    const { data: ventaActual, error: ventaActualError } = await admin
      .from('ventas')
      .select('saldo_pendiente, cantidad_cuotas')
      .eq('id', pago.venta_id)
      .maybeSingle()

    const tieneSaldoEnVenta =
      !ventaDatosIncompletos || (ventaActual != null && (ventaActual as any).saldo_pendiente != null)
    const tieneCantidadCuotas =
      !ventaDatosIncompletos || (ventaActual != null && (ventaActual as any).cantidad_cuotas != null)

    let saldoActual: number = Number((ventaActual as any)?.saldo_pendiente ?? (venta as any).saldo_pendiente ?? 0)
    const cantidadCuotas: number = Number((ventaActual as any)?.cantidad_cuotas ?? (venta as any).cantidad_cuotas ?? 0)
    if (Number.isNaN(saldoActual) || saldoActual < 0) saldoActual = 0

    // Número de recibo y cuotas: pagos de la venta (con numero_cuota para contar cuotas pagadas)
    const { data: pagosVenta } = await admin
      .from('pagos')
      .select('id, numero_cuota')
      .eq('venta_id', pago.venta_id)
    const numeroRecibo = (pagosVenta?.length || 1).toString()
    const cuotasPagadas = (pagosVenta ?? []).filter((p: { numero_cuota?: number | null }) => p.numero_cuota != null).length
    const cuotasRestantes = Math.max(0, Math.floor(Number(cantidadCuotas)) - cuotasPagadas)

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      request.headers.get('origin') ||
      'https://prestamos.jasicorporations.com'
    const linkPrestamo = `${baseUrl}/ventas/${pago.venta_id}/amortizacion`

    // Usar fecha_hora (registrada al crear el pago en DB), zona America/Santo_Domingo
    const fechaPago = (pago.fecha_hora || pago.fecha_pago)
      ? formatDateDominican(pago.fecha_hora || pago.fecha_pago)
      : 'N/A'

    const balanceRestante = Number(saldoActual)
    const montoPagadoNum = Number(pago.monto) || 0
    const balanceRestanteTexto =
      !tieneSaldoEnVenta ? 'No disponible' : undefined
    const cuotasRestantesTextoVal =
      tieneCantidadCuotas && cantidadCuotas > 0 ? String(cuotasRestantes) : undefined

    const emailHtml = await render(
      React.createElement(ReciboPagoEmail, {
        nombreCliente: String((cliente as any)?.nombre_completo || 'Cliente'),
        numeroRecibo: String(numeroRecibo),
        nombreEmpresa: String(nombreEmpresa),
        montoPagado: montoPagadoNum,
        fechaPago: String(fechaPago),
        balanceRestante,
        balanceRestanteTexto,
        cuotasRestantesTexto: cuotasRestantesTextoVal,
        cuotasRestantesEsUno: cuotasRestantes === 1,
        linkPrestamo: String(linkPrestamo),
      })
    )

    const sendOptions: Parameters<typeof resend.emails.send>[0] = {
      from: FROM_EMAIL,
      to: emailCliente,
      subject: `Recibo de Pago #${numeroRecibo} - ${nombreEmpresa}`,
      html: emailHtml,
    }
    if (emailBcc) {
      sendOptions.bcc = [emailBcc]
    }

    const { data, error } = await resend.emails.send(sendOptions)

    if (error) {
      console.error('[enviar-recibo-email] Error Resend:', error)
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
    console.error('[enviar-recibo-email] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Error enviando correo', enviado: false },
      { status: 500 }
    )
  }
}
