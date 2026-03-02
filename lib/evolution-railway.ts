/**
 * Evolution API (Railway) - todas las llamadas usan env para no exponer EVOLUTION_API_KEY.
 * Solo usar en servidor (API routes / server components).
 */

const getBaseUrl = (): string => {
  const url = process.env.SERVER_URL || ''
  return url.replace(/\/$/, '')
}

const getApiKey = (): string => {
  return process.env.EVOLUTION_API_KEY || ''
}

export type EmpresaEvolution = {
  baseUrl: string
  apikey: string
  instance: string
  enabled: boolean
}

/**
 * Obtiene configuración Evolution para una empresa (desde env + tabla empresas).
 * admin: cliente Supabase (getSupabaseAdmin) o compatible.
 */
export async function getEmpresaEvolution(
  admin: { from: (t: string) => unknown },
  empresaId: string | null | undefined
): Promise<EmpresaEvolution | null> {
  if (!empresaId || !getBaseUrl() || !getApiKey()) return null
  const { data: emp } = await (admin as any)
    .from('empresas')
    .select('whatsapp_enabled, whatsapp_instance')
    .eq('id', empresaId)
    .maybeSingle()
  const row = emp as { whatsapp_enabled?: boolean; whatsapp_instance?: string | null } | null
  if (!row || !row.whatsapp_enabled) return null
  const instance = (row.whatsapp_instance || empresaId).toString().trim()
  if (!instance) return null
  return {
    baseUrl: getBaseUrl(),
    apikey: getApiKey(),
    instance,
    enabled: true,
  }
}

/**
 * Envía un mensaje de texto vía Evolution (Railway). Solo si empresa tiene whatsapp_enabled.
 */
export async function sendText(
  admin: { from: (t: string) => unknown },
  empresaId: string | null | undefined,
  telefonoE164: string,
  texto: string
): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getEmpresaEvolution(admin, empresaId)
  if (!cfg) return { ok: false, error: 'WhatsApp Evolution no habilitado para esta empresa' }
  const number = telefonoE164.replace(/\D/g, '').trim()
  if (!number || number.length < 10) return { ok: false, error: 'Número inválido' }
  const url = `${cfg.baseUrl}/message/sendText/${encodeURIComponent(cfg.instance)}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: cfg.apikey,
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ number: number.startsWith('+') ? number : `+${number}`, text: texto }),
    })
    const text = await res.text()
    if (!res.ok) return { ok: false, error: text || `Evolution ${res.status}` }
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

/**
 * Obtiene estado de conexión de la instancia (para mostrar Conectado / QR).
 */
export async function getConnectionState(
  admin: { from: (t: string) => unknown },
  empresaId: string | null | undefined
): Promise<{ connected: boolean; instance?: string; error?: string }> {
  const baseUrl = getBaseUrl()
  const apikey = getApiKey()
  if (!baseUrl || !apikey) return { connected: false, error: 'Evolution no configurado (env)' }
  if (!empresaId) return { connected: false, error: 'Sin empresa' }
  const { data: emp } = await (admin as any)
    .from('empresas')
    .select('whatsapp_instance')
    .eq('id', empresaId)
    .maybeSingle()
  const instance = ((emp as { whatsapp_instance?: string | null })?.whatsapp_instance || empresaId).toString().trim()
  const url = `${baseUrl}/instance/connectionState/${encodeURIComponent(instance)}`
  try {
    const res = await fetch(url, { method: 'GET', headers: { apikey } })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const state = (data.state as string) || (data.instance?.state as string) || ''
    const connected = state.toLowerCase() === 'open' || state === 'connected'
    return { connected, instance }
  } catch (err) {
    return { connected: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Obtiene QR para conectar la instancia (crear o reconectar).
 * No persiste whatsapp_instance aquí; la ruta API puede hacerlo.
 */
export async function fetchQR(
  admin: { from: (t: string) => unknown },
  empresaId: string | null | undefined
): Promise<{ qr: string; instance: string } | { error: string }> {
  const baseUrl = getBaseUrl()
  const apikey = getApiKey()
  if (!baseUrl || !apikey) return { error: 'Evolution no configurado (SERVER_URL / EVOLUTION_API_KEY)' }
  if (!empresaId) return { error: 'Sin empresa' }
  const { data: emp } = await (admin as any).from('empresas').select('whatsapp_instance').eq('id', empresaId).maybeSingle()
  const instance = ((emp as { whatsapp_instance?: string | null })?.whatsapp_instance || `empresa-${empresaId.slice(0, 8)}`).toString().trim()
  const url = `${baseUrl}/instance/connect/${encodeURIComponent(instance)}`
  try {
    const res = await fetch(url, { method: 'GET', headers: { apikey } })
    if (!res.ok) {
      const t = await res.text()
      return { error: t || `Evolution ${res.status}` }
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const qr = (data.base64 ?? data.qr ?? data.code ?? '') as string
    if (!qr) return { error: 'Evolution no devolvió QR' }
    return { qr, instance }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
