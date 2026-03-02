import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase-server'
import { getAppId } from '@/lib/utils/appId'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('user_id', user.id).limit(1).single()
    const tenantId = perfil?.empresa_id ?? null
    if (!tenantId) return NextResponse.json({ error: 'No se pudo determinar la empresa' }, { status: 400 })

    const appId = getAppId() || 'electro'

    let data: any[] = []
    let error: unknown = null

    try {
      const admin = createServiceRoleClient()
      let q = admin
        .from('tenant_backups')
        .select('id, tipo, created_at, app_id')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (appId) q = q.or(`app_id.eq.${appId},app_id.is.null`)
      const result = await q
      data = result.data ?? []
      error = result.error
      if (error) {
        const fallback = await admin
          .from('tenant_backups')
          .select('id, tipo, created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(50)
        data = fallback.data ?? []
        error = null
      }
    } catch {
      // Sin SUPABASE_SERVICE_ROLE_KEY: usar cliente del usuario (RLS devuelve solo su tenant)
      const result = await supabase
        .from('tenant_backups')
        .select('id, tipo, created_at, app_id')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50)
      data = result.data ?? []
      error = result.error
    }

    if (error) {
      return NextResponse.json({ backups: [] })
    }

    const filtered = appId ? data.filter((r: any) => r.app_id === appId || r.app_id == null) : data
    return NextResponse.json({ backups: filtered })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al listar backups'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
