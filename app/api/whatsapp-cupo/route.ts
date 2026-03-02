import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verificarCupo, incrementarConsumo } from '@/lib/services/whatsapp-consumo'
import { enviarWhatsAppViaEdgeFunction } from '@/lib/twilio-whatsapp'
import { normalizarE164 } from '@/lib/utils/telefonoE164'
import { resend, FROM_EMAIL } from '@/lib/resend'
import { formatDateDominican } from '@/lib/utils/dateFormat'
import ReciboPagoEmail from '@/emails/ReciboPagoEmail'
import PlanPagosEmail from '@/emails/PlanPagosEmail'
import { render } from '@react-email/render'
import React from 'react'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Tipo de envío: recibo de pago o tabla de amortización. */
type TipoEnvio = 'recibo' | 'amortizacion'

/** Canal: WhatsApp (Twilio vía Edge Function) o correo (Resend). */
type CanalEnvio = 'whatsapp' | 'email'

/** Datos para recibo: monto, fechas, balance, etc. */
type ObjetoDatosRecibo = {
  monto: number
  fecha?: string
  balance_restante: number
  numero_recibo?: string
  numero_cuota?: number
  cuotas_restantes?: number
  nombre_cliente?: string
  nombre_empresa?: string
  link_prestamo?: string
}

/** Fila de tabla de amortización para email. */
type CuotaRow = {
  numero_cuota: number
  fecha_pago: string
  cuota_fija: number
  interes_mes?: number
  abono_capital?: number
  saldo_pendiente?: number
}

/** Datos para amortización: venta, link, tabla (para email). */
type ObjetoDatosAmortizacion = {
  nombre_cliente?: string
  venta_id?: string
  link_amortizacion?: string
  nombre_empresa?: string
  tabla_amortizacion?: CuotaRow[]
}

/** Body del POST: tipo, canal y datos según el tipo. */
type PostBody = {
  tipo: TipoEnvio
  canal: CanalEnvio
  email_cliente?: string
  telefono_cliente?: string
  objeto_datos: ObjetoDatosRecibo | ObjetoDatosAmortizacion
}

/**
 * GET: Estado de créditos de notificación (sin info técnica).
 * Acepta sesión por cookies o Authorization: Bearer.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const isPremium = (v: unknown) => {
      if (v === true || v === 1) return true
      const s = typeof v === 'string' ? v.toLowerCase().trim() : ''
      return s === 'true' || s === 't' || s === '1' || s === 'yes' || s === 'si'
    }

    let lista: Array<{ empresa_id?: string | null; compania_id?: string | null; has_whatsapp_premium?: unknown }> = []
    const { data: perfilList } = await admin
      .from('perfiles')
      .select('empresa_id, compania_id, has_whatsapp_premium')
      .eq('user_id', user.id)
    lista = Array.isArray(perfilList) ? perfilList : []

    if (lista.length === 0 && (user.email ?? '').trim().includes('@')) {
      const { data: porEmail } = await admin
        .from('perfiles')
        .select('empresa_id, compania_id, has_whatsapp_premium')
        .eq('email', (user.email ?? '').trim())
      if (Array.isArray(porEmail) && porEmail.length > 0) lista = porEmail
    }

    const perfil = lista[0] ?? null
    let empresaIds: string[] = []

    if (lista.some((p) => isPremium(p.has_whatsapp_premium))) {
      empresaIds = [...new Set(lista.flatMap((p) => [p.empresa_id, p.compania_id]).filter(Boolean))] as string[]
    }
    if (empresaIds.length === 0 && perfil) {
      const companyId = perfil.empresa_id || perfil.compania_id
      if (companyId) {
        const { data: perfilesCompania } = await admin
          .from('perfiles')
          .select('id, has_whatsapp_premium')
          .or(`empresa_id.eq.${companyId},compania_id.eq.${companyId}`)
        const algunoConPremium = (perfilesCompania ?? []).some((p) => isPremium(p.has_whatsapp_premium))
        if (algunoConPremium) empresaIds = [companyId]
      }
    }

    if (empresaIds.length === 0) {
      return NextResponse.json({ cupo: null, cupo_agotado: false })
    }

    const estados = await Promise.all(
      empresaIds.map(async (empresaId) => {
        const estado = await verificarCupo(empresaId)
        return { empresa_id: empresaId, ...estado }
      })
    )

    const puedeEnviar = estados.every((e) => e.ok)
    const peorEstado = estados.find((e) => !e.ok) || estados[0]
    const restantes = peorEstado?.ok ? peorEstado.restantes : 0

    return NextResponse.json({
      cupo_agotado: !puedeEnviar,
      puede_enviar: puedeEnviar,
      creditos_restantes: restantes,
      mensaje: !puedeEnviar
        ? 'Has agotado tus notificaciones mensuales. Para continuar enviando recibos y recordatorios ahora mismo, puedes adquirir un Paquete de Extensión de 200 Notificaciones.'
        : undefined,
    })
  } catch (err) {
    console.error('Error whatsapp-cupo:', err)
    return NextResponse.json({ error: 'Error obteniendo cupo' }, { status: 500 })
  }
}

/**
 * Obtiene empresa_id del usuario (misma lógica que GET: perfiles por user_id/email, premium, compañía).
 */
async function getEmpresaIdForUser(userId: string, userEmail: string | undefined, admin: ReturnType<typeof getSupabaseAdmin>): Promise<string | null> {
  const isPremium = (v: unknown) => {
    if (v === true || v === 1) return true
    const s = typeof v === 'string' ? v.toLowerCase().trim() : ''
    return s === 'true' || s === 't' || s === '1' || s === 'yes' || s === 'si'
  }

  let lista: Array<{ empresa_id?: string | null; compania_id?: string | null; has_whatsapp_premium?: unknown }> = []
  const { data: perfilList } = await admin
    .from('perfiles')
    .select('empresa_id, compania_id, has_whatsapp_premium')
    .eq('user_id', userId)
  lista = Array.isArray(perfilList) ? perfilList : []

  if (lista.length === 0 && (userEmail ?? '').trim().includes('@')) {
    const { data: porEmail } = await admin
      .from('perfiles')
      .select('empresa_id, compania_id, has_whatsapp_premium')
      .eq('email', (userEmail ?? '').trim())
    if (Array.isArray(porEmail) && porEmail.length > 0) lista = porEmail
  }

  const perfil = lista[0] ?? null
  if (lista.some((p) => isPremium(p.has_whatsapp_premium))) {
    const id = perfil?.empresa_id || perfil?.compania_id
    if (id) return String(id)
  }
  const companyId = perfil?.empresa_id || perfil?.compania_id
  if (!companyId) return null
  const { data: perfilesCompania } = await admin
    .from('perfiles')
    .select('id, has_whatsapp_premium')
    .or(`empresa_id.eq.${companyId},compania_id.eq.${companyId}`)
  const algunoConPremium = (perfilesCompania ?? []).some((p) => isPremium(p.has_whatsapp_premium))
  return algunoConPremium ? String(companyId) : null
}

/**
 * POST: Envía recibo o amortización por WhatsApp (Twilio vía Edge Function) o por correo (Resend).
 * Body: { tipo: 'recibo'|'amortizacion', canal: 'whatsapp'|'email', email_cliente?, telefono_cliente?, objeto_datos }.
 * Valida cupo antes de enviar por WhatsApp; tras envío exitoso descuenta crédito (incrementarConsumo).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = (await request.json()) as PostBody
    const { tipo, canal, email_cliente, telefono_cliente, objeto_datos } = body

    if (!tipo || !canal || !objeto_datos) {
      return NextResponse.json(
        { error: 'Faltan tipo, canal u objeto_datos en el body' },
        { status: 400 }
      )
    }
    if (tipo !== 'recibo' && tipo !== 'amortizacion') {
      return NextResponse.json({ error: 'tipo debe ser "recibo" o "amortizacion"' }, { status: 400 })
    }
    if (canal !== 'whatsapp' && canal !== 'email') {
      return NextResponse.json({ error: 'canal debe ser "whatsapp" o "email"' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const empresaId = await getEmpresaIdForUser(user.id, user.email ?? undefined, admin)
    if (!empresaId) {
      return NextResponse.json(
        { error: 'No se pudo determinar la empresa o no tienes WhatsApp Premium activo.' },
        { status: 403 }
      )
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      request.headers.get('origin') ||
      'https://prestamos.jasicorporations.com'

    if (canal === 'whatsapp') {
      const telefono = telefono_cliente?.trim()
      const telefonoE164 = normalizarE164(telefono)
      if (!telefonoE164) {
        return NextResponse.json(
          { error: 'Para envío por WhatsApp se requiere telefono_cliente válido (E.164).' },
          { status: 400 }
        )
      }

      const estadoCupo = await verificarCupo(empresaId)
      if (!estadoCupo.ok) {
        return NextResponse.json(
          { error: estadoCupo.aviso ?? 'Cupo de notificaciones agotado', cupo_agotado: true },
          { status: 403 }
        )
      }

      const nombreCliente = (objeto_datos as ObjetoDatosRecibo & ObjetoDatosAmortizacion).nombre_cliente ?? 'Cliente'
      const nombreEmpresa = (objeto_datos as ObjetoDatosRecibo & ObjetoDatosAmortizacion).nombre_empresa ?? 'JASICORPORATIONS'
      const telefonoParaEdge = telefonoE164.replace(/^whatsapp:\+?/, '')

      if (tipo === 'recibo') {
        const datos = objeto_datos as ObjetoDatosRecibo
        const { sid } = await enviarWhatsAppViaEdgeFunction({
          tipo: 'recibo',
          telefono_cliente: telefonoParaEdge,
          nombre_cliente: nombreCliente,
          monto_cobrado: Number(datos.monto ?? 0),
          fecha: datos.fecha ?? new Date().toISOString(),
          balance_restante: Number(datos.balance_restante ?? 0),
          numero_cuota: datos.numero_cuota,
          cuotas_restantes: datos.cuotas_restantes,
          nombre_empresa: nombreEmpresa,
        })
        await incrementarConsumo(empresaId)
        return NextResponse.json({ enviado: true, canal: 'whatsapp', tipo: 'recibo', sid })
      }

      const datosAmort = objeto_datos as ObjetoDatosAmortizacion
      const linkAmort = datosAmort.link_amortizacion ?? (datosAmort.venta_id ? `${baseUrl}/ventas/${datosAmort.venta_id}/amortizacion` : undefined)
      const result = await enviarWhatsAppViaEdgeFunction({
        tipo: 'amortizacion',
        telefono_cliente: telefonoParaEdge,
        nombre_cliente: nombreCliente,
        venta_id: datosAmort.venta_id ?? '',
        nombre_empresa: nombreEmpresa,
        link_amortizacion: linkAmort,
      })
      await incrementarConsumo(empresaId)
      return NextResponse.json({ enviado: true, canal: 'whatsapp', tipo: 'amortizacion', sid: result?.sid })
    }

    // canal === 'email'
    const emailTo = email_cliente?.trim()
    if (!emailTo || !emailTo.includes('@')) {
      return NextResponse.json(
        { error: 'Para envío por correo se requiere email_cliente válido.' },
        { status: 400 }
      )
    }

    if (!resend) {
      return NextResponse.json(
        { error: 'Resend no configurado. Configura RESEND_API_KEY.' },
        { status: 500 }
      )
    }

    const nombreCliente = (objeto_datos as ObjetoDatosRecibo & ObjetoDatosAmortizacion).nombre_cliente ?? 'Cliente'
    const nombreEmpresa = (objeto_datos as ObjetoDatosRecibo & ObjetoDatosAmortizacion).nombre_empresa ?? 'JASICORPORATIONS'

    if (tipo === 'recibo') {
      const datos = objeto_datos as ObjetoDatosRecibo
      const numeroRecibo = datos.numero_recibo ?? '1'
      const fechaPago = datos.fecha
        ? formatDateDominican(datos.fecha)
        : 'N/A'
      const linkPrestamo = datos.link_prestamo ?? (datos.balance_restante != null ? `${baseUrl}/ventas` : `${baseUrl}/ventas`)

      const emailHtml = await render(
        React.createElement(ReciboPagoEmail, {
          nombreCliente,
          numeroRecibo,
          nombreEmpresa,
          montoPagado: Number(datos.monto ?? 0),
          fechaPago,
          balanceRestante: Number(datos.balance_restante ?? 0),
          linkPrestamo,
        })
      )
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: emailTo,
        subject: `Recibo de Pago #${numeroRecibo} - ${nombreEmpresa}`,
        html: emailHtml,
      })
      if (error) {
        console.error('[whatsapp-cupo POST] Error Resend recibo:', error)
        return NextResponse.json({ error: error.message, enviado: false }, { status: 500 })
      }
      return NextResponse.json({ enviado: true, canal: 'email', tipo: 'recibo', emailId: data?.id })
    }

    const datosAmort = objeto_datos as ObjetoDatosAmortizacion
    const ventaId = datosAmort.venta_id ?? ''
    const tablaAmortizacion = datosAmort.tabla_amortizacion ?? []
    const emailHtml = await render(
      React.createElement(PlanPagosEmail, {
        nombreCliente,
        ventaId,
        nombreEmpresa,
        tablaAmortizacion: tablaAmortizacion.map((r) => ({
          numero_cuota: r.numero_cuota,
          fecha_pago: r.fecha_pago,
          cuota_fija: r.cuota_fija,
          interes_mes: r.interes_mes ?? 0,
          abono_capital: r.abono_capital ?? 0,
          saldo_pendiente: r.saldo_pendiente ?? 0,
        })),
      })
    )
    const ventaIdDisplay = ventaId ? ventaId.slice(-6).toUpperCase() : 'N/A'
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: emailTo,
      subject: `Tu Plan de Pagos - Préstamo #${ventaIdDisplay}`,
      html: emailHtml,
    })
    if (error) {
      console.error('[whatsapp-cupo POST] Error Resend amortizacion:', error)
      return NextResponse.json({ error: error.message, enviado: false }, { status: 500 })
    }
    return NextResponse.json({ enviado: true, canal: 'email', tipo: 'amortizacion', emailId: data?.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error en envío'
    console.error('[whatsapp-cupo POST] Error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
