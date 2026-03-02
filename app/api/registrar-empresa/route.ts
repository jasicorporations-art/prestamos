/**
 * POST: Crea la empresa en el registro usando service role y devuelve el id.
 * Así el cliente siempre recibe el UUID aunque RLS bloquee el SELECT tras el insert.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : user.email || ''
    const rnc = typeof body.rnc === 'string' ? body.rnc.trim() : undefined
    const direccion = typeof body.direccion === 'string' ? body.direccion.trim() : undefined
    const telefono = typeof body.telefono === 'string' ? body.telefono.trim() : undefined

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre de la empresa es requerido' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const payload: Record<string, unknown> = {
      nombre,
      user_id: user.id,
      email: email || null,
    }
    if (rnc) payload.rnc = rnc
    if (direccion) payload.direccion = direccion
    if (telefono) payload.telefono = telefono

    const { data: inserted, error } = await admin
      .from('empresas')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      const msg = error.message || ''
      if (msg.includes('duplicate') || msg.includes('unique') || (error as { code?: string }).code === '23505') {
        const { data: existente } = await admin
          .from('empresas')
          .select('id')
          .eq('nombre', nombre)
          .limit(1)
          .maybeSingle()
        if (existente?.id) {
          return NextResponse.json({ id: existente.id })
        }
        return NextResponse.json({ error: 'Esta empresa ya está registrada' }, { status: 400 })
      }
      console.error('[registrar-empresa]', error)
      return NextResponse.json({ error: error.message || 'Error al crear la empresa' }, { status: 500 })
    }

    if (!inserted?.id) {
      return NextResponse.json({ error: 'No se obtuvo el ID de la empresa' }, { status: 500 })
    }

    return NextResponse.json({ id: inserted.id })
  } catch (e) {
    console.error('[registrar-empresa]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al registrar la empresa' },
      { status: 500 }
    )
  }
}
