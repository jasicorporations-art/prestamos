import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase-server'
import { getAppId } from '@/lib/utils/appId'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REQUIRED_TABLES = ['clientes', 'ventas', 'pagos']

function validateBackup(backup: unknown): { ok: true; data: { tenantId: string; appId: string | undefined; tables: Record<string, unknown[]> } } | { ok: false; error: string } {
  if (!backup || typeof backup !== 'object' || !('tables' in backup)) {
    return { ok: false, error: 'JSON inválido: falta objeto tables' }
  }
  const tables = (backup as { tables?: Record<string, unknown> }).tables
  if (!tables || typeof tables !== 'object') {
    return { ok: false, error: 'Falta objeto tables en el backup' }
  }
  for (const key of REQUIRED_TABLES) {
    if (!(key in tables) || !Array.isArray(tables[key])) {
      return { ok: false, error: `Falta tabla requerida: ${key}` }
    }
  }
  const tenantId = (backup as { tenantId?: string }).tenantId
  if (!tenantId || typeof tenantId !== 'string') {
    return { ok: false, error: 'Falta tenantId en el backup' }
  }
  const appId = (backup as { appId?: string }).appId
  return {
    ok: true,
    data: {
      tenantId,
      appId: typeof appId === 'string' && appId ? appId : undefined,
      tables: tables as Record<string, unknown[]>,
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    let backup = body.backup
    const backupId = body.backupId as string | undefined
    const companyNameConfirm = typeof body.companyNameConfirm === 'string' ? body.companyNameConfirm.trim() : ''

    if (!companyNameConfirm) {
      return NextResponse.json({ error: 'Debe escribir el nombre de su empresa para confirmar' }, { status: 400 })
    }

    const currentAppId = getAppId() || 'electro'
    const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('user_id', user.id).limit(1).single()
    const userTenantId = perfil?.empresa_id ?? null
    if (!userTenantId) {
      return NextResponse.json({ error: 'No se pudo determinar su empresa' }, { status: 400 })
    }

    if (backupId && !backup) {
      const adminFetch = createServiceRoleClient()
      const { data: row, error: fetchError } = await adminFetch
        .from('tenant_backups')
        .select('backup_data, datos, tenant_id, app_id')
        .eq('id', backupId)
        .single()
      if (fetchError || !row) {
        return NextResponse.json({ error: 'Backup no encontrado o no tienes acceso' }, { status: 404 })
      }
      if (row.tenant_id !== userTenantId) {
        return NextResponse.json({ error: 'El backup no pertenece a su empresa' }, { status: 403 })
      }
      if (row.app_id != null && row.app_id !== '' && row.app_id !== currentAppId) {
        return NextResponse.json({ error: 'Este backup es de otra aplicación' }, { status: 403 })
      }
      backup = (row as { backup_data?: unknown; datos?: unknown }).backup_data ?? (row as { datos?: unknown }).datos
    }

    if (!backup) {
      return NextResponse.json({ error: 'Debe enviar un archivo de backup o seleccionar un backup guardado' }, { status: 400 })
    }

    const validation = validateBackup(backup)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { tenantId, appId: backupAppId, tables } = validation.data

    if (backupAppId != null && backupAppId !== '' && backupAppId !== currentAppId) {
      return NextResponse.json({
        error: `Este backup es de la aplicación "${backupAppId}". Solo puedes restaurarlo desde esa aplicación. Estás en "${currentAppId}".`,
      }, { status: 400 })
    }

    // No permitir restauración si el backup no tiene datos: evitar borrar todo sin restaurar nada
    const totalRows =
      (tables.clientes?.length ?? 0) +
      (tables.ventas?.length ?? 0) +
      (tables.pagos?.length ?? 0)
    if (totalRows === 0) {
      return NextResponse.json({
        error: 'El archivo de backup no contiene datos para restaurar (clientes, ventas o pagos están vacíos). No se realizó ningún cambio.',
      }, { status: 400 })
    }

    const admin = createServiceRoleClient()
    const { data: empresas } = await admin.from('empresas').select('id,nombre').or(`id.eq.${userTenantId},nombre.eq.${userTenantId}`)
    const empresa = empresas?.[0] as { id: string; nombre: string } | undefined
    const companyName = empresa?.nombre ?? userTenantId

    if (companyNameConfirm.toLowerCase() !== companyName.toLowerCase()) {
      return NextResponse.json({
        error: 'El nombre de la empresa no coincide. Escriba exactamente el nombre de su empresa para confirmar.',
      }, { status: 400 })
    }

    if (tenantId !== userTenantId) {
      return NextResponse.json({ error: 'El backup no pertenece a su empresa' }, { status: 400 })
    }

    const preBackup = {
      exportDate: new Date().toISOString(),
      tenantId: userTenantId,
      appId: currentAppId,
      version: 1,
      tables: {} as Record<string, unknown[]>,
    }
    for (const table of ['clientes', 'motores', 'ventas', 'pagos']) {
      let q = admin.from(table).select('*').or(`compania_id.eq.${userTenantId},empresa_id.eq.${userTenantId}`)
      if (currentAppId) q = q.eq('app_id', currentAppId)
      const { data } = await q
      preBackup.tables[table] = (data ?? []) as unknown[]
    }
    try {
      const preBackupNombre = `Pre-restauración ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
      await admin.from('tenant_backups').insert({
        tenant_id: userTenantId,
        backup_data: preBackup,
        datos: preBackup,
        tipo: 'pre_restauracion',
        app_id: currentAppId,
        nombre: preBackupNombre,
      })
    } catch (e) {
      console.warn('No se pudo guardar backup pre-restauración (tabla tenant_backups puede no existir):', e)
    }

    const { data: rpcResult, error: rpcError } = await admin.rpc('restore_tenant_backup', {
      p_tenant_id: userTenantId,
      p_backup: { tenantId, appId: currentAppId, tables },
      p_app_id: currentAppId,
    })

    if (rpcError) {
      return NextResponse.json({
        error: 'Error en restauración: ' + (rpcError.message || 'consulte los logs'),
        preRestoreBackup: preBackup,
      }, { status: 500 })
    }

    const result = rpcResult as { ok?: boolean; error?: string } | null
    if (result && !result.ok) {
      return NextResponse.json({
        error: result.error || 'Restauración falló',
        preRestoreBackup: preBackup,
      }, { status: 400 })
    }

    // Registrar en Admin/Historial para constancia
    try {
      const { actividadService } = await import('@/lib/services/actividad')
      await actividadService.registrarActividadDesdeServidor(
        supabase,
        'Restauró desde backup',
        'Restauró la cartera desde un archivo de backup. Se generó Backup Pre-Restauración.',
        'backup',
        undefined
      )
    } catch (logErr) {
      console.warn('Error registrando actividad de restauración:', logErr)
    }

    return NextResponse.json({
      ok: true,
      message: 'Restauración completada. Se generó un Backup Pre-Restauración.',
      preRestoreBackup: preBackup,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al restaurar'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
