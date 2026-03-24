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
} from '@/lib/server/signedComprobanteUrl'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function rowBelongsToTenant(row: Record<string, unknown>, tenantIds: string[]): boolean {
  if (tenantIds.length === 0) return false
  const ids = new Set(tenantIds.map((t) => String(t).toLowerCase()))
  // Revisar todas las columnas posibles de tenant en la fila
  const candidatos = [
    row.id_empresa,
    row.empresa_id,
    row.compania_id,
  ]
  return candidatos.some((v) => {
    const s = String(v ?? '').toLowerCase().trim()
    return s !== '' && ids.has(s)
  })
}

function contentTypeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'heic' || ext === 'heif') return 'image/heic'
  return 'image/jpeg'
}

/**
 * Sirve el archivo del comprobante (Storage) al admin autenticado del mismo tenant.
 * Evita depender de signed URLs en el navegador (CORS, expiración, bucket privado).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(_request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const perfil = await getPerfilPagosVerificar(admin, user.id)
    const rol = String(perfil?.rol || '')
      .toLowerCase()
      .replace(/\s+/g, '_')
    const permitido =
      rol === 'admin' || rol === 'super_admin' || rol === 'cobrador'
    const tenantIds = tenantIdsUnicos(perfil)

    if (!perfil) {
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado. Verifica que el usuario tenga un perfil en la tabla perfiles.' },
        { status: 403 }
      )
    }
    if (!permitido) {
      return NextResponse.json(
        { error: `Rol '${perfil.rol}' no tiene permiso para ver comprobantes.` },
        { status: 403 }
      )
    }
    if (tenantIds.length === 0) {
      return NextResponse.json(
        { error: 'El perfil no tiene empresa_id ni compania_id asignado.' },
        { status: 403 }
      )
    }

    const notifId = params.id
    const { data: row, error: rowErr } = await admin
      .from('pagos_pendientes_verificacion')
      .select('*')
      .eq('id', notifId)
      .maybeSingle()

    if (rowErr || !row) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const r = row as Record<string, unknown>
    if (!rowBelongsToTenant(r, tenantIds)) {
      // Mensaje detallado para debugging — no expone datos sensibles al cliente
      const rowTenant = String(r.id_empresa ?? r.empresa_id ?? r.compania_id ?? 'desconocido')
      console.error('[comprobante] tenant mismatch:', {
        rowTenant,
        tenantIds,
        notifId,
      })
      return NextResponse.json(
        { error: 'Este comprobante no pertenece a tu empresa.' },
        { status: 403 }
      )
    }

    const foto = String(r.foto_comprobante ?? '').trim()
    if (!foto) {
      return NextResponse.json({ error: 'Sin comprobante' }, { status: 404 })
    }

    const candidates = candidateComprobanteObjectPaths(foto)
    if (candidates.length === 0) {
      console.error('[comprobante] path inválido:', { foto, notifId })
      return NextResponse.json(
        { error: `Ruta de comprobante no válida: "${foto.slice(0, 80)}". Debe tener formato empresa-id/cliente-id/archivo.ext` },
        { status: 400 }
      )
    }

    let blob: Blob | null = null
    let usedPath: string | null = null
    let dlErr: { message: string } | null = null

    for (const objectPath of candidates) {
      const res = await admin.storage
        .from(COMPROBANTES_PAGOS_BUCKET)
        .download(objectPath)
      if (!res.error && res.data) {
        blob = res.data
        usedPath = objectPath
        break
      }
      dlErr = res.error ? { message: res.error.message } : { message: 'Error descarga' }
    }

    if (!blob || !usedPath) {
      console.error('[comprobante] descarga fallida:', { candidates, dlErr, notifId })
      return NextResponse.json(
        {
          error: dlErr?.message || 'No se pudo descargar el archivo del storage',
          hint: 'Verifica que el bucket "comprobantes_pagos" existe en Supabase Storage y que SUPABASE_SERVICE_ROLE_KEY está configurada.',
          paths_tried: candidates,
        },
        { status: 404 }
      )
    }

    const buf = Buffer.from(await blob.arrayBuffer())
    const ct = blob.type && blob.type !== 'application/octet-stream'
      ? blob.type
      : contentTypeFromPath(usedPath)

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    )
  }
}
