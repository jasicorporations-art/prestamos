import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { CLIENTE_PORTAL_COOKIE_NAME, readClientePortalSession } from '@/lib/server/clientePortalSession'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: { ventaId: string } }) {
  try {
    const token = request.cookies.get(CLIENTE_PORTAL_COOKIE_NAME)?.value
    const session = readClientePortalSession(token)
    if (!session) return NextResponse.json({ error: 'Sesion invalida' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const ventaId = params.ventaId

    let { data: venta, error } = await admin
      .from('ventas')
      .select('id,empresa_id,cliente_id,numero_prestamo,monto_total,saldo_pendiente,cantidad_cuotas,tipo_plazo,fecha_venta,porcentaje_interes,metodo_interes,tipo_pago,descuento_contado,dia_pago_mensual,dia_pago_semanal,fecha_inicio_quincenal,motores(marca,modelo,numero_chasis),clientes(nombre_completo,cedula,direccion,celular,nombre_garante,telefono_garante,direccion_garante),empresas(nombre,rnc,direccion,telefono)')
      .eq('id', ventaId)
      .eq('empresa_id', session.empresa_id)
      .eq('cliente_id', session.cliente_id)
      .maybeSingle()
    if (error && String(error.message || '').toLowerCase().includes('column')) {
      const retry = await admin
        .from('ventas')
        .select('id,empresa_id,cliente_id,numero_prestamo,monto_total,saldo_pendiente,cantidad_cuotas,tipo_plazo,fecha_venta,motores(marca,modelo,numero_chasis),clientes(nombre_completo,cedula,direccion,celular,nombre_garante,telefono_garante,direccion_garante),empresas(nombre,rnc,direccion,telefono)')
        .eq('id', ventaId)
        .eq('empresa_id', session.empresa_id)
        .eq('cliente_id', session.cliente_id)
        .maybeSingle()
      venta = retry.data as any
      error = retry.error as any
    }
    if (!venta) return NextResponse.json({ error: 'Documento no disponible' }, { status: 404 })
    if (error) return NextResponse.json({ error: error.message || 'Error obteniendo documento' }, { status: 500 })

    const c = Array.isArray((venta as any).clientes) ? (venta as any).clientes[0] : (venta as any).clientes
    const e = Array.isArray((venta as any).empresas) ? (venta as any).empresas[0] : (venta as any).empresas
    const m = Array.isArray((venta as any).motores) ? (venta as any).motores[0] : (venta as any).motores
    const saldo = Number((venta as any).saldo_pendiente || 0)
    const { data: cuotas } = await admin
      .from('cuotas_detalladas')
      .select('numero_cuota,fecha_pago,cuota_fija,monto_cuota')
      .eq('venta_id', ventaId)
      .order('numero_cuota', { ascending: true })
    const { data: pagoInicial } = await admin
      .from('pagos')
      .select('monto')
      .eq('venta_id', ventaId)
      .is('numero_cuota', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      venta: {
        id: (venta as any).id,
        numero_prestamo: (venta as any).numero_prestamo,
        monto_total: Number((venta as any).monto_total || 0),
        saldo_pendiente: saldo,
        cantidad_cuotas: Number((venta as any).cantidad_cuotas || 0),
        tipo_plazo: (venta as any).tipo_plazo || 'mensual',
        fecha_venta: (venta as any).fecha_venta,
        porcentaje_interes: Number((venta as any).porcentaje_interes || 0),
        metodo_interes: (venta as any).metodo_interes || 'fijo',
        tipo_pago: (venta as any).tipo_pago || 'financiamiento',
        descuento_contado: Number((venta as any).descuento_contado || 0),
        dia_pago_mensual: (venta as any).dia_pago_mensual ?? null,
        dia_pago_semanal: (venta as any).dia_pago_semanal ?? null,
        fecha_inicio_quincenal: (venta as any).fecha_inicio_quincenal ?? null,
      },
      cliente: {
        nombre_completo: c?.nombre_completo || '',
        cedula: c?.cedula || '',
        direccion: c?.direccion || '',
        celular: c?.celular || '',
        nombre_garante: c?.nombre_garante || '',
        telefono_garante: c?.telefono_garante || '',
        direccion_garante: c?.direccion_garante || '',
      },
      motor: {
        marca: m?.marca || '',
        modelo: m?.modelo || '',
        numero_chasis: m?.numero_chasis || '',
      },
      empresa: {
        nombre: e?.nombre || '',
        rnc: e?.rnc || '',
        direccion: e?.direccion || '',
        telefono: e?.telefono || '',
      },
      cuotas: (cuotas || []).map((q: any) => ({
        numero_cuota: Number(q.numero_cuota || 0),
        fecha_pago: q.fecha_pago || null,
        cuota_fija: Number(q.cuota_fija || q.monto_cuota || 0),
      })),
      pago_inicial: Number((pagoInicial as any)?.monto || 0),
      carta_saldo_disponible: saldo <= 0.0001,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error obteniendo documento' }, { status: 500 })
  }
}
