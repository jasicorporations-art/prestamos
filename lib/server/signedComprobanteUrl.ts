import type { SupabaseClient } from '@supabase/supabase-js'

export const COMPROBANTES_PAGOS_BUCKET = 'comprobantes_pagos'

/**
 * Genera URL firmada para objetos del bucket `comprobantes_pagos` usando el cliente admin
 * del **proyecto actual** (env). Acepta URL pública, URL firmada antigua, o path relativo
 * guardado en BD (`empresaId/clienteId/archivo.jpg`).
 */
export async function signComprobanteStorageUrl(
  admin: SupabaseClient,
  storedUrl: string,
  expiresSec = 60 * 60 * 24 * 7
): Promise<string> {
  const s = String(storedUrl || '').trim()
  if (!s) return s

  const objectPath = extractComprobantesPagosObjectPath(s)
  if (!objectPath) {
    // No pudimos obtener path: si ya es URL absoluta, devolverla
    if (/^https?:\/\//i.test(s)) return s
    return s
  }

  const candidates = buildComprobantePathCandidates(objectPath)
  const bucket = COMPROBANTES_PAGOS_BUCKET

  for (const pathToSign of candidates) {
    if (!isSafeStorageObjectPath(pathToSign)) continue

    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(pathToSign, expiresSec)

    if (!error && data?.signedUrl) {
      return data.signedUrl
    }

    if (process.env.NODE_ENV === 'development' && error?.message) {
      console.warn(
        '[signComprobanteStorageUrl] createSignedUrl:',
        error.message,
        'path:',
        pathToSign
      )
    }
  }

  // Bucket público: getPublicUrl suele funcionar aunque createSignedUrl falle por política
  const firstSafe = candidates.find((p) => isSafeStorageObjectPath(p))
  if (firstSafe) {
    const { data: pub } = admin.storage.from(bucket).getPublicUrl(firstSafe)
    if (pub?.publicUrl && /^https?:\/\//i.test(pub.publicUrl)) {
      return pub.publicUrl
    }
  }

  // Último recurso: reconstruir URL pública con el proyecto configurado
  if (firstSafe) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const origin = base.replace(/\/+$/, '')
    if (origin && /^https?:\/\//i.test(origin)) {
      const enc = firstSafe
        .split('/')
        .map((seg) => encodeURIComponent(seg))
        .join('/')
      return `${origin}/storage/v1/object/public/${bucket}/${enc}`
    }
  }

  if (/^https?:\/\//i.test(s)) return s
  return s
}

/**
 * Variaciones del path por encoding / prefijos duplicados (Storage es sensible al string exacto).
 */
export function buildComprobantePathCandidates(objectPath: string): string[] {
  const out: string[] = []
  const add = (p: string) => {
    const t = p.trim().replace(/^\/+/, '')
    if (t && !out.includes(t)) out.push(t)
  }

  let p = objectPath.trim().replace(/^\/+/, '')
  const bucketPrefix = `${COMPROBANTES_PAGOS_BUCKET}/`
  if (p.toLowerCase().startsWith(bucketPrefix.toLowerCase())) {
    p = p.slice(bucketPrefix.length)
  }
  add(p)

  try {
    const dec = decodeURIComponent(p)
    if (dec !== p) add(dec)
  } catch {
    /* ignore */
  }

  // A veces el path viene con segmentos codificados por URL completa
  try {
    const parts = p.split('/').map((seg) => {
      try {
        return decodeURIComponent(seg)
      } catch {
        return seg
      }
    })
    add(parts.join('/'))
  } catch {
    /* ignore */
  }

  return out
}

/**
 * Extrae la ruta del objeto dentro del bucket `comprobantes_pagos` desde URL pública, firmada
 * o path relativo guardado en BD.
 */
export function extractComprobantesPagosObjectPath(storedUrl: string): string | null {
  const raw = String(storedUrl || '').trim()
  if (!raw) return null

  // Path relativo (sin esquema http): lo típico que guarda notificar-pago
  if (!/^https?:\/\//i.test(raw)) {
    return normalizeRawPathForBucket(raw)
  }

  let qIdx = raw.indexOf('?')
  const base = qIdx === -1 ? raw : raw.slice(0, qIdx)
  const bucket = COMPROBANTES_PAGOS_BUCKET
  const bucketEsc = bucket.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // .../storage/v1/object/public/BUCKET/<path>
  const publicRe = new RegExp(
    `/storage/v1/object/public/${bucketEsc}/(.+)$`,
    'i'
  )
  const pm = base.match(publicRe)
  if (pm?.[1]) {
    return normalizeRawPathForBucket(pm[1])
  }

  // .../storage/v1/object/sign/BUCKET/<path> (sin query)
  const signRe = new RegExp(`/storage/v1/object/sign/${bucketEsc}/(.+)$`, 'i')
  const sm = base.match(signRe)
  if (sm?.[1]) {
    return normalizeRawPathForBucket(sm[1])
  }

  // Marcador legacy sin variante exacta de bucket en regex
  const publicMarker = `/storage/v1/object/public/${bucket}/`
  const i = base.toLowerCase().indexOf(publicMarker.toLowerCase())
  if (i !== -1) {
    return normalizeRawPathForBucket(base.slice(i + publicMarker.length))
  }

  const legacy = new RegExp(
    `/storage/v1/object/(?:public|sign)/${bucketEsc}/(.+)$`,
    'i'
  )
  const m = base.match(legacy)
  if (m?.[1]) return normalizeRawPathForBucket(m[1])

  return null
}

function normalizeRawPathForBucket(p: string): string | null {
  let s = p.trim().replace(/^\/+/, '')
  if (!s) return null
  try {
    s = decodeURIComponent(s)
  } catch {
    /* keep s */
  }
  const bucketPrefix = `${COMPROBANTES_PAGOS_BUCKET}/`
  if (s.toLowerCase().startsWith(bucketPrefix.toLowerCase())) {
    s = s.slice(bucketPrefix.length)
  }
  if (!isSafeStorageObjectPath(s)) return null
  return s
}

/** Orden de paths seguros a probar con `download` / `createSignedUrl` según lo guardado en BD. */
export function candidateComprobanteObjectPaths(stored: string): string[] {
  const s = String(stored || '').trim()
  if (!s) return []
  const extracted = extractComprobantesPagosObjectPath(s)
  const base = extracted
    ? buildComprobantePathCandidates(extracted)
    : /^https?:\/\//i.test(s)
      ? []
      : buildComprobantePathCandidates(s.replace(/^\/+/, ''))
  return [...new Set(base)].filter((p) => isSafeStorageObjectPath(p))
}

/** Evita path traversal; al menos 2 segmentos (p. ej. empresa/archivo o empresa/carpeta/archivo). */
export function isSafeStorageObjectPath(path: string): boolean {
  const trimmed = path.trim()
  if (!trimmed || trimmed.includes('..')) return false
  const segments = trimmed.split('/').filter(Boolean)
  if (segments.length < 2) return false
  for (const seg of segments) {
    if (seg.includes('..') || seg.length > 512) return false
  }
  return true
}

export async function signComprobanteStorageUrls(
  admin: SupabaseClient,
  storedUrls: string[],
  expiresSec?: number
): Promise<string[]> {
  return Promise.all(
    storedUrls.map((u) => signComprobanteStorageUrl(admin, u, expiresSec))
  )
}
