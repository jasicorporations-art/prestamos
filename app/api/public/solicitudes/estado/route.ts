import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function normalizeCedula(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/-/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const admin = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))
    const cedula = normalizeCedula(String(body?.cedula ?? '').trim())
    const pin = String(body?.pin ?? '').trim()

    if (!cedula || !pin) {
      return NextResponse.json({ error: 'Cédula y PIN son obligatorios' }, { status: 400 })
    }

    const pinHash = createHash('sha256').update(pin).digest('hex')
    const { data, error } = await admin
      .from('solicitudes_prestamos')
      .select('id, estado, created_at, id_empresa, datos_cliente, descripcion, monto_solicitado, pin_hash')
      .eq('pin_hash', pinHash)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const found = (data || []).find((r: any) => String(r?.datos_cliente?.cedula || '') === cedula)
    if (!found) {
      return NextResponse.json({ error: 'No se encontró solicitud con esos datos' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      solicitud: {
        id: found.id,
        estado: found.estado,
        created_at: found.created_at,
        monto_solicitado: found.monto_solicitado,
        descripcion: found.descripcion,
      },
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error consultando estado' }, { status: 500 })
  }
}
