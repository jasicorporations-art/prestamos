import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Registra un error en system_logs para el Centro de Comando (correlation_id, endpoint, etc.)
 * Cualquier usuario autenticado puede insertar (RLS permite INSERT).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { endpoint, error_message, correlation_id } = body as {
      endpoint?: string
      error_message?: string
      correlation_id?: string
    }

    let tenant_id: string | null = null
    const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('user_id', user.id).limit(1).single()
    if (perfil?.empresa_id) tenant_id = perfil.empresa_id

    const { error } = await supabase.from('system_logs').insert({
      tenant_id,
      user_id: user.id,
      endpoint: endpoint || null,
      error_message: error_message || null,
      correlation_id: correlation_id || null,
    })

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
