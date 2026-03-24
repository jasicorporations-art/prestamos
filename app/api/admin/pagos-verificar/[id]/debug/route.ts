/**
 * Diagnóstico de comprobante: muestra exactamente qué está fallando.
 * Solo accesible por admin/super_admin.
 * Borrar este archivo cuando el problema esté resuelto.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  getPerfilPagosVerificar,
  tenantIdsUnicos,
} from '@/lib/server/pagos-pendientes-verificacion-tenant'
import {
  COMPROBANTES_PAGOS_BUCKET,
  candidateComprobanteObjectPaths,
  extractComprobantesPagosObjectPath,
  isSafeStorageObjectPath,
} from '@/lib/server/signedComprobanteUrl'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(_request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const perfil = await getPerfilPagosVerificar(admin, user.id)
  const rol = String(perfil?.rol || '').toLowerCase().replace(/\s+/g, '_')
  if (rol !== 'admin' && rol !== 'super_admin') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const notifId = params.id
  const { data: row, error: rowErr } = await admin
    .from('pagos_pendientes_verificacion')
    .select('*')
    .eq('id', notifId)
    .maybeSingle()

  if (rowErr || !row) {
    return NextResponse.json({ error: 'Fila no encontrada', rowErr }, { status: 404 })
  }

  const r = row as Record<string, unknown>
  const fotoRaw = String(r.foto_comprobante ?? '').trim()
  const tenantIds = tenantIdsUnicos(perfil)
  const extracted = extractComprobantesPagosObjectPath(fotoRaw)
  const candidates = candidateComprobanteObjectPaths(fotoRaw)

  // Verificar bucket
  const { data: buckets, error: bucketsErr } = await admin.storage.listBuckets()
  const bucketExists = !bucketsErr && buckets?.some((b) => b.name === COMPROBANTES_PAGOS_BUCKET)
  const bucketInfo = buckets?.find((b) => b.name === COMPROBANTES_PAGOS_BUCKET)

  // Intentar download para cada candidato
  const downloadResults: Record<string, unknown>[] = []
  for (const objectPath of candidates) {
    const res = await admin.storage.from(COMPROBANTES_PAGOS_BUCKET).download(objectPath)
    downloadResults.push({
      path: objectPath,
      ok: !res.error,
      size: res.data ? res.data.size : null,
      error: res.error?.message ?? null,
    })
  }

  // Intentar signed URL para cada candidato
  const signedResults: Record<string, unknown>[] = []
  for (const objectPath of candidates) {
    const res = await admin.storage
      .from(COMPROBANTES_PAGOS_BUCKET)
      .createSignedUrl(objectPath, 60)
    signedResults.push({
      path: objectPath,
      ok: !res.error,
      signedUrl: res.data?.signedUrl ? res.data.signedUrl.slice(0, 80) + '…' : null,
      error: res.error?.message ?? null,
    })
  }

  // Listar archivos en el prefijo del tenant
  const tenantPrefix = tenantIds[0] ? `${tenantIds[0]}/` : ''
  const { data: listedFiles, error: listErr } = tenantPrefix
    ? await admin.storage.from(COMPROBANTES_PAGOS_BUCKET).list(tenantPrefix.replace(/\/$/, ''), { limit: 20 })
    : { data: null, error: { message: 'Sin tenant' } }

  // getPublicUrl
  const publicUrls = candidates.map((p) => {
    const { data } = admin.storage.from(COMPROBANTES_PAGOS_BUCKET).getPublicUrl(p)
    return { path: p, publicUrl: data?.publicUrl ?? null }
  })

  return NextResponse.json({
    notif_id: notifId,
    foto_raw: fotoRaw,
    extracted_path: extracted,
    is_safe_path: extracted ? isSafeStorageObjectPath(extracted) : false,
    candidates,
    tenant_ids: tenantIds,
    tenant_match: {
      id_empresa: r.id_empresa,
      empresa_id: r.empresa_id,
      compania_id: r.compania_id,
    },
    bucket: {
      exists: bucketExists,
      public: bucketInfo?.public ?? null,
      error: bucketsErr?.message ?? null,
    },
    download_results: downloadResults,
    signed_url_results: signedResults,
    public_urls: publicUrls,
    files_in_tenant_folder: {
      prefix: tenantPrefix,
      files: listedFiles?.map((f) => f.name) ?? null,
      error: listErr?.message ?? null,
    },
    supabase_url: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''),
  })
}
