import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AUTO_BACKUP_SECRET = Deno.env.get('AUTO_BACKUP_SECRET')

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

type EmpresaRow = {
  id: string
  auto_backup_enabled: boolean | null
  auto_backup_frequency: string | null
  last_auto_backup_at: string | null
}

type BackupTables = {
  clientes: unknown[]
  motores: unknown[]
  ventas: unknown[]
  pagos: unknown[]
}

type BackupResult = {
  empresa_id: string
  status: 'ok' | 'skipped' | 'error'
  message?: string
}

const TABLES: (keyof BackupTables)[] = ['clientes', 'motores', 'ventas', 'pagos']

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getIntervalMs(freq: string | null): number {
  switch ((freq || '').toLowerCase()) {
    case 'daily':
      return 24 * 60 * 60 * 1000
    case '6h':
      return 6 * 60 * 60 * 1000
    case '1h':
      return 60 * 60 * 1000
    default:
      return 0
  }
}

function shouldRunBackup(lastAt: string | null, freq: string | null, now: Date): boolean {
  const intervalMs = getIntervalMs(freq)
  if (intervalMs <= 0) return false
  if (!lastAt) return true
  const last = new Date(lastAt)
  if (Number.isNaN(last.getTime())) return true
  return now.getTime() - last.getTime() >= intervalMs
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405)
    }
    if (AUTO_BACKUP_SECRET) {
      const incoming = req.headers.get('x-auto-backup-secret')
      if (!incoming || incoming !== AUTO_BACKUP_SECRET) {
        return jsonResponse({ error: 'Forbidden' }, 403)
      }
    }
    const now = new Date()
    const { data: empresas, error: empresasError } = await supabaseAdmin
      .from('empresas')
      .select('id, auto_backup_enabled, auto_backup_frequency, last_auto_backup_at')
      .eq('auto_backup_enabled', true)
    if (empresasError) {
      console.error('[auto-backup] Error listando empresas:', empresasError)
      return jsonResponse({ error: empresasError.message }, 500)
    }
    const candidates = (empresas || []) as EmpresaRow[]
    const dueEmpresas = candidates.filter((e) =>
      shouldRunBackup(e.last_auto_backup_at, e.auto_backup_frequency, now)
    )
    const results: BackupResult[] = []
    for (const empresa of dueEmpresas) {
      const tenantId = empresa.id
      try {
        const tables: BackupTables = {
          clientes: [],
          motores: [],
          ventas: [],
          pagos: [],
        }
        let tableReadFailed = false
        for (const table of TABLES) {
          const { data, error } = await supabaseAdmin
            .from(table)
            .select('*')
            .eq('empresa_id', tenantId)
          if (error) {
            console.error(`[auto-backup] Error en tabla ${table} para empresa ${tenantId}:`, error)
            tableReadFailed = true
            break
          }
          tables[table] = data ?? []
        }
        if (tableReadFailed) {
          results.push({ empresa_id: tenantId, status: 'error', message: 'table_read_failed' })
          continue
        }
        const backup = {
          exportDate: now.toISOString(),
          tenantId,
          appId: null as string | null,
          version: 1,
          source: 'automatico',
          frequency: empresa.auto_backup_frequency,
          partial: false,
          tables,
        }
        const nombreBackup = `Backup automático ${now.toISOString().slice(0, 16).replace('T', ' ')}`
        const payload = {
          tenant_id: tenantId,
          backup_data: backup,
          tipo: 'automatico',
          app_id: null as string | null,
          nombre: nombreBackup,
        }
        const { data: insertData, error: insertError } = await supabaseAdmin
          .from('tenant_backups')
          .insert(payload)
          .select('id, created_at')
          .single()
        if (insertError) {
          if (insertError.code === '23505') {
            results.push({ empresa_id: tenantId, status: 'skipped', message: 'duplicate_window' })
            continue
          }
          console.error('[auto-backup] Error insertando backup automático:', tenantId, insertError)
          results.push({ empresa_id: tenantId, status: 'error', message: insertError.message })
          continue
        }
        const newLast = insertData?.created_at ?? now.toISOString()
        const { error: updateError } = await supabaseAdmin
          .from('empresas')
          .update({ last_auto_backup_at: newLast })
          .eq('id', tenantId)
        if (updateError) {
          console.warn('[auto-backup] Error actualizando last_auto_backup_at para empresa', tenantId, updateError)
        }
        results.push({ empresa_id: tenantId, status: 'ok' })
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        console.error('[auto-backup] Error inesperado para empresa', tenantId, message)
        results.push({ empresa_id: tenantId, status: 'error', message })
      }
    }
    return jsonResponse({
      processed: results.length,
      total_candidates: candidates.length,
      due_count: dueEmpresas.length,
      results,
    }, 200)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[auto-backup] Fatal error:', message)
    return jsonResponse({ error: message }, 500)
  }
})
