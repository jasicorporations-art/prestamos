import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const BUCKET = 'avatars_clientes'

/**
 * Crea el bucket avatars_clientes en Supabase Storage si no existe.
 * Usa SUPABASE_SERVICE_ROLE_KEY (solo server-side).
 * El cliente puede llamar a esta ruta antes de subir la primera foto.
 */
export async function POST() {
  try {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
    if (!url || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase no configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      )
    }

    const supabase = createClient(url, serviceRoleKey)

    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    if (listError) {
      console.error('Error listando buckets:', listError)
      return NextResponse.json({ error: listError.message }, { status: 500 })
    }
    if (buckets?.some((b) => b.name === BUCKET)) {
      return NextResponse.json({ ok: true, message: 'Bucket ya existe' })
    }

    const { error: createError } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 524288, // 512 KB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    })

    if (createError) {
      // "Bucket already exists" u otro error de duplicado
      if (createError.message?.toLowerCase().includes('already exists') || createError.message?.toLowerCase().includes('duplicate')) {
        return NextResponse.json({ ok: true, message: 'Bucket ya existe' })
      }
      console.error('Error creando bucket:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: 'Bucket creado' })
  } catch (e: unknown) {
    console.error('ensure-avatars-bucket:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}
