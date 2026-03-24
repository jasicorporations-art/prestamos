import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const BUCKET = 'fotos_productos'
const MAX_FILES = 3
const MAX_BYTES = 5 * 1024 * 1024

async function ensureBucket(admin: ReturnType<typeof getSupabaseAdmin>) {
  const { data: buckets, error: listError } = await admin.storage.listBuckets()
  if (listError) throw new Error(listError.message)
  if (buckets?.some((b) => b.name === BUCKET)) return
  const { error: createError } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5_242_880,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  })
  if (createError && !createError.message?.toLowerCase().includes('already')) {
    throw new Error(createError.message)
  }
}

function normalizeUrlsFotos(raw: unknown): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.filter((u): u is string => typeof u === 'string' && u.length > 0)
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw)
      return Array.isArray(p) ? p.filter((u: unknown): u is string => typeof u === 'string') : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Sube hasta 3 imágenes a fotos_productos/{empresa_id}/{venta_id|motor_id}/
 * y concatena las URLs públicas en motores.urls_fotos
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()

    const formData = await request.formData()
    const motorId = String(formData.get('motor_id') ?? '').trim()
    const ventaIdRaw = formData.get('venta_id')
    const ventaId =
      ventaIdRaw != null && String(ventaIdRaw).trim() !== '' ? String(ventaIdRaw).trim() : null

    if (!motorId) {
      return NextResponse.json({ error: 'motor_id es requerido' }, { status: 400 })
    }

    const { data: perfil, error: perfilError } = await admin
      .from('perfiles')
      .select('empresa_id, rol')
      .eq('user_id', user.id)
      .maybeSingle()

    if (perfilError) {
      console.error('fotos-productos perfil:', perfilError)
      return NextResponse.json({ error: 'No se pudo verificar el perfil' }, { status: 500 })
    }

    const rol = String(perfil?.rol ?? '').toLowerCase()
    const isSuper = rol === 'super_admin'
    const perfilEmpresaId = perfil?.empresa_id ? String(perfil.empresa_id) : null

    if (!perfilEmpresaId && !isSuper) {
      return NextResponse.json({ error: 'Sin empresa asociada' }, { status: 403 })
    }

    const { data: motor, error: motorError } = await admin
      .from('motores')
      .select('id, empresa_id, urls_fotos')
      .eq('id', motorId)
      .maybeSingle()

    if (motorError || !motor) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const motorEmpresaId = String(motor.empresa_id)
    if (!isSuper && perfilEmpresaId !== motorEmpresaId) {
      return NextResponse.json({ error: 'No tienes permiso para este producto' }, { status: 403 })
    }

    const empresaFolder = perfilEmpresaId || motorEmpresaId
    if (ventaId) {
      const { data: venta, error: ventaError } = await admin
        .from('ventas')
        .select('id, empresa_id, motor_id')
        .eq('id', ventaId)
        .maybeSingle()

      if (ventaError || !venta) {
        return NextResponse.json({ error: 'Financiamiento no encontrado' }, { status: 404 })
      }
      if (String(venta.motor_id) !== motorId) {
        return NextResponse.json({ error: 'El producto no coincide con el financiamiento' }, { status: 400 })
      }
      const vEmp = String(venta.empresa_id)
      if (!isSuper && vEmp !== perfilEmpresaId) {
        return NextResponse.json({ error: 'No tienes permiso para este financiamiento' }, { status: 403 })
      }
    }

    const fileEntries = formData.getAll('files').filter((v): v is File => v instanceof File)
    if (fileEntries.length === 0) {
      return NextResponse.json({ error: 'No se enviaron archivos' }, { status: 400 })
    }
    if (fileEntries.length > MAX_FILES) {
      return NextResponse.json({ error: `Máximo ${MAX_FILES} imágenes por solicitud` }, { status: 400 })
    }

    await ensureBucket(admin)

    const folderKey = ventaId ?? motorId
    const basePath = `${empresaFolder}/${folderKey}`

    const uploadedUrls: string[] = []

    for (const file of fileEntries) {
      if (!file.size) continue
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 })
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'Cada imagen debe pesar como máximo 5 MB' }, { status: 400 })
      }

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const objectPath = `${basePath}/${randomUUID()}.${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { error: uploadError } = await admin.storage.from(BUCKET).upload(objectPath, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })

      if (uploadError) {
        console.error('upload fotos_productos:', uploadError)
        return NextResponse.json({ error: uploadError.message || 'Error al subir' }, { status: 500 })
      }

      const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(objectPath)
      if (pub?.publicUrl) uploadedUrls.push(pub.publicUrl)
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json({ error: 'No se pudo procesar ninguna imagen' }, { status: 400 })
    }

    const existing = normalizeUrlsFotos(motor.urls_fotos)
    const merged = [...existing, ...uploadedUrls]
    const unique = [...new Set(merged)]

    const { error: updateError } = await admin
      .from('motores')
      .update({ urls_fotos: unique })
      .eq('id', motorId)

    if (updateError) {
      const msg = updateError.message || ''
      if (/urls_fotos|column\s+["']?urls_fotos["']?/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              'La columna urls_fotos no existe en motores. Ejecuta supabase/motores-urls-fotos-fotos-productos.sql en Supabase.',
          },
          { status: 500 }
        )
      }
      console.error('update motores urls_fotos:', updateError)
      return NextResponse.json({ error: msg || 'Error actualizando urls_fotos en motores' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, urls: uploadedUrls, urls_fotos: unique })
  } catch (e: unknown) {
    console.error('POST fotos-productos:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}
