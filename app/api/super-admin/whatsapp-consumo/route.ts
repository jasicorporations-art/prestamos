import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  CREDITOS_BASE_MENSUAL,
  COSTO_TWILIO_POR_MENSAJE,
  GANANCIA_FIJA_PLAN,
} from '@/lib/services/whatsapp-consumo'
import { requireSuperAdmin } from '@/lib/auth-super-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function getPeriodoActual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * GET: Tabla de consumo WhatsApp por empresa para el Centro de Comando.
 * Empresa | Mensajes Enviados | Saldo Restante (de los $15) | Mi Ganancia Fija ($15)
 */
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })

  try {
    const admin = getSupabaseAdmin()
    const periodo = getPeriodoActual()

    let consumos: { empresa_id: string; mensajes_enviados?: number; creditos_extension?: number }[] = []
    const resConsumo = await admin
      .from('whatsapp_consumo_mensual')
      .select('empresa_id, mensajes_enviados, creditos_extension')
      .eq('periodo', periodo)
    if (resConsumo.error) {
      console.warn('[super-admin/whatsapp-consumo] whatsapp_consumo_mensual:', resConsumo.error.message)
    } else {
      consumos = resConsumo.data || []
    }

    const resRecargas = await admin
      .from('whatsapp_recargas')
      .select('empresa_id, creditos, monto_usd, costo_proveedor_usd, created_at')
      .gte('created_at', `${periodo}T00:00:00Z`)
    const recargas = resRecargas.error ? [] : resRecargas.data || []
    if (resRecargas.error) {
      console.warn('[super-admin/whatsapp-consumo] whatsapp_recargas:', resRecargas.error.message)
    }

    let resPerfiles = await admin
      .from('perfiles')
      .select('empresa_id, has_whatsapp_premium, has_evolution_whatsapp')
    if (resPerfiles.error && /column|does not exist/i.test(resPerfiles.error.message || '')) {
      resPerfiles = await admin.from('perfiles').select('empresa_id, has_whatsapp_premium')
    }
    const perfilesWa = resPerfiles.error ? [] : resPerfiles.data || []
    if (resPerfiles.error) {
      console.warn('[super-admin/whatsapp-consumo] perfiles:', resPerfiles.error.message)
    }

    const empresasConPremium = new Set<string>()
    for (const p of perfilesWa) {
      const eid = p.empresa_id as string | null
      if (!eid) continue
      const twilio = p.has_whatsapp_premium === true
      const evo = (p as { has_evolution_whatsapp?: boolean }).has_evolution_whatsapp === true
      if (twilio || evo) empresasConPremium.add(eid)
    }

    const consumosMap = new Map(
      consumos.map((c) => [
        c.empresa_id,
        {
          mensajes: c.mensajes_enviados ?? 0,
          extension: c.creditos_extension ?? 0,
        },
      ])
    )

    const recargasPorEmpresa = new Map<string, { count: number; montoTotal: number; costoTotal: number }>()
    for (const r of recargas) {
      const key = r.empresa_id
      const curr = recargasPorEmpresa.get(key) || { count: 0, montoTotal: 0, costoTotal: 0 }
      recargasPorEmpresa.set(key, {
        count: curr.count + 1,
        montoTotal: curr.montoTotal + (r.monto_usd ?? 0),
        costoTotal: curr.costoTotal + (r.costo_proveedor_usd ?? 0),
      })
    }

    const todasEmpresas = await admin.from('empresas').select('id, nombre').order('nombre')
    const listaEmpresas = todasEmpresas.data || []

    const filas = listaEmpresas
      .filter((e: { id: string }) => empresasConPremium.has(e.id) || consumosMap.has(e.id))
      .map((e: { id: string; nombre: string }) => {
        const c = consumosMap.get(e.id) || { mensajes: 0, extension: 0 }
        const mensajes = c.mensajes
        const recargasData = recargasPorEmpresa.get(e.id) || { count: 0, montoTotal: 0, costoTotal: 0 }
        const costoTwilio = mensajes * COSTO_TWILIO_POR_MENSAJE + recargasData.costoTotal
        return {
          empresa_id: e.id,
          empresa_nombre: e.nombre,
          creditos_consumidos: mensajes,
          recargas_compradas: recargasData.count,
          costo_twilio_usd: Number(costoTwilio.toFixed(2)),
          ganancia_fija: GANANCIA_FIJA_PLAN,
        }
      })

    return NextResponse.json({
      periodo,
      creditos_base: CREDITOS_BASE_MENSUAL,
      costo_twilio_por_mensaje: COSTO_TWILIO_POR_MENSAJE,
      filas,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: String(msg) }, { status: 500 })
  }
}
