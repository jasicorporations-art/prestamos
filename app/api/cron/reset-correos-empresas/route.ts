import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Legado: reinicia correos_consumidos en fila `empresas`.
 * Con `empresas-cuota-correos-produccion.sql` el consumo va por mes en
 * `empresas_consumo_correos_mensual` (nuevo período = nueva fila); este cron es opcional.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  const auth = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!secret || auth !== secret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin.rpc('reset_correos_consumidos_mensual')
    if (error) {
      if (/function.*does not exist|42704|42883/i.test(String(error.message))) {
        const { error: upErr } = await admin
          .from('empresas')
          .update({ correos_consumidos: 0 })
          .gte('correos_consumidos', 0)
        if (upErr) {
          if (/column|does not exist|schema cache/i.test(String(upErr.message))) {
            return NextResponse.json({
              ok: true,
              modo: 'noop',
              nota: 'Esquema de producción: consumo mensual en empresas_consumo_correos_mensual; no hay contador en empresas que reiniciar.',
            })
          }
          throw upErr
        }
        return NextResponse.json({ ok: true, modo: 'update_fallback' })
      }
      throw error
    }
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error'
    console.error('[cron/reset-correos-empresas]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
