import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next')
  const type = url.searchParams.get('type')

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const supabase = createClientFromRequest(request)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const configuredOrigin =
    process.env.NEXT_PUBLIC_PASSWORD_RESET_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://electro.jasicorporations.com'
  const safeOrigin = configuredOrigin.replace(/\/+$/, '')
  const recoveryRedirect = `${safeOrigin}/actualizar-contrasena`

  if (type === 'recovery') {
    return NextResponse.redirect(recoveryRedirect)
  }

  if (next) {
    try {
      const nextUrl = new URL(next, safeOrigin)
      return NextResponse.redirect(nextUrl.toString())
    } catch {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.redirect(new URL('/', request.url))
}
