import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getPerfilPagosVerificar, isRolAdminOSuper } from '@/lib/server/require-admin-api'
import {
  parseFechaLocalMidnight,
  toLocalMidnight,
  calcularDiasAtraso,
  calcularFechaVencimiento,
} from '@/lib/services/mora'
import { calcularFechaVencimientoCuota } from '@/lib/services/proximoVencimiento'
import { calcularPerfilPagoFromData } from '@/lib/services/perfilPago'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface HistorialPrestamo {
  venta_id: string
  monto_original: number
  saldo_pendiente: number
  estado: 'Al día' | 'Atraso'
  dias_atraso: number
  tuvo_pagos_con_mora: boolean
  fecha_venta: string
  numero_prestamo: string | null
}

export interface GaranteItem {
  nombre: string
  telefono: string
}

/**
 * Respuesta del buró **local de la app**: consolida por cédula todos los `clientes` y préstamos
 * (`ventas`) registrados en el sistema, aunque pertenezcan a empresas distintas.
 * Requiere sesión Admin o SuperAdmin (`POST /api/admin/credito-local`).
 */
export interface CreditoLocalResponse {
  perfil: {
    nombre: string
    direccion: string
    telefono: string
    correo: string
    cedula: string
    foto_url: string | null
  }
  /** Mismo parámetro que en la carpeta del cliente: estrellas 1–5 (puede ser 4.5). */
  rating: number
  vecesPagadoConMora: number
  totalPagadoEnRecargos: number
  esAltoRiesgo: boolean
  tieneDeudaEnMora: boolean
  historial: HistorialPrestamo[]
  garantes: GaranteItem[]
  encontrado: boolean
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Servicio no disponible' }, { status: 500 })
    }

    const perfilSesion = await getPerfilPagosVerificar(admin, user.id)
    if (!isRolAdminOSuper(perfilSesion?.rol)) {
      return NextResponse.json({ error: 'Solo Admin o SuperAdmin pueden consultar Crédito Local' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    let clienteId = typeof body.cliente_id === 'string' ? body.cliente_id.trim() : ''
    const cedulaInput = typeof body.cedula === 'string' ? body.cedula.trim().replace(/\s/g, '') : ''
    if (!clienteId && cedulaInput.length >= 3) {
      const { data: porCedula } = await admin
        .from('clientes')
        .select('id')
        .eq('cedula', cedulaInput)
        .limit(1)
        .maybeSingle() as { data: { id: string } | null }
      if (porCedula?.id) clienteId = porCedula.id
    }
    if (!clienteId) {
      return NextResponse.json(
        { encontrado: false, error: 'Indica el ID o la cédula del cliente' },
        { status: 400 }
      )
    }

    const { data: clienteRow, error: errCliente } = await admin
      .from('clientes')
      .select('id, cedula, nombre_completo, direccion, celular, email, nombre_garante, telefono_garante, foto_url')
      .eq('id', clienteId)
      .maybeSingle() as {
      data: {
        id: string
        cedula: string
        nombre_completo: string
        direccion: string | null
        celular: string | null
        email: string | null
        nombre_garante: string | null
        telefono_garante: string | null
        foto_url: string | null
      } | null
      error: unknown
    }

    if (errCliente || !clienteRow) {
      return NextResponse.json({
        encontrado: false,
        perfil: { nombre: '', direccion: '', telefono: '', correo: '', cedula: '', foto_url: null },
        rating: 0,
        vecesPagadoConMora: 0,
        totalPagadoEnRecargos: 0,
        esAltoRiesgo: false,
        tieneDeudaEnMora: false,
        historial: [],
        garantes: [],
      })
    }

    const cedula = (clienteRow.cedula || '').trim()
    const { data: todosClientes } = await admin
      .from('clientes')
      .select('id, nombre_completo, direccion, celular, email, nombre_garante, telefono_garante')
      .eq('cedula', cedula) as {
      data: Array<{
        id: string
        nombre_completo: string
        direccion: string | null
        celular: string | null
        email: string | null
        nombre_garante: string | null
        telefono_garante: string | null
      }> | null
    }

    const clienteIds = (todosClientes || []).map((c) => c.id)
    let fotoUrlPublic: string | null = clienteRow.foto_url || null
    if (fotoUrlPublic && !fotoUrlPublic.startsWith('http')) {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL
      const bucket = 'avatars_clientes'
      const path = fotoUrlPublic.replace(/^\//, '').replace(/^avatars_clientes\/?/, '')
      if (base && path) fotoUrlPublic = `${base.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${path}`
    }
    const perfil = {
      nombre: clienteRow.nombre_completo || '',
      direccion: clienteRow.direccion || '',
      telefono: clienteRow.celular || '',
      correo: clienteRow.email || '',
      cedula,
      foto_url: fotoUrlPublic,
    }

    const garantesMap = new Map<string, GaranteItem>()
    for (const c of todosClientes || []) {
      const nombre = (c.nombre_garante || '').trim()
      const telefono = (c.telefono_garante || '').trim()
      if (nombre || telefono) {
        const key = `${nombre}|${telefono}`
        if (!garantesMap.has(key)) garantesMap.set(key, { nombre: nombre || '—', telefono: telefono || '—' })
      }
    }
    const garantes = Array.from(garantesMap.values())

    const { data: ventasTodas } = await admin
      .from('ventas')
      .select(
        'id, cliente_id, monto_total, saldo_pendiente, cantidad_cuotas, fecha_venta, tipo_plazo, dia_pago_mensual, dia_pago_semanal, fecha_inicio_quincenal, mora_abonada, numero_prestamo'
      )
      .in('cliente_id', clienteIds)
      .order('fecha_venta', { ascending: false }) as {
      data: Array<{
        id: string
        cliente_id: string
        monto_total: number
        saldo_pendiente: number
        cantidad_cuotas: number
        fecha_venta: string
        tipo_plazo: string | null
        dia_pago_mensual: number | null
        dia_pago_semanal: number | null
        fecha_inicio_quincenal: string | null
        mora_abonada: number | null
        numero_prestamo: string | null
      }> | null
    }

    const ventas = ventasTodas || []
    const ventaIds = ventas.map((v) => v.id)

    let cuotasRes: { data: Array<{ venta_id: string; numero_cuota: number; fecha_vencimiento?: string | null; fecha_pago?: string | null }> | null } = { data: null }
    let pagosRes: { data: Array<{ venta_id: string; numero_cuota: number | null; fecha_pago?: string; fecha_hora?: string }> | null } = { data: null }
    if (ventaIds.length > 0) {
      const [c, p] = await Promise.all([
        admin
          .from('cuotas_detalladas')
          .select('venta_id, numero_cuota, fecha_vencimiento, fecha_pago')
          .in('venta_id', ventaIds)
          .order('numero_cuota', { ascending: true }),
        admin
          .from('pagos')
          .select('venta_id, numero_cuota, fecha_pago, fecha_hora')
          .in('venta_id', ventaIds),
      ])
      cuotasRes = c as typeof cuotasRes
      pagosRes = p as typeof pagosRes
    }

    const cdMap = new Map<string, Array<{ numero_cuota: number; fecha_vencimiento: Date | null }>>()
    for (const row of cuotasRes.data || []) {
      if (!cdMap.has(row.venta_id)) cdMap.set(row.venta_id, [])
      const fVenc =
        row.fecha_vencimiento != null && String(row.fecha_vencimiento).trim() !== ''
          ? parseFechaLocalMidnight(String(row.fecha_vencimiento))
          : null
      cdMap.get(row.venta_id)!.push({ numero_cuota: row.numero_cuota, fecha_vencimiento: fVenc })
    }
    const pagosPorVenta = new Map<string, Set<number>>()
    for (const row of pagosRes.data || []) {
      if (!pagosPorVenta.has(row.venta_id)) pagosPorVenta.set(row.venta_id, new Set())
      if (row.numero_cuota != null) pagosPorVenta.get(row.venta_id)!.add(Number(row.numero_cuota))
    }

    const hoy = toLocalMidnight(new Date())
    const historial: HistorialPrestamo[] = []
    let tieneDeudaEnMora = false
    let totalDiasAtraso = 0
    let vecesRecargo = 0

    for (const venta of ventas) {
      const pagadas = pagosPorVenta.get(venta.id) ?? new Set()
      const cantidadCuotas = venta.cantidad_cuotas ?? 0
      const ventaPayload = {
        fecha_venta: venta.fecha_venta,
        tipo_plazo: (venta.tipo_plazo || 'mensual') as 'diario' | 'semanal' | 'quincenal' | 'mensual',
        dia_pago_mensual: venta.dia_pago_mensual ?? undefined,
        dia_pago_semanal: venta.dia_pago_semanal ?? undefined,
        fecha_inicio_quincenal: venta.fecha_inicio_quincenal ?? undefined,
      }
      let maxDiasVenta = 0
      for (let n = 1; n <= cantidadCuotas; n++) {
        if (pagadas.has(n)) continue
        const detalle = cdMap.get(venta.id)?.find((d) => d.numero_cuota === n)
        let fechaVenc: Date
        if (detalle?.fecha_vencimiento) {
          fechaVenc = detalle.fecha_vencimiento
        } else {
          fechaVenc = venta.tipo_plazo
            ? calcularFechaVencimientoCuota(ventaPayload, n)
            : calcularFechaVencimiento(new Date(venta.fecha_venta), n, cantidadCuotas)
        }
        const dias = calcularDiasAtraso(fechaVenc, hoy)
        if (dias > 0) {
          maxDiasVenta = Math.max(maxDiasVenta, dias)
          tieneDeudaEnMora = true
        }
      }
      if (Number(venta.mora_abonada || 0) > 0) vecesRecargo++
      totalDiasAtraso += maxDiasVenta
      historial.push({
        venta_id: venta.id,
        monto_original: Number(venta.monto_total),
        saldo_pendiente: Number(venta.saldo_pendiente),
        estado: maxDiasVenta > 0 ? 'Atraso' : 'Al día',
        dias_atraso: maxDiasVenta,
        tuvo_pagos_con_mora: Number(venta.mora_abonada || 0) > 0,
        fecha_venta: venta.fecha_venta,
        numero_prestamo: venta.numero_prestamo,
      })
    }

    const cuotasData = (cuotasRes.data || []).map((row) => ({
      venta_id: row.venta_id,
      numero_cuota: row.numero_cuota,
      fecha_pago: row.fecha_pago ?? row.fecha_vencimiento ?? null,
    }))
    const pagosData = (pagosRes.data || []).map((p) => ({
      venta_id: p.venta_id,
      numero_cuota: p.numero_cuota ?? null,
      fecha_pago: p.fecha_pago,
      fecha_hora: p.fecha_hora,
    }))
    const ventasPerfil = ventas.map((v) => ({
      id: v.id,
      fecha_venta: v.fecha_venta,
      tipo_plazo: v.tipo_plazo ?? null,
      dia_pago_mensual: v.dia_pago_mensual ?? null,
      dia_pago_semanal: v.dia_pago_semanal ?? null,
      fecha_inicio_quincenal: v.fecha_inicio_quincenal ?? null,
      mora_abonada: v.mora_abonada ?? null,
    }))
    const perfilPago = calcularPerfilPagoFromData(ventasPerfil, cuotasData, pagosData)

    const payload: CreditoLocalResponse = {
      encontrado: true,
      perfil,
      rating: perfilPago.estrellas,
      vecesPagadoConMora: perfilPago.vecesPagadoConMora,
      totalPagadoEnRecargos: perfilPago.totalPagadoEnRecargos,
      esAltoRiesgo: perfilPago.esAltoRiesgo,
      tieneDeudaEnMora,
      historial,
      garantes,
    }

    return NextResponse.json(payload)
  } catch (e: unknown) {
    console.error('[credito-local]', e)
    return NextResponse.json(
      {
        encontrado: false,
        error: e instanceof Error ? e.message : 'Error inesperado',
      },
      { status: 500 }
    )
  }
}
