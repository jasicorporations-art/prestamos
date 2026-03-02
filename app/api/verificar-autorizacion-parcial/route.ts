import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Verifica la autorización para un pago parcial mediante la contraseña del admin.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user || authError) {
      return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { password } = body as { password?: string }

    if (!password || typeof password !== 'string' || !password.trim()) {
      return NextResponse.json({ ok: false, error: 'La contraseña es requerida' }, { status: 400 })
    }

    const { error: signError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password.trim(),
    })
    if (signError) {
      return NextResponse.json({ ok: false, error: 'Contraseña incorrecta' }, { status: 401 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error verificar-autorizacion-parcial:', err)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
