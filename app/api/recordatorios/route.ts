import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
    const resendKey = (process.env.RESEND_API_KEY ?? '').trim()
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Supabase no configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' }, { status: 500 })
    }
    if (!resendKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY no configurada' }, { status: 500 })
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const resend = new Resend(resendKey)

    // Fecha: Hoy + 2 días
    const fecha = new Date()
    fecha.setDate(fecha.getDate() + 2)
    const fechaBusqueda = fecha.toISOString().split('T')[0]

    // 1. Buscamos las cuotas que vencen en 2 días
    const { data: cuotas, error: cuotasError } = await supabase
      .from('cuotas_detalladas')
      .select('*')
      .eq('fecha_pago', fechaBusqueda)

    if (cuotasError) throw cuotasError
    if (!cuotas || cuotas.length === 0) {
      return NextResponse.json({ message: 'Sin pagos para: ' + fechaBusqueda })
    }

    const ventaIds = [...new Set(cuotas.map((c: any) => c.venta_id).filter(Boolean))]
    const { data: ventas } = ventaIds.length
      ? await supabase
          .from('ventas')
          .select('id,cliente_id,numero_prestamo,compania_id,monto_total,saldo_pendiente')
          .in('id', ventaIds)
      : { data: [] }
    const ventasMap = new Map((ventas || []).map((v: any) => [v.id, v]))

    const clienteIds = [...new Set((ventas || []).map((v: any) => v.cliente_id).filter(Boolean))]
    const { data: clientes } = clienteIds.length
      ? await supabase
          .from('clientes')
          .select('id,nombre_completo,email')
          .in('id', clienteIds)
      : { data: [] }
    const clientesMap = new Map((clientes || []).map((c: any) => [c.id, c]))

    const companiaIds = [...new Set((ventas || []).map((v: any) => v.compania_id).filter(Boolean))]
    const { data: companias } = companiaIds.length
      ? await supabase
          .from('companias')
          .select('id,nombre')
          .in('id', companiaIds)
      : { data: [] }
    const companiasMap = new Map((companias || []).map((c: any) => [c.id, c]))

    // 2. Evitar recordar cuotas ya pagadas
    const { data: pagos } = await supabase
      .from('pagos')
      .select('venta_id,numero_cuota')
      .in('venta_id', ventaIds)
      .eq('fecha_pago', fechaBusqueda)
    const pagosSet = new Set(
      (pagos || []).map((p: any) => `${p.venta_id}-${p.numero_cuota ?? 'Inicial'}`)
    )

    const envios = await Promise.all(
      cuotas.map(async (cuota: any) => {
        const venta = ventasMap.get(cuota.venta_id)
        const cliente = venta ? clientesMap.get(venta.cliente_id) : undefined
        const compania = venta ? companiasMap.get(venta.compania_id) : undefined
        const numeroCuota = cuota.numero_cuota ?? 'Inicial'

        if (pagosSet.has(`${cuota.venta_id}-${numeroCuota}`)) {
          return { status: 'skipped', n: cuota.venta_id }
        }

        if (!cliente?.email) return { status: 'skipped', n: cuota.venta_id }

        const nombreCopia = compania?.nombre || 'Jasi Corporations'

        return resend.emails.send({
          from: 'Soporte JasiCorp <soporte@jasicorporations.com>',
          to: cliente.email,
          subject: `Recordatorio de Pago - Préstamo ${venta?.numero_prestamo || cuota.venta_id}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
              <h2 style="color: #1a56db;">Hola ${cliente.nombre_completo},</h2>
              <p>Te recordamos tu próximo pago de <strong>${nombreCopia}</strong>:</p>
              <div style="background: #f3f4f6; padding: 15px; border-radius: 5px;">
                <p><strong>Préstamo #:</strong> ${venta?.numero_prestamo || cuota.venta_id}</p>
                <p><strong>Cuota #:</strong> ${numeroCuota}</p>
                <p><strong>Monto Cuota:</strong> $${Number(cuota.cuota_fija).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
                <p><strong>Vence el:</strong> ${cuota.fecha_pago}</p>
              </div>
              <p>Realiza tu pago para evitar inconvenientes.</p>
            </div>
          `,
        })
      })
    )

    return NextResponse.json({ success: true, procesados: envios.length })
  } catch (err: any) {
    return NextResponse.json({ error: 'Error de ejecución', details: err.message }, { status: 500 })
  }
}

