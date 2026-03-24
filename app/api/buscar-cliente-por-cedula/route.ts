import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Obtiene usuario: primero request (cookies + Bearer), luego token en body por si el header no llega. */
async function getAuthUser(request: NextRequest, body: Record<string, unknown>) {
  let user = await getUserFromRequest(request)
  if (user) return user
  const token =
    (request.headers.get('Authorization')?.startsWith('Bearer ')
      ? request.headers.get('Authorization')!.slice(7).trim()
      : null) ||
    (typeof body.access_token === 'string' ? body.access_token.trim() : null)
  if (!token) return null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null
  const anon = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user: u }, error } = await anon.auth.getUser(token)
  return error || !u ? null : u
}

/**
 * Búsqueda global por cédula para autocompletar formulario de nuevo cliente.
 * No expone nombres de otras empresas; solo devuelve datos del cliente para prellenar.
 * Si el cliente existe en la empresa actual (mismaEmpresa), el front puede actualizar ese registro.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const user = await getAuthUser(request, body)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const cedula = typeof body.cedula === 'string' ? body.cedula.trim().replace(/\s/g, '') : ''
    let empresaId = typeof body.empresa_id === 'string' ? body.empresa_id.trim() || null : null

    if (!cedula || cedula.length < 3) {
      return NextResponse.json({
        encontrado: false,
        mensaje: 'Ingresa al menos 3 caracteres de la cédula.',
      })
    }

    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json(
        { encontrado: false, error: 'Servicio no disponible' },
        { status: 500 }
      )
    }

    if (!empresaId && user?.id) {
      const { data: perfil } = await admin
        .from('perfiles')
        .select('empresa_id, compania_id')
        .or(`user_id.eq.${user.id},usuario_id.eq.${user.id}`)
        .limit(1)
        .maybeSingle() as { data: { empresa_id?: string | null; compania_id?: string | null } | null }
      empresaId = (perfil?.empresa_id && perfil.empresa_id.trim()) || (perfil?.compania_id && String(perfil.compania_id).trim()) || null
    }

    type ClienteRow = {
      id: string
      empresa_id: string
      nombre_completo: string
      cedula: string
      direccion: string | null
      celular: string | null
      email: string | null
      foto_url: string | null
    }

    let cliente: ClienteRow | undefined

    if (empresaId) {
      const { data: filaMismaEmpresa, error: errEmpresa } = await admin
        .from('clientes')
        .select('id, empresa_id, nombre_completo, cedula, direccion, celular, email, foto_url')
        .eq('cedula', cedula)
        .eq('empresa_id', empresaId)
        .limit(1)
        .maybeSingle()
      if (!errEmpresa && filaMismaEmpresa) cliente = filaMismaEmpresa as ClienteRow
    }

    if (!cliente) {
      const { data: filas, error } = await admin
        .from('clientes')
        .select('id, empresa_id, nombre_completo, cedula, direccion, celular, email, foto_url')
        .eq('cedula', cedula)
        .order('created_at', { ascending: false })
        .limit(1)
      if (error) {
        console.error('[buscar-cliente-por-cedula]', error)
        return NextResponse.json({ encontrado: false })
      }
      cliente = filas?.[0] as ClienteRow | undefined
    }

    if (!cliente) {
      return NextResponse.json({ encontrado: false })
    }

    const mismaEmpresa = !!empresaId && (cliente.empresa_id === empresaId || String(cliente.empresa_id).toLowerCase() === String(empresaId).toLowerCase())
    let fotoUrlPublic = cliente.foto_url || null
    if (fotoUrlPublic && !fotoUrlPublic.startsWith('http')) {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL
      const bucket = 'avatars_clientes'
      const path = fotoUrlPublic.replace(/^\//, '').replace(/^avatars_clientes\/?/, '')
      if (base && path) fotoUrlPublic = `${base.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${path}`
    }

    return NextResponse.json({
      encontrado: true,
      mismaEmpresa,
      clienteId: cliente.id,
      cliente: {
        nombre_completo: cliente.nombre_completo || '',
        direccion: cliente.direccion || '',
        celular: cliente.celular || '',
        email: cliente.email || '',
        foto_url: fotoUrlPublic,
      },
    })
  } catch (e: unknown) {
    console.error('[buscar-cliente-por-cedula]', e)
    return NextResponse.json(
      { encontrado: false, error: e instanceof Error ? e.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}
