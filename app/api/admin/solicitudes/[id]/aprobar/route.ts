import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { calcularAmortizacionFrancesa } from '@/lib/services/amortizacion'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function n(value: unknown): number {
  const x = Number(value)
  return Number.isFinite(x) ? x : 0
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

function calcularResumenFinanciero(params: {
  montoSolicitado: number
  gastoCierreMonto: number
  interesPrestamo: number
  cantidadCuotas: number
  metodoInteres: 'fijo' | 'sobre_saldo'
}) {
  const monto = Math.max(0, Number(params.montoSolicitado || 0))
  const gasto = Math.max(0, Number(params.gastoCierreMonto || 0))
  const nCuotas = Math.max(1, Math.floor(Number(params.cantidadCuotas || 1)))
  const i = Math.max(0, Number(params.interesPrestamo || 0)) / 100
  const capital = round2(monto + gasto)
  if (params.metodoInteres === 'fijo') {
    const interesesTotales = round2(capital * i * nCuotas)
    const montoTotal = round2(capital + interesesTotales)
    const cuotaFija = round2(montoTotal / nCuotas)
    return { capital, interesesTotales, montoTotal, cuotaFija }
  }
  if (i === 0) {
    const cuotaFija = round2(capital / nCuotas)
    return { capital, interesesTotales: 0, montoTotal: capital, cuotaFija }
  }
  const factor = Math.pow(1 + i, nCuotas)
  const cuotaFija = round2((capital * i * factor) / (factor - 1))
  const montoTotal = round2(cuotaFija * nCuotas)
  const interesesTotales = round2(montoTotal - capital)
  return { capital, interesesTotales, montoTotal, cuotaFija }
}

async function getPerfil(admin: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const p1 = await admin.from('perfiles').select('rol, empresa_id, sucursal_id').eq('user_id', userId).maybeSingle()
  if (p1.data) return p1.data as { rol?: string; empresa_id?: string | null; sucursal_id?: string | null }
  const p2 = await admin.from('perfiles').select('rol, empresa_id, sucursal_id').eq('usuario_id', userId).maybeSingle()
  return (p2.data || null) as { rol?: string; empresa_id?: string | null; sucursal_id?: string | null } | null
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const admin = getSupabaseAdmin()
    const perfil = await getPerfil(admin, user.id)
    const rol = (perfil?.rol || '').toLowerCase().replace(/\s+/g, '_')
    const esAdmin = rol === 'admin' || rol === 'super_admin' || rol === 'superadmin'
    if (!esAdmin || !perfil?.empresa_id) return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })

    const solicitudId = params.id
    const { data: sol, error: solErr } = await admin
      .from('solicitudes_prestamos')
      .select('*')
      .eq('id', solicitudId)
      .eq('id_empresa', perfil.empresa_id)
      .maybeSingle()

    if (solErr || !sol) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    if (sol.estado === 'aprobado') return NextResponse.json({ ok: true, solicitud: sol })

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const dc = (sol.datos_cliente || {}) as Record<string, unknown>
    const cedula = String(dc.cedula || '').trim()
    const nombre = String(dc.nombre || 'Cliente').trim()
    const telefono = String(dc.telefono || '').trim()
    const direccion = String(dc.direccion || '').trim()
    const nombreGarante = String(dc.nombre_garante || '').trim()
    const telefonoGarante = String(dc.telefono_garante || '').trim()
    const direccionGarante = String(dc.direccion_garante || '').trim()
    const ingresos = n(dc.ingresos)
    const gastos = n(dc.gastos)
    const cantidadCuotasRaw = n(body.cantidad_cuotas ?? dc.cantidad_cuotas)
    const cantidadCuotas = cantidadCuotasRaw > 0 ? Math.floor(cantidadCuotasRaw) : 12
    const tipoPlazoRaw = String(body.tipo_plazo || dc.tipo_plazo || 'mensual').toLowerCase()
    const tipoPlazo = (['diario', 'semanal', 'quincenal', 'mensual'].includes(tipoPlazoRaw) ? tipoPlazoRaw : 'mensual') as 'diario' | 'semanal' | 'quincenal' | 'mensual'
    const diaPagoSemanalRaw = n(body.dia_pago_semanal ?? dc.dia_pago_semanal)
    const diaPagoSemanal = Number.isInteger(diaPagoSemanalRaw) && diaPagoSemanalRaw >= 0 && diaPagoSemanalRaw <= 6 ? Math.floor(diaPagoSemanalRaw) : null
    const fechaInicioQuincenalRaw = String(body.fecha_inicio_quincenal ?? dc.fecha_inicio_quincenal ?? '').trim()
    const fechaInicioQuincenal = fechaInicioQuincenalRaw || null
    const metodoInteresRaw = String(body.metodo_interes || 'fijo').toLowerCase()
    const metodoInteres = (['fijo', 'sobre_saldo'].includes(metodoInteresRaw) ? metodoInteresRaw : 'fijo') as 'fijo' | 'sobre_saldo'
    const interesPrestamo = n(body.interes_prestamo ?? 0.2)
    const descripcion = String(sol.descripcion || '').trim()
    const fotoPerfilUrl = String(dc.foto_perfil_url || '').trim() || null
    const monto = n(body.monto_solicitado ?? sol.monto_solicitado)
    const gastoCierreMonto = n(body.gasto_cierre_monto ?? (monto * 0.045))
    const resumenFinanciero = calcularResumenFinanciero({
      montoSolicitado: monto,
      gastoCierreMonto,
      interesPrestamo,
      cantidadCuotas,
      metodoInteres,
    })

    let clienteId: string | null = null
    const cli = await admin
      .from('clientes')
      .select('id')
      .eq('id_empresa', perfil.empresa_id)
      .eq('cedula', cedula)
      .maybeSingle()
    if (cli.data?.id) {
      clienteId = cli.data.id
      if (fotoPerfilUrl) {
        // Si ya existe el cliente, refrescamos su foto de perfil
        const updFoto = await admin
          .from('clientes')
          .update({
            foto_url: fotoPerfilUrl,
            foto_updated_at: new Date().toISOString(),
          })
          .eq('id', clienteId)
          .eq('id_empresa', perfil.empresa_id)
        if (updFoto.error) {
          return NextResponse.json({ error: updFoto.error.message }, { status: 500 })
        }
      }
    } else {
      const insCli = await admin
        .from('clientes')
        .insert({
          empresa_id: perfil.empresa_id,
          sucursal_id: perfil.sucursal_id || null,
          nombre_completo: nombre,
          cedula,
          celular: telefono || null,
          direccion: direccion || `Ingresos aprox: ${ingresos || 0} | Gastos aprox: ${gastos || 0}`,
          nombre_garante: nombreGarante || 'Pendiente',
          telefono_garante: telefonoGarante || null,
          direccion_garante: direccionGarante || null,
          foto_url: fotoPerfilUrl,
          foto_updated_at: fotoPerfilUrl ? new Date().toISOString() : null,
        })
        .select('id')
        .single()
      if (insCli.error) return NextResponse.json({ error: insCli.error.message }, { status: 500 })
      clienteId = insCli.data.id
    }

    const numero = `SOL-${Date.now().toString().slice(-8)}`
    const insMotor = await admin
      .from('motores')
      .insert({
        empresa_id: perfil.empresa_id,
        marca: 'Préstamo solicitado',
        modelo: descripcion || 'Solicitud externa',
        matricula: `MAT-${numero}`,
        numero_chasis: numero,
        precio_venta: monto,
        estado: 'Disponible',
        cantidad: 1,
        tipo_negocio: 'prestamo_personal',
        especificaciones: { origen: 'solicitud_externa', descripcion, fotos_producto: sol.fotos_producto || [] },
        urls_fotos: Array.isArray(sol.fotos_producto) ? sol.fotos_producto : [],
      })
      .select('id')
      .single()
    if (insMotor.error) return NextResponse.json({ error: insMotor.error.message }, { status: 500 })

    const insVenta = await admin
      .from('ventas')
      .insert({
        empresa_id: perfil.empresa_id,
        sucursal_id: perfil.sucursal_id || null,
        motor_id: insMotor.data.id,
        cliente_id: clienteId,
        monto_total: resumenFinanciero.montoTotal,
        saldo_pendiente: resumenFinanciero.montoTotal,
        cantidad_cuotas: cantidadCuotas,
        plazo_meses: tipoPlazo === 'mensual' ? cantidadCuotas : null,
        tipo_plazo: tipoPlazo,
        dia_pago_mensual: 15,
        dia_pago_semanal: tipoPlazo === 'semanal' ? diaPagoSemanal : null,
        fecha_inicio_quincenal: tipoPlazo === 'quincenal' ? fechaInicioQuincenal : null,
        porcentaje_interes: interesPrestamo,
        metodo_interes: metodoInteres,
        tipo_interes: 'interes',
        status: 'pending',
        tipo_pago: 'financiamiento',
        tipo_garantia: 'Ninguna',
      })
      .select('id')
      .single()
    if (insVenta.error) return NextResponse.json({ error: insVenta.error.message }, { status: 500 })

    const cuotasDetalle = calcularAmortizacionFrancesa({
      monto_total: round2(monto + gastoCierreMonto),
      tasa_interes_anual: interesPrestamo,
      plazo_meses: cantidadCuotas,
      fecha_inicio: new Date().toISOString(),
      tipo_plazo: tipoPlazo,
      dia_pago_mensual: 15,
      dia_pago_semanal: tipoPlazo === 'semanal' ? (diaPagoSemanal ?? undefined) : undefined,
      fecha_inicio_quincenal: tipoPlazo === 'quincenal' ? (fechaInicioQuincenal ?? undefined) : undefined,
      metodo_interes: metodoInteres,
    })
    if (cuotasDetalle.length > 0) {
      const rows = cuotasDetalle.map((c) => ({
        venta_id: insVenta.data.id,
        empresa_id: perfil.empresa_id,
        numero_cuota: c.numero_cuota,
        fecha_pago: c.fecha_pago,
        cuota_fija: c.cuota_fija,
        monto_cuota: c.cuota_fija,
        interes_mes: c.interes_mes,
        abono_capital: c.abono_capital,
        saldo_pendiente: c.saldo_pendiente,
      }))
      const cuotasIns = await admin.from('cuotas_detalladas').insert(rows)
      if (cuotasIns.error) {
        return NextResponse.json({ error: cuotasIns.error.message }, { status: 500 })
      }
    }

    const upd = await admin
      .from('solicitudes_prestamos')
      .update({
        estado: 'aprobado',
        aprobado_cliente_id: clienteId,
        aprobado_motor_id: insMotor.data.id,
        aprobado_venta_id: insVenta.data.id,
        aprobado_por_user_id: user.id,
        fecha_decision: new Date().toISOString(),
        datos_cliente: {
          ...(sol.datos_cliente || {}),
          calculo_aprobado: {
            monto_solicitado: monto,
            gasto_cierre_monto: gastoCierreMonto,
            interes_prestamo: interesPrestamo,
            cantidad_cuotas: cantidadCuotas,
            tipo_plazo: tipoPlazo,
            dia_pago_semanal: tipoPlazo === 'semanal' ? diaPagoSemanal : null,
            fecha_inicio_quincenal: tipoPlazo === 'quincenal' ? fechaInicioQuincenal : null,
            metodo_interes: metodoInteres,
            cuota_estimada: resumenFinanciero.cuotaFija,
            monto_total: resumenFinanciero.montoTotal,
            intereses_totales: resumenFinanciero.interesesTotales,
          },
        },
      })
      .eq('id', solicitudId)
      .select('*')
      .single()
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 })

    return NextResponse.json({ ok: true, solicitud: upd.data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al aprobar solicitud' }, { status: 500 })
  }
}
