import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase-server'
import { getAppId } from '@/lib/utils/appId'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('user_id', user.id).limit(1).single()
    const userTenantId = perfil?.empresa_id ?? null
    if (!userTenantId) return NextResponse.json({ error: 'No se pudo determinar la empresa' }, { status: 400 })

    const appId = getAppId() || 'electro'
    const { id } = await params

    let row: { backup_data?: unknown; datos?: unknown; tenant_id: string; app_id: string | null } | null = null
    try {
      const admin = createServiceRoleClient()
      const res = await admin
        .from('tenant_backups')
        .select('backup_data, datos, tenant_id, app_id')
        .eq('id', id)
        .single()
      row = res.data
      if (res.error) row = null
    } catch {
      const res = await supabase
        .from('tenant_backups')
        .select('backup_data, datos, tenant_id, app_id')
        .eq('id', id)
        .single()
      row = res.data ?? null
    }

    if (!row) {
      return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 })
    }
    if (row.tenant_id !== userTenantId) {
      return NextResponse.json({ error: 'No tienes acceso a este backup' }, { status: 403 })
    }
    if (row.app_id != null && row.app_id !== '' && row.app_id !== appId) {
      return NextResponse.json({ error: 'Este backup es de otra aplicación' }, { status: 403 })
    }

    const backupPayload = row.backup_data ?? row.datos
    if (backupPayload == null) {
      return NextResponse.json({ error: 'Backup sin datos' }, { status: 404 })
    }
    return NextResponse.json(backupPayload)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al obtener backup'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
