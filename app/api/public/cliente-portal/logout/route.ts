import { NextResponse } from 'next/server'
import { CLIENTE_PORTAL_COOKIE_NAME } from '@/lib/server/clientePortalSession'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(CLIENTE_PORTAL_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return res
}
