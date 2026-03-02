import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { createClientFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { actividadService } from '@/lib/services/actividad'
import { verificarCupo, incrementarConsumo } from '@/lib/services/whatsapp-consumo'
import { normalizarE164 } from '@/lib/utils/telefonoE164'
import { retryUntilFound } from '@/lib/utils/retryUntilFound'
import { sendText } from '@/lib/evolution-railway'
import { getConfigWhatsAppEmpresa, empresaTieneEvolutionPremium } from '@/lib/whatsapp-hybrid'
import { enviarWhatsAppViaEdgeFunction } from '@/lib/twilio-whatsapp'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Devuelve true si premium_until es null (vitalicio) o la fecha es hoy o futura. */
function premiumVigente(premiumUntil: string | null | undefined, hoy: Date): boolean {
  if (!premiumUntil) return true
  const hasta = new Date(premiumUntil)
  hasta.setHours(0, 0, 0, 0)
  return hasta >= hoy
}

/** Acepta boolean true, 1, "true", "t", "1", "yes", "si" (Supabase puede devolver boolean o string). */
function isPremiumFlag(value: unknown): boolean {
  if (value === true || value === 1) return true
  if (value === false || value === 0) return false
  const s = typeof value === 'string' ? value.toLowerCase().trim() : ''
  return s === 'true' || s === 't' || s === '1' || s === 'yes' || s === 'si'
}

/**
 * Envía recibo por WhatsApp con Twilio Content Template.
 * Solo envía si: usuario autorizado, cliente whatsapp_activo = true y teléfono E.164 válido.
 * No bloquea el flujo del pago; el cliente debe llamar esta API de forma asíncrona.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado', enviado: false }, { status: 401 })
    }

    const body = await request.json()
    const pagoId = (body.pago_id ?? body.id_pago) as string | undefined
    if (!pagoId || typeof pagoId !== 'string') {
      return NextResponse.json(
        { error: 'Falta pago_id (envía pago_id o id_pago en el body)', enviado: false },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdmin()
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    type PerfilRow = { has_whatsapp_premium?: unknown; premium_until?: string | null; empresa_id?: string | null; compania_id?: string | null; rol?: string | null; [k: string]: unknown }
    let lista: PerfilRow[] = []

    // Buscar por user_id: usar select('*') para no fallar si alguna columna tiene otro nombre o no existe
    let resByUserId = await admin.from('perfiles').select('*').eq('user_id', user.id)
    if (!resByUserId.error && Array.isArray(resByUserId.data) && resByUserId.data.length > 0) {
      lista = resByUserId.data as PerfilRow[]
    }
    if (lista.length === 0 && resByUserId.error?.message?.includes('column')) {
      const resUsuarioId = await admin.from('perfiles').select('*').eq('usuario_id', user.id)
      if (!resUsuarioId.error && Array.isArray(resUsuarioId.data) && resUsuarioId.data.length > 0) {
        lista = resUsuarioId.data as PerfilRow[]
      }
    }

    const emailTrim = (user.email ?? '').trim()
    if (lista.length === 0 && emailTrim.includes('@')) {
      const resIlike = await admin.from('perfiles').select('*').ilike('email', emailTrim)
      if (!resIlike.error && Array.isArray(resIlike.data) && resIlike.data.length > 0) {
        lista = resIlike.data as PerfilRow[]
      }
      if (lista.length === 0) {
        const resEmail = await admin.from('perfiles').select('*').eq('email', emailTrim)
        if (!resEmail.error && Array.isArray(resEmail.data) && resEmail.data.length > 0) {
          lista = resEmail.data as PerfilRow[]
        }
      }
      if (lista.length === 0) {
        const resCorreoIlike = await admin.from('perfiles').select('*').ilike('correo', emailTrim)
        if (!resCorreoIlike.error && Array.isArray(resCorreoIlike.data) && resCorreoIlike.data.length > 0) {
          lista = resCorreoIlike.data as PerfilRow[]
        }
      }
      if (lista.length === 0) {
        const resCorreo = await admin.from('perfiles').select('*').eq('correo', emailTrim)
        if (!resCorreo.error && Array.isArray(resCorreo.data) && resCorreo.data.length > 0) {
          lista = resCorreo.data as PerfilRow[]
        }
      }
    }

    if (lista.length === 0) {
      console.warn('[enviar-recibo-whatsapp] Sin perfil. user.id=', user.id, 'user.email=', user.email, 'resByUserId.error=', (resByUserId as any).error?.message)
    }

    const perfil = lista[0] ?? null

    const flagPremium = (p: PerfilRow) => p.has_whatsapp_premium ?? (p as any).whatsapp_premium
    const premiumUntil = (p: PerfilRow) => p.premium_until ?? (p as any).premium_until
    let tienePremium = lista.some(
      (p) => isPremiumFlag(flagPremium(p)) && premiumVigente(premiumUntil(p), hoy)
    )
    if (!tienePremium && (perfil?.rol ?? '').toLowerCase() === 'super_admin') {
      tienePremium = true
    }
    // Herencia por compañía: si algún perfil de la misma compañía tiene WhatsApp activo
    const companyId = perfil?.empresa_id || perfil?.compania_id
    if (!tienePremium && companyId) {
      const { data: perfilesCompania } = await admin
        .from('perfiles')
        .select('*')
        .or(`empresa_id.eq.${companyId},compania_id.eq.${companyId}`)
      const algunoVigente = (perfilesCompania ?? []).some(
        (p: PerfilRow) => isPremiumFlag(flagPremium(p)) && premiumVigente(premiumUntil(p), hoy)
      )
      if (algunoVigente) tienePremium = true
    }

    if (!tienePremium) {
      // Log para depuración: qué valores tiene el perfil (en Vercel/servidor)
      if (lista.length > 0) {
        const p = lista[0]
        console.warn('[enviar-recibo-whatsapp] Premium rechazado. Valores del perfil:', {
          has_whatsapp_premium: p.has_whatsapp_premium,
          tipo: typeof p.has_whatsapp_premium,
          premium_until: p.premium_until,
          user_id: user.id,
          email: user.email,
        })
      }
      const mensajeBase = 'Suscripción WhatsApp Premium no activa. Activa el módulo en Recordatorios o contacta al administrador.'
      const payload: { error: string; enviado: false; user_id?: string; sql_vincular?: string; sql_activar?: string; sql_todo?: string } = {
        error: lista.length === 0
          ? `${mensajeBase} No se encontró perfil para tu usuario. Revisa la consola o el detalle de la respuesta.`
          : `${mensajeBase} Si activaste por SQL, verifica has_whatsapp_premium = true y premium_until NULL o futuro.`,
        enviado: false,
      }
      if (lista.length === 0) {
        payload.user_id = user.id
        const emailEscaped = (user.email ?? '').replace(/'/g, "''")
        payload.sql_vincular = `UPDATE perfiles SET user_id = '${user.id}' WHERE email = '${emailEscaped}';`
        payload.sql_activar = `UPDATE perfiles SET has_whatsapp_premium = true, premium_until = NULL WHERE user_id = '${user.id}';`
        payload.sql_todo = `-- Ejecuta en Supabase > SQL Editor. Copia tal cual (comillas y user_id con guión bajo).\n\n${payload.sql_vincular}\n\n${payload.sql_activar}`
      }
      return NextResponse.json(payload, { status: 403 })
    }

    type PagoRow = { id: string; monto: number; fecha_pago: string | null; venta_id: string; fecha_hora?: string | null; numero_cuota?: number | null } | null
    let pago: PagoRow = null
    let pagoError: { message?: string } | null = null
    const fetchPago = async () => {
      const res = await admin.from('pagos').select('id, monto, fecha_pago, fecha_hora, venta_id, numero_cuota').eq('id', pagoId).maybeSingle()
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
      return NextResponse.json({ error: 'Pago no encontrado', enviado: false }, { status: 404 })
    }

    const pagoRow = pago as Record<string, unknown>
    const ventaId =
      typeof pagoRow.venta_id === 'string'
        ? pagoRow.venta_id
        : typeof (pagoRow as any).ventaId === 'string'
          ? (pagoRow as any).ventaId
          : typeof pagoRow.id_venta === 'string'
            ? pagoRow.id_venta
            : undefined
    if (!ventaId || ventaId.trim() === '') {
      console.warn('[enviar-recibo-whatsapp] Pago sin venta_id:', pagoId, 'keys:', Object.keys(pagoRow))
      return NextResponse.json(
        { error: 'Pago sin venta asociada (venta_id ausente o inválido)', enviado: false },
        { status: 400 }
      )
    }

    type VentaRow = {
      id: string
      saldo_pendiente?: number
      empresa_id?: string | null
      compania_id?: string | null
      cantidad_cuotas?: number | null
      cliente_id?: string | null
      id_cliente?: string | null
      cliente?: { id?: string; nombre_completo?: string; celular?: string; whatsapp_activo?: boolean }
    }
    let venta: VentaRow | null = null
    let ventaError: { message?: string } | null = null

    /** ID del cliente en la venta: acepta cliente_id o id_cliente según el nombre de la columna en la BD. */
    const getClienteIdFromVenta = (v: VentaRow | null): string | undefined => {
      if (!v) return undefined
      const id = (v as Record<string, unknown>).cliente_id ?? (v as Record<string, unknown>).id_cliente
      return typeof id === 'string' && id.trim() !== '' ? id : undefined
    }

    const fetchVenta = async (selectCols: string = 'id, saldo_pendiente, empresa_id, compania_id, cantidad_cuotas, cliente_id') => {
      const res = await admin
        .from('ventas')
        .select(selectCols)
        .eq('id', ventaId)
        .maybeSingle()
      ventaError = res.error as { message?: string } | null
      venta = res.data as VentaRow | null
    }

    const fetchVentaConClienteEmbed = async () => {
      const res = await admin
        .from('ventas')
        .select('id, saldo_pendiente, empresa_id, compania_id, cantidad_cuotas, cliente:clientes(id, nombre_completo, celular, whatsapp_activo)')
        .eq('id', ventaId)
        .maybeSingle()
      ventaError = res.error as { message?: string } | null
      venta = res.data as VentaRow | null
    }

    await retryUntilFound(fetchVentaConClienteEmbed, () => !!venta, () => !!ventaError)

    if (!venta && ventaError && (ventaError.message ?? '').includes('column')) {
      ventaError = null
      venta = null
      await fetchVenta()
    }
    if (!venta && ventaError && (ventaError.message ?? '').includes('column')) {
      ventaError = null
      venta = null
      await fetchVenta('id, saldo_pendiente, cliente_id')
    }
    if (!venta && ventaError && (ventaError.message ?? '').includes('column')) {
      ventaError = null
      venta = null
      await fetchVenta('id, saldo_pendiente, id_cliente')
    }
    if (!venta && ventaError && (ventaError.message ?? '').includes('column')) {
      ventaError = null
      venta = null
      await fetchVenta('id, cliente_id')
    }
    if (!venta && ventaError && (ventaError.message ?? '').includes('column')) {
      ventaError = null
      venta = null
      await fetchVenta('id, id_cliente')
    }

    if (!venta && !ventaError) {
      ventaError = null
      venta = null
      await fetchVenta('id, saldo_pendiente, empresa_id, compania_id, cantidad_cuotas, cliente_id')
    }
    if (!venta && ventaError && (ventaError.message ?? '').includes('column')) {
      ventaError = null
      venta = null
      await fetchVenta('id, saldo_pendiente, id_cliente')
    }
    if (!venta && ventaError && (ventaError.message ?? '').includes('column')) {
      ventaError = null
      venta = null
      await fetchVenta('id, cliente_id')
    }
    if (!venta && ventaError && (ventaError.message ?? '').includes('column')) {
      ventaError = null
      venta = null
      await fetchVenta('id, id_cliente')
    }

    const clienteIdFromVenta = getClienteIdFromVenta(venta)
    if (venta && !venta.cliente && clienteIdFromVenta) {
      const { data: clienteData, error: clienteErr } = await admin
        .from('clientes')
        .select('id, nombre_completo, celular, whatsapp_activo')
        .eq('id', clienteIdFromVenta)
        .maybeSingle()
      if (clienteErr && (clienteErr as any).message?.includes('column')) {
        const fallbackCliente = await admin.from('clientes').select('*').eq('id', clienteIdFromVenta).maybeSingle()
        if (fallbackCliente.data) venta.cliente = fallbackCliente.data as any
      } else if (clienteData) {
        venta.cliente = clienteData as VentaRow['cliente']
      }
    }

    if (ventaError || !venta) {
      console.warn('[enviar-recibo-whatsapp] Venta no encontrada:', ventaId, ventaError?.message)
      return NextResponse.json(
        { error: 'Venta no encontrada', enviado: false, detalle: ventaError?.message ?? undefined },
        { status: 404 }
      )
    }

    const esSuperAdmin = perfil?.rol === 'super_admin'
    if (!esSuperAdmin) {
      const empresaUsuario = perfil?.empresa_id || perfil?.compania_id
      const ventaEmpresa = venta.empresa_id || venta.compania_id
      if (empresaUsuario && ventaEmpresa && ventaEmpresa !== empresaUsuario) {
        console.warn('[enviar-recibo-whatsapp] No autorizado para esta venta.')
        return NextResponse.json(
          { error: 'No autorizado para esta venta', enviado: false },
          { status: 403 }
        )
      }
    }

    const empresaId = (venta.empresa_id || venta.compania_id) as string
    const { data: empRow } = await admin.from('empresas').select('whatsapp_enabled').eq('id', empresaId).maybeSingle()
    const whatsappEnabled = (empRow as { whatsapp_enabled?: boolean } | null)?.whatsapp_enabled === true
    if (!whatsappEnabled && !esSuperAdmin) {
      return NextResponse.json({
        error: 'Activa WhatsApp ($20) en Conexión WhatsApp para enviar recibos automáticos.',
        enviado: false,
      }, { status: 403 })
    }
    if (empresaId && !esSuperAdmin) {
      try {
        const estadoCupo = await verificarCupo(empresaId)
        if (!estadoCupo.ok) {
          return NextResponse.json(
            { error: estadoCupo.aviso ?? 'Cupo de notificaciones agotado', enviado: false, cupo_agotado: true },
            { status: 403 }
          )
        }
      } catch (cupoErr) {
        console.error('[enviar-recibo-whatsapp] Error verificarCupo:', cupoErr)
        return NextResponse.json(
          { error: 'Error al verificar cupo de WhatsApp.', enviado: false },
          { status: 500 }
        )
      }
    }

    const cliente = (venta as any).cliente
    const whatsappActivo = cliente?.whatsapp_activo ?? true
    if (whatsappActivo !== true) {
      console.log('[enviar-recibo-whatsapp] No enviado: cliente whatsapp_activo no está activo.', { pago_id: pagoId, cliente_id: cliente?.id })
      return NextResponse.json({
        enviado: false,
        mensaje: 'Cliente no tiene WhatsApp activo. No se envió mensaje.',
      })
    }

    const celular = cliente?.celular?.trim()
    const telefonoE164 = normalizarE164(celular)
    if (!telefonoE164) {
      console.log('[enviar-recibo-whatsapp] No enviado: cliente sin teléfono válido E.164.', { pago_id: pagoId, celular: celular ?? '(vacío)' })
      return NextResponse.json({
        enviado: false,
        mensaje: 'Cliente sin teléfono válido (E.164). No se envió mensaje.',
      })
    }

    const nombreCliente = cliente?.nombre_completo || 'Cliente'
    const montoCobrado = Number(pago.monto ?? 0)
    const fechaPagoIso = pago.fecha_hora || pago.fecha_pago || new Date().toISOString()

    const { data: pagosVenta } = await admin.from('pagos').select('id').eq('venta_id', ventaId)
    const cuotasPagadas = pagosVenta?.length ?? 0

    let cantidadCuotas = Number((venta as Record<string, unknown>).cantidad_cuotas ?? (venta as Record<string, unknown>).cantidad_cuota ?? 0)
    if (cantidadCuotas <= 0) {
      const { data: ventaCantidad } = await admin.from('ventas').select('cantidad_cuotas').eq('id', ventaId).maybeSingle()
      cantidadCuotas = Number(ventaCantidad?.cantidad_cuotas ?? (ventaCantidad as any)?.cantidad_cuota ?? 0)
    }

    const numeroCuotaRaw = (pago as Record<string, unknown>).numero_cuota ?? (pago as Record<string, unknown>).numeroCuota
    const numeroCuota = numeroCuotaRaw != null && String(numeroCuotaRaw).trim() !== ''
      ? String(numeroCuotaRaw).trim()
      : String(cuotasPagadas)
    const cuotasRestantes = Math.max(0, cantidadCuotas - cuotasPagadas).toString()
    const balanceRestante = Number(venta.saldo_pendiente ?? 0)

    let nombreCompania = 'JASICORPORATIONS'
    const empresaIdVal = (venta.empresa_id ?? venta.compania_id) as string | undefined
    if (empresaIdVal && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(empresaIdVal)) {
      const { data: emp } = await admin.from('empresas').select('nombre').eq('id', empresaIdVal).maybeSingle()
      if (emp?.nombre) nombreCompania = String(emp.nombre).trim()
    } else if (empresaIdVal) {
      nombreCompania = String(empresaIdVal).trim()
    }
    if (!nombreCompania || nombreCompania === 'undefined') nombreCompania = 'JASICORPORATIONS'

    const telefonoParaEdge = telefonoE164.replace(/^whatsapp:\+?/, '')
    const telefonoConPais = telefonoParaEdge.startsWith('+') ? telefonoParaEdge : `+${telefonoParaEdge}`

    console.log('DATOS ENVÍO:', { telefonoE164, telefonoConPais, nombreCliente, montoCobrado, numeroCuota, cuotasRestantes, cantidadCuotas, cuotasPagadas })

    const supabaseClient = createClientFromRequest(request)
    const montoStr = montoCobrado.toLocaleString('es-DO', { minimumFractionDigits: 2 })
    const balanceStr = balanceRestante.toLocaleString('es-DO', { minimumFractionDigits: 2 })
    const textoRecibo = `¡Pago Recibido! Gracias por su cuota de $${montoStr}. Balance restante: $${balanceStr}.`

    const config = await getConfigWhatsAppEmpresa(admin as any, empresaId)
    const evolutionListo = config.metodo_envio === 'EVOLUTION' && config.evolution_instance && config.evolution_base_url && (await empresaTieneEvolutionPremium(admin as any, empresaId))

    const payloadRecibo = {
      tipo: 'recibo' as const,
      telefono_cliente: telefonoConPais,
      nombre_cliente: nombreCliente,
      monto_cobrado: montoCobrado,
      fecha: fechaPagoIso,
      balance_restante: balanceRestante,
      numero_cuota: Number(numeroCuota) || undefined,
      cuotas_restantes: Number(cuotasRestantes) || undefined,
      nombre_empresa: nombreCompania,
    }

    let metodoUsado: 'TWILIO' | 'EVOLUTION' = 'TWILIO'

    if (evolutionListo) {
      const result = await sendText(admin as any, empresaId, telefonoConPais, textoRecibo)
      if (result.ok) {
        metodoUsado = 'EVOLUTION'
      } else {
        console.warn('[enviar-recibo-whatsapp] Evolution falló, usando Twilio:', result.error)
        try {
          await enviarWhatsAppViaEdgeFunction(payloadRecibo)
          metodoUsado = 'TWILIO'
        } catch (twilioErr) {
          const msg = twilioErr instanceof Error ? twilioErr.message : String(twilioErr)
          console.error('[enviar-recibo-whatsapp] Twilio fallback:', msg)
          await actividadService.registrarActividadDesdeServidor(
            supabaseClient,
            'Envio recibo por WhatsApp',
            `Error Evolution y Twilio: ${result.error}; Twilio: ${msg}`,
            'pago',
            pagoId
          ).catch(() => {})
          return NextResponse.json(
            { enviado: false, error: msg || result.error, error_tipo: 'evolution_y_twilio' },
            { status: 502 }
          )
        }
      }
    } else {
      try {
        await enviarWhatsAppViaEdgeFunction(payloadRecibo)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[enviar-recibo-whatsapp] Twilio:', msg)
        await actividadService.registrarActividadDesdeServidor(
          supabaseClient,
          'Envio recibo por WhatsApp',
          `Error Twilio: ${msg}`,
          'pago',
          pagoId
        ).catch(() => {})
        return NextResponse.json(
          { enviado: false, error: msg, error_tipo: 'twilio' },
          { status: 502 }
        )
      }
    }

    if (empresaId) {
      try {
        await incrementarConsumo(empresaId)
      } catch (e) {
        console.warn('[enviar-recibo-whatsapp] Error incrementando consumo:', e)
      }
    }

    await actividadService.registrarActividadDesdeServidor(
      supabaseClient,
      'Envio recibo por WhatsApp',
      `Recibo enviado al ${telefonoE164} - Cuota #${numeroCuota} (${metodoUsado})`,
      'pago',
      pagoId
    )

    return NextResponse.json({ enviado: true, sid: null, metodo_usado: metodoUsado })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    console.error('[enviar-recibo-whatsapp] Error Twilio o envío:', err)
    return NextResponse.json(
      { error: msg, enviado: false, error_tipo: 'interno' },
      { status: 500 }
    )
  }
}
