import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/auth-super-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })
  try {
    const start = Date.now()
    const admin = createServiceRoleClient()
    await admin.from('empresas').select('id').limit(1).single()
    const ms = Date.now() - start
    const status = ms < 300 ? 'green' : ms < 800 ? 'yellow' : 'red'
    return NextResponse.json({ ms, status })
  } catch (e: any) {
    return NextResponse.json({ ms: -1, status: 'red', error: e.message }, { status: 200 })
  }
}
