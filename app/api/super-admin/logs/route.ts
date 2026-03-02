import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/auth-super-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id') || undefined
    const desde = searchParams.get('desde') || undefined
    const hasta = searchParams.get('hasta') || undefined

    const admin = createServiceRoleClient()
    let q = admin.from('system_logs').select('id,tenant_id,user_id,endpoint,error_message,correlation_id,created_at').order('created_at', { ascending: false }).limit(200)
    if (tenantId) q = q.eq('tenant_id', tenantId)
    if (desde) q = q.gte('created_at', desde)
    if (hasta) q = q.lte('created_at', hasta)
    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ logs: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
