import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomInt, randomUUID } from 'crypto'
import { isValidUUID } from '@/lib/utils/compania'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET = 'fotos_productos'

function normalizeCedula(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/-/g, '')
}

async function ensureBucket(admin: ReturnType<typeof getSupabaseAdmin>) {
  const { data: buckets } = await admin.storage.listBuckets()
  if (buckets?.some((b) => b.name === BUCKET)) return
  const { error } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5_242_880,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  })
  if (error && !String(error.message || '').toLowerCase().includes('already')) {
    throw new Error(error.message)
  }
}

async function upsertPersonaCentral(admin: ReturnType<typeof getSupabaseAdmin>, payload: {
  cedula: string
  nombre: string
  telefono: string
  fotoPerfilUrl?: string | null
}) {
  const { data: existing } = await admin
    .from('personas_central')
    .select('id,solicitudes_pendientes_globales')
    .eq('cedula', payload.cedula)
    .maybeSingle()

  if (existing?.id) {
    await admin
      .from('personas_central')
      .update({
        nombre_completo: payload.nombre || null,
        telefono: payload.telefono || null,
        foto_perfil_url: payload.fotoPerfilUrl || null,
        solicitudes_pendientes_globales: Number(existing.solicitudes_pendientes_globales || 0) + 1,
      })
      .eq('id', existing.id)
    return
  }

  await admin.from('personas_central').insert({
    cedula: payload.cedula,
    nombre_completo: payload.nombre || null,
    telefono: payload.telefono || null,
    foto_perfil_url: payload.fotoPerfilUrl || null,
    solicitudes_pendientes_globales: 1,
  })
}

export async function POST(request: NextRequest) {
  try {
    const admin = getSupabaseAdmin()
    const form = await request.formData()
    let empresaId = String(form.get('empresa_id') ?? '').trim()
    const empresaNombre = String(form.get('empresa') ?? '').trim()
    const cedula = normalizeCedula(String(form.get('cedula') ?? '').trim())
    const nombre = String(form.get('nombre') ?? '').trim()
    const telefono = String(form.get('telefono') ?? '').trim()
    const direccion = String(form.get('direccion') ?? '').trim()
    const ingresos = Number(form.get('ingresos') ?? 0)
    const gastos = Number(form.get('gastos') ?? 0)
    const cantidadCuotas = Number(form.get('cantidad_cuotas') ?? 12)
    const tipoPlazoRaw = String(form.get('tipo_plazo') ?? 'mensual').trim().toLowerCase()
    const tipoPlazo = (['diario', 'semanal', 'quincenal', 'mensual'].includes(tipoPlazoRaw) ? tipoPlazoRaw : 'mensual') as 'diario' | 'semanal' | 'quincenal' | 'mensual'
    const diaPagoSemanalRaw = String(form.get('dia_pago_semanal') ?? '').trim()
    const diaPagoSemanal = diaPagoSemanalRaw !== '' ? Number(diaPagoSemanalRaw) : null
    const fechaInicioQuincenalRaw = String(form.get('fecha_inicio_quincenal') ?? '').trim()
    const fechaInicioQuincenal = fechaInicioQuincenalRaw || null
    const nombreGarante = String(form.get('nombre_garante') ?? '').trim()
    const telefonoGarante = String(form.get('telefono_garante') ?? '').trim()
    const direccionGarante = String(form.get('direccion_garante') ?? '').trim()
    const descripcion = String(form.get('descripcion') ?? '').trim()
    const montoSolicitado = Number(form.get('monto_solicitado') ?? 0)
    const fotoPerfilFile = form.get('foto_perfil')

    if (!isValidUUID(empresaId) && empresaNombre) {
      const { data: empresaByNombre } = await admin
        .from('empresas')
        .select('id')
        .ilike('nombre', empresaNombre)
        .limit(1)
        .maybeSingle()
      if (empresaByNombre?.id) empresaId = String(empresaByNombre.id)
    }

    if (!isValidUUID(empresaId)) {
      return NextResponse.json({ error: 'empresa_id inválido' }, { status: 400 })
    }
    if (!cedula || !nombre || !telefono || !Number.isFinite(montoSolicitado) || montoSolicitado <= 0) {
      return NextResponse.json({ error: 'Completa cédula, nombre, teléfono y monto solicitado' }, { status: 400 })
    }
    if (tipoPlazo === 'semanal' && (!Number.isInteger(diaPagoSemanal) || (diaPagoSemanal as number) < 0 || (diaPagoSemanal as number) > 6)) {
      return NextResponse.json({ error: 'Selecciona un día de pago semanal válido' }, { status: 400 })
    }
    if (tipoPlazo === 'quincenal' && !fechaInicioQuincenal) {
      return NextResponse.json({ error: 'Selecciona la fecha de inicio para pago quincenal' }, { status: 400 })
    }
    if (!(fotoPerfilFile instanceof File) || !fotoPerfilFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'La foto de perfil es obligatoria y debe ser una imagen' }, { status: 400 })
    }

    const { data: empresa, error: empErr } = await admin
      .from('empresas')
      .select('id')
      .eq('id', empresaId)
      .maybeSingle()
    if (empErr || !empresa) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    const pin = String(randomInt(100000, 999999))
    const pinHash = createHash('sha256').update(pin).digest('hex')

    await ensureBucket(admin)

    let fotoPerfilUrl: string | null = null
    {
      const ext = (fotoPerfilFile.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const path = `${empresaId}/solicitudes/perfil-${randomUUID()}.${ext}`
      const buffer = Buffer.from(await fotoPerfilFile.arrayBuffer())
      const { error: upPerfilErr } = await admin.storage.from(BUCKET).upload(path, buffer, {
        contentType: fotoPerfilFile.type || 'image/jpeg',
        upsert: false,
      })
      if (upPerfilErr) {
        return NextResponse.json({ error: `No se pudo subir foto de perfil: ${upPerfilErr.message}` }, { status: 500 })
      }
      const { data } = admin.storage.from(BUCKET).getPublicUrl(path)
      fotoPerfilUrl = data?.publicUrl || null
    }

    const files = form.getAll('fotos').filter((v): v is File => v instanceof File).slice(0, 3)
    const fotoUrls: string[] = []
    if (files.length > 0) {
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
        const path = `${empresaId}/solicitudes/${randomUUID()}.${ext}`
        const buffer = Buffer.from(await file.arrayBuffer())
        const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buffer, {
          contentType: file.type || 'image/jpeg',
          upsert: false,
        })
        if (!upErr) {
          const { data } = admin.storage.from(BUCKET).getPublicUrl(path)
          if (data?.publicUrl) fotoUrls.push(data.publicUrl)
        }
      }
    }

    const payload = {
      empresa_id: empresaId,
      datos_cliente: {
        nombre_completo: nombre,
        cedula,
        nombre,
        celular: telefono,
        telefono,
        foto_perfil_url: fotoPerfilUrl,
        direccion: direccion || null,
        ingresos_mensuales: Number.isFinite(ingresos) ? ingresos : 0,
        gastos_mensuales: Number.isFinite(gastos) ? gastos : 0,
        ingresos: Number.isFinite(ingresos) ? ingresos : 0,
        gastos: Number.isFinite(gastos) ? gastos : 0,
        cantidad_cuotas: Number.isFinite(cantidadCuotas) && cantidadCuotas > 0 ? Math.floor(cantidadCuotas) : 12,
        tipo_plazo: tipoPlazo,
        dia_pago_semanal: tipoPlazo === 'semanal' ? diaPagoSemanal : null,
        fecha_inicio_quincenal: tipoPlazo === 'quincenal' ? fechaInicioQuincenal : null,
        nombre_garante: nombreGarante || null,
        telefono_garante: telefonoGarante || null,
        direccion_garante: direccionGarante || null,
      },
      creado_por_cliente: true,
      monto_solicitado: montoSolicitado,
      descripcion,
      fotos_producto: fotoUrls,
      estado: 'pendiente',
      pin_hash: pinHash,
    }

    const { data: solicitud, error } = await admin
      .from('solicitudes_prestamos')
      .insert(payload)
      .select('id, estado, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Buró preventivo: registrar/actualizar persona global al momento de solicitar.
    await upsertPersonaCentral(admin, {
      cedula,
      nombre,
      telefono,
      fotoPerfilUrl,
    })

    return NextResponse.json({ ok: true, solicitud, pin })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error creando solicitud' }, { status: 500 })
  }
}
