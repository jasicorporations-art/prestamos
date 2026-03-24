import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { signComprobanteStorageUrls } from '@/lib/server/signedComprobanteUrl'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_URLS = 40

async function getPerfil(admin: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const p1 = await admin
    .from('perfiles')
    .select('rol, empresa_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (p1.data) return p1.data as { rol?: string; empresa_id?: string | null }
  const p2 = await admin
    .from('perfiles')
    .select('rol, empresa_id')
    .eq('usuario_id', userId)
    .maybeSingle()
  return (p2.data || null) as { rol?: string; empresa_id?: string | null } | null
}

/**
 * Firma URLs del bucket `comprobantes_pagos` para que admin/cobrador puedan verlas en `<img>`.
 * Misma lógica que el GET de pagos-verificar (ficha cliente, etc.).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const perfil = await getPerfil(admin, user.id)
    const rol = String(perfil?.rol || '')
      .toLowerCase()
      .replace(/\s+/g, '_')
    const permitido =
      rol === 'admin' || rol === 'super_admin' || rol === 'cobrador'

    if (!permitido) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const urls = Array.isArray(body?.urls) ? body.urls.map((u: unknown) => String(u || '').trim()) : []
    const filtered = urls.filter(Boolean).slice(0, MAX_URLS)

    if (filtered.length === 0) {
      return NextResponse.json({ urls: [] })
    }

    const signed = await signComprobanteStorageUrls(admin, filtered)
    return NextResponse.json({ urls: signed })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al firmar URLs' },
      { status: 500 }
    )
  }
}
