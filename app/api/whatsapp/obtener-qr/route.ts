import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getConfigWhatsAppEmpresa } from '@/lib/whatsapp-hybrid'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/whatsapp/obtener-qr
 * Body: { instanceName?: string } — si no se envía, se usa el ID de empresa del usuario.
 * Requiere Evolution API configurada para la empresa (configuracion_whatsapp).
 * Devuelve: { qr: string } (base64 de la imagen QR).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    let empresaId: string | null = null

    const body = await request.json().catch(() => ({}))
    const instanceNameFromBody = typeof (body as { instanceName?: string }).instanceName === 'string'
      ? (body as { instanceName: string }).instanceName.trim()
      : null

    type PerfilRow = { empresa_id?: string | null; compania_id?: string | null }
    const { data: perfiles } = await admin
      .from('perfiles')
      .select('empresa_id, compania_id')
      .eq('user_id', user.id)

    const perfil = Array.isArray(perfiles) && perfiles.length > 0 ? (perfiles[0] as PerfilRow) : null
    empresaId = perfil?.empresa_id ?? perfil?.compania_id ?? null
    if (!empresaId && user.user_metadata?.compania && typeof user.user_metadata.compania === 'string') {
      const meta = user.user_metadata.compania.trim()
      if (meta && /^[0-9a-fA-F-]{36}$/.test(meta)) empresaId = meta
    }

    const instanceName = instanceNameFromBody || empresaId
    if (!instanceName) {
      return NextResponse.json(
        { error: 'No hay empresa asignada. Asigna una empresa a tu perfil o envía instanceName en el body.' },
        { status: 400 }
      )
    }

    const config = await getConfigWhatsAppEmpresa(admin, empresaId || instanceName)
    if (config.metodo_envio !== 'EVOLUTION' || !config.evolution_base_url?.trim()) {
      return NextResponse.json(
        { error: 'Evolution API no está configurada para tu empresa. Configura base_url e instance en configuracion_whatsapp.' },
        { status: 400 }
      )
    }

    const baseUrl = config.evolution_base_url.replace(/\/$/, '')
    const url = `${baseUrl}/instance/connect/${encodeURIComponent(instanceName)}`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (config.evolution_apikey?.trim()) {
      headers.apikey = config.evolution_apikey.trim()
    }

    const evolutionRes = await fetch(url, {
      method: 'GET',
      headers,
    })

    if (!evolutionRes.ok) {
      const errText = await evolutionRes.text()
      console.warn('[obtener-qr] Evolution API error:', evolutionRes.status, errText)
      return NextResponse.json(
        { error: `Evolution API: ${evolutionRes.status}. ${errText.slice(0, 200)}` },
        { status: 502 }
      )
    }

    const data = (await evolutionRes.json()) as Record<string, unknown>
    const qrBase64 =
      (data.base64 as string) ??
      (data.qr as string) ??
      (data.code as string) ??
      (data as { code?: string }).code

    if (!qrBase64 || typeof qrBase64 !== 'string') {
      return NextResponse.json(
        { error: 'Evolution API no devolvió código QR (base64/qr/code). ¿La instancia existe?' },
        { status: 502 }
      )
    }

    return NextResponse.json({ qr: qrBase64 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al obtener QR'
    console.error('[obtener-qr]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
