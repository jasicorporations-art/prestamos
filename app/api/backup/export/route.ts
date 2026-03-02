import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase-server'
import { actividadService } from '@/lib/services/actividad'
import { getAppId } from '@/lib/utils/appId'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TABLES = ['clientes', 'motores', 'ventas', 'pagos'] as const
const BRONCE_BACKUP_INTERVAL_DAYS = 30

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const appId = getAppId() || 'electro'
    const planType = (user.user_metadata?.planType as string) || 'TRIAL'

    const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('user_id', user.id).limit(1).single()
    const tenantId = perfil?.empresa_id ?? (user.user_metadata?.compania as string) ?? null
    if (!tenantId) return NextResponse.json({ error: 'No se pudo determinar la empresa' }, { status: 400 })

    // Plan Bronce: solo 1 backup cada 30 días
    if (planType === 'BRONCE') {
      const admin = createServiceRoleClient()
      const { data: lastBackups } = await admin
        .from('tenant_backups')
        .select('created_at')
        .eq('tenant_id', tenantId)
        .eq('tipo', 'manual')
        .order('created_at', { ascending: false })
        .limit(1)
      const lastBackup = lastBackups?.[0]
      if (lastBackup?.created_at) {
        const lastDate = new Date(lastBackup.created_at)
        const now = new Date()
        const diffMs = now.getTime() - lastDate.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        if (diffDays < BRONCE_BACKUP_INTERVAL_DAYS) {
          const nextDate = new Date(lastDate)
          nextDate.setDate(nextDate.getDate() + BRONCE_BACKUP_INTERVAL_DAYS)
          return NextResponse.json({
            error: `Plan Bronce: solo puedes realizar un backup cada 30 días. Tu último backup fue hace ${diffDays} días. Próximo disponible: ${nextDate.toLocaleDateString('es-DO')}.`,
            nextAvailableAt: nextDate.toISOString(),
          }, { status: 403 })
        }
      }
    }

    const tables: Record<string, unknown[]> = {}
    for (const table of TABLES) {
      let q = supabase.from(table).select('*')
      try {
        q = q.or(`compania_id.eq.${tenantId},empresa_id.eq.${tenantId}`)
        if (appId) q = q.eq('app_id', appId)
      } catch {
        q = q.eq('compania_id', tenantId)
      }
      const { data, error } = await q
      if (error) {
        const fallback = await supabase.from(table).select('*').eq('compania_id', tenantId)
        tables[table] = (fallback.data ?? []).filter((r: any) => !appId || r.app_id === appId)
      } else {
        tables[table] = data ?? []
      }
    }

    const backup = {
      exportDate: new Date().toISOString(),
      tenantId,
      appId,
      version: 1,
      tables,
    }

    // Guardar en la nube para poder restaurar desde cualquier dispositivo
    const nombreBackup = `Backup manual ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
    const payload: Record<string, unknown> = {
      tenant_id: tenantId,
      backup_data: backup,
      datos: backup, // por si la tabla usa columna "datos" en lugar de o además de backup_data
      tipo: 'manual',
      app_id: appId,
      nombre: nombreBackup,
    }
    let savedToCloud = false
    try {
      const admin = createServiceRoleClient()
      const { error: insertErr } = await admin.from('tenant_backups').insert(payload)
      if (insertErr && (insertErr.message?.includes('column') || insertErr.message?.includes('app_id'))) {
        const payloadSinAppId = { ...payload }
        delete payloadSinAppId.app_id
        const res2 = await admin.from('tenant_backups').insert(payloadSinAppId)
        if (!res2.error) savedToCloud = true
      } else if (!insertErr) {
        savedToCloud = true
      }
    } catch {
      // Sin SUPABASE_SERVICE_ROLE_KEY: intentar con el cliente del usuario (RLS)
    }
    if (!savedToCloud) {
      const { error: userInsertErr } = await supabase.from('tenant_backups').insert(payload)
      if (!userInsertErr) savedToCloud = true
      else (backup as Record<string, unknown>).saveError = userInsertErr.message
    }

    // Registrar en Admin/Historial para constancia
    try {
      const totalRegistros = Object.values(tables).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
      await actividadService.registrarActividadDesdeServidor(
        supabase,
        'Descargó backup',
        `Exportó copia de seguridad: ${totalRegistros} registro(s) (clientes, motores, ventas, pagos). Guardado en la nube.`,
        'backup',
        undefined
      )
    } catch (logErr) {
      console.warn('Error registrando actividad de backup:', logErr)
    }

    return NextResponse.json({ ...backup, savedToCloud })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al exportar'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
