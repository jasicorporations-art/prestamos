import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  CLIENTE_PORTAL_COOKIE_NAME,
  readClientePortalSession,
} from '@/lib/server/clientePortalSession'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isEstadoOrRevisionCheckError(message: string) {
  const m = (message || '').toLowerCase()
  return (
    m.includes('estado_check') ||
    m.includes('estado_revision_check') ||
    (m.includes('check constraint') &&
      m.includes('pagos_pendientes_verificacion') &&
      m.includes('estado'))
  )
}

function isLikelyMissingColumnError(message: string) {
  const m = (message || '').toLowerCase()
  return (
    m.includes('42703') ||
    (m.includes('column') &&
      (m.includes('does not exist') || m.includes('not exist'))) ||
    (m.includes('could not find') && m.includes('column'))
  )
}

function shouldTryNextInsertShape(message: string) {
  const m = (message || '').toLowerCase()
  return (
    isLikelyMissingColumnError(m) ||
    m.includes('null value in column') ||
    m.includes('not-null constraint') ||
    m.includes('violates check constraint') ||
    m.includes('invalid input syntax') ||
    m.includes('failed to parse')
  )
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(CLIENTE_PORTAL_COOKIE_NAME)?.value
    const session = readClientePortalSession(token)

    if (!session) {
      return NextResponse.json({ error: 'Sesion invalida' }, { status: 401 })
    }

    const empresaIdPortal = String(session.empresa_id || '').trim()
    const clienteIdPortal = String(session.cliente_id || '').trim()
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (!empresaIdPortal || !clienteIdPortal) {
      return NextResponse.json(
        { error: `Sesión incompleta. Cierra sesión y vuelve a entrar al portal. (empresa="${empresaIdPortal}", cliente="${clienteIdPortal}")` },
        { status: 401 }
      )
    }

    if (!uuidRe.test(empresaIdPortal) || !uuidRe.test(clienteIdPortal)) {
      return NextResponse.json(
        { error: `IDs de sesión con formato inválido. Cierra sesión y vuelve a entrar. (empresa="${empresaIdPortal}", cliente="${clienteIdPortal}")` },
        { status: 401 }
      )
    }

    const admin = getSupabaseAdmin()

    // Aceptar tanto JSON como FormData (sin foto)
    let idPrestamo = ''
    let monto = 0
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}))
      idPrestamo = String(body.id_prestamo || '').trim()
      monto = Number(body.monto || 0)
    } else {
      const form = await request.formData()
      idPrestamo = String(form.get('id_prestamo') || '').trim()
      monto = Number(form.get('monto') || 0)
    }

    if (!idPrestamo || !Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json(
        { error: 'Datos incompletos: elija préstamo y un monto válido.' },
        { status: 400 }
      )
    }

    // Verificar que el préstamo pertenece a este cliente y empresa
    let venta: { id: string } | null = null
    let ventaErr: { message: string } | null = null

    const qVentaDual = await admin
      .from('ventas')
      .select('id, cliente_id, empresa_id, compania_id')
      .eq('id', idPrestamo)
      .eq('cliente_id', clienteIdPortal)
      .or(`empresa_id.eq.${empresaIdPortal},compania_id.eq.${empresaIdPortal}`)
      .maybeSingle()

    if (qVentaDual.error && isLikelyMissingColumnError(qVentaDual.error.message)) {
      const qLegacy = await admin
        .from('ventas')
        .select('id, cliente_id, empresa_id')
        .eq('id', idPrestamo)
        .eq('cliente_id', clienteIdPortal)
        .eq('empresa_id', empresaIdPortal)
        .maybeSingle()
      venta = qLegacy.data as { id: string } | null
      ventaErr = qLegacy.error
    } else {
      venta = qVentaDual.data as { id: string } | null
      ventaErr = qVentaDual.error
    }

    if (ventaErr) {
      return NextResponse.json({ error: ventaErr.message }, { status: 500 })
    }

    if (!venta?.id) {
      return NextResponse.json({ error: 'Prestamo no valido' }, { status: 403 })
    }

    // Detectar qué columnas de empresa/cliente/prestamo existen en la tabla
    const { data: cols } = await admin
      .from('information_schema.columns' as any)
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'pagos_pendientes_verificacion')

    const colNames = new Set(
      ((cols || []) as Array<{ column_name: string }>).map((c) => c.column_name)
    )

    // Si no pudimos leer columnas, asumir el esquema canónico
    const hasIdEmpresa = colNames.size === 0 || colNames.has('id_empresa')
    const hasEmpresaId = colNames.size === 0 || colNames.has('empresa_id')
    const hasCompaniaId = colNames.has('compania_id')
    const hasIdCliente = colNames.size === 0 || colNames.has('id_cliente')
    const hasClienteId = colNames.has('cliente_id')
    const hasIdPrestamo = colNames.size === 0 || colNames.has('id_prestamo')
    const hasPrestamoId = colNames.has('prestamo_id')

    const empresaCol = hasIdEmpresa ? 'id_empresa' : hasEmpresaId ? 'empresa_id' : 'compania_id'
    const clienteCol = hasIdCliente ? 'id_cliente' : 'cliente_id'
    const prestamoCol = hasIdPrestamo ? 'id_prestamo' : 'prestamo_id'

    // Insertar notificación (sin foto — el cliente la envía por WhatsApp)
    const tryInsert = async (payload: Record<string, unknown>) => {
      return admin
        .from('pagos_pendientes_verificacion')
        .insert(payload)
        .select('id, estado, fecha_notificacion')
        .single()
    }

    const basePayload = (estado: string): Record<string, unknown> => {
      const p: Record<string, unknown> = { monto, estado, foto_comprobante: '' }
      p[empresaCol] = empresaIdPortal
      p[clienteCol] = clienteIdPortal
      p[prestamoCol] = idPrestamo
      // Añadir columnas espejo si existen
      if (hasIdEmpresa && hasEmpresaId) p['empresa_id'] = empresaIdPortal
      if (hasCompaniaId) p['compania_id'] = empresaIdPortal
      if (hasIdCliente && hasClienteId) p['cliente_id'] = clienteIdPortal
      if (hasIdPrestamo && hasPrestamoId) p['prestamo_id'] = idPrestamo
      return p
    }

    let ins: Awaited<ReturnType<typeof tryInsert>> | null = null

    for (const estado of ['Pendiente', 'pendiente', 'en_revision', 'pendiente_verificacion', 'pending']) {
      const r = await tryInsert(basePayload(estado))
      if (!r.error && r.data) { ins = r; break }
      ins = r
      if (r.error && !shouldTryNextInsertShape(r.error.message)) break
    }

    if (!ins || ins.error) {
      return NextResponse.json(
        { error: ins?.error?.message || 'No se pudo insertar la notificación.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, notificacion: ins.data })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al notificar pago' },
      { status: 500 }
    )
  }
}
