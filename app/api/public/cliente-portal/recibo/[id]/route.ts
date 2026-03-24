import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { CLIENTE_PORTAL_COOKIE_NAME, readClientePortalSession } from '@/lib/server/clientePortalSession'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get(CLIENTE_PORTAL_COOKIE_NAME)?.value
    const session = readClientePortalSession(token)
    if (!session) return NextResponse.json({ error: 'Sesion invalida' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const pagoId = params.id

    let { data: pago, error } = await admin
      .from('pagos')
      .select('id,venta_id,monto,fecha_pago,numero_cuota,empresa_id,metodo_pago,referencia')
      .eq('id', pagoId)
      .maybeSingle()
    if (error && String(error.message || '').toLowerCase().includes('column')) {
      const retry = await admin
        .from('pagos')
        .select('id,venta_id,monto,fecha_pago,numero_cuota,empresa_id')
        .eq('id', pagoId)
        .maybeSingle()
      pago = retry.data as any
      error = retry.error as any
    }

    if (error || !pago) return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 })

    const { data: venta, error: ventaErr } = await admin
      .from('ventas')
      .select('id,cliente_id,empresa_id,compania_id,motor_id,numero_prestamo,saldo_pendiente')
      .eq('id', (pago as any).venta_id)
      .maybeSingle()
    if (ventaErr || !venta) return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 })

    // Determinar el empresa_id efectivo (ventas antiguas usan compania_id en lugar de empresa_id)
    const ventaEmpresaId: string = (venta as any).empresa_id || (venta as any).compania_id || ''

    // El pago debe pertenecer a este cliente
    if (venta.cliente_id !== session.cliente_id) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    // Si la venta tiene empresa asignada, debe coincidir con la sesión del portal
    if (ventaEmpresaId && ventaEmpresaId !== session.empresa_id) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const efectivoEmpresaId = ventaEmpresaId || session.empresa_id

    const [{ data: empresa }, { data: cliente }, { data: motor }] = await Promise.all([
      admin
        .from('empresas')
        .select('nombre')
        .eq('id', efectivoEmpresaId)
        .maybeSingle(),
      admin
        .from('clientes')
        .select('nombre_completo,cedula,celular')
        .eq('id', venta.cliente_id)
        .eq('empresa_id', efectivoEmpresaId)
        .maybeSingle(),
      admin
        .from('motores')
        .select('marca,modelo,numero_chasis')
        .eq('id', (venta as any).motor_id)
        .maybeSingle(),
    ])

    return NextResponse.json({
      pago: {
        id: (pago as any).id,
        monto: Number((pago as any).monto || 0),
        fecha_pago: (pago as any).fecha_pago,
        numero_cuota: (pago as any).numero_cuota,
        metodo_pago: (pago as any).metodo_pago || null,
        referencia: (pago as any).referencia || null,
      },
      venta: {
        id: venta.id,
        numero_prestamo: venta.numero_prestamo,
        saldo_pendiente: Number((venta as any).saldo_pendiente || 0),
      },
      cliente: {
        nombre_completo: cliente?.nombre_completo || null,
        cedula: cliente?.cedula || null,
        celular: cliente?.celular || null,
      },
      motor: {
        marca: motor?.marca || null,
        modelo: motor?.modelo || null,
        numero_chasis: motor?.numero_chasis || null,
        numero_chasis_real: null,
      },
      empresa_nombre: empresa?.nombre || null,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error obteniendo recibo' }, { status: 500 })
  }
}
