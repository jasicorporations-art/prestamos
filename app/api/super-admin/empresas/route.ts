import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/auth-super-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })
  try {
    const admin = createServiceRoleClient()
    const res = await admin.from('empresas').select('id,nombre,email,status,created_at').order('nombre')
    if (res.error) {
      const msg = res.error.message || ''
      if (msg.includes('status') || msg.includes('column')) {
        const res2 = await admin.from('empresas').select('id,nombre,email,created_at').order('nombre')
        if (res2.error) throw res2.error
        const data = (res2.data || []).map((r: { id: string; nombre: string; email: string; created_at?: string }) => ({
          ...r,
          status: 'active',
        }))
        return NextResponse.json({ empresas: data })
      }
      throw res.error
    }
    return NextResponse.json({ empresas: res.data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error listando empresas' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })
  try {
    const body = await request.json()
    const { id, status } = body as { id: string; status: 'active' | 'inactive' }
    if (!id || !status || !['active', 'inactive'].includes(status)) {
      return NextResponse.json({ error: 'id y status (active|inactive) requeridos' }, { status: 400 })
    }
    const admin = createServiceRoleClient()
    const { error } = await admin.from('empresas').update({ status }).eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
