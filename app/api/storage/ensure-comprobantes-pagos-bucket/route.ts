import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET = 'comprobantes_pagos'

export async function POST() {
  try {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 })
    }

    const supabase = createClient(url, serviceRoleKey)
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    if (listError) return NextResponse.json({ error: listError.message }, { status: 500 })
    if (buckets?.some((b) => b.name === BUCKET)) {
      return NextResponse.json({ ok: true, message: 'Bucket ya existe' })
    }

    const { error: createError } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5_242_880,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    })
    if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })
    return NextResponse.json({ ok: true, message: 'Bucket creado' })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error inesperado' }, { status: 500 })
  }
}
