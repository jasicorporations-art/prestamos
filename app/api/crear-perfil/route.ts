/**
 * Crea un perfil automáticamente para usuarios que no tienen uno.
 * Útil cuando: base de datos compartida entre PWAs, registro incompleto, o trigger falló.
 * El primer usuario (o primero por empresa) se asigna como Admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { LEGAL_VERSIONS } from '@/lib/config/legal'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    let admin
    try {
      admin = getSupabaseAdmin()
    } catch {
      return NextResponse.json(
        { error: 'Servicio no disponible. Contacta al administrador.' },
        { status: 503 }
      )
    }

    const { data: perfilExistente } = await admin
      .from('perfiles')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (perfilExistente) {
      return NextResponse.json({ ok: true, mensaje: 'El perfil ya existe' })
    }

    const metadata = user.user_metadata || {}
    const empresaNombre = typeof metadata.compania === 'string' ? metadata.compania.trim() : ''
    const nombreCompleto =
      `${metadata.nombre || ''} ${metadata.apellido || ''}`.trim() || user.email || 'Usuario'

    let empresaId: string | null = empresaNombre || null

    if (empresaNombre) {
      const { data: empresaData } = await admin
        .from('empresas')
        .select('id')
        .eq('nombre', empresaNombre)
        .limit(1)
        .single()
      if (empresaData?.id) empresaId = String(empresaData.id)
    }
    if (!empresaId) {
      const { data: primeraEmpresa } = await admin
        .from('empresas')
        .select('id')
        .limit(1)
        .single()
      if (primeraEmpresa?.id) empresaId = String(primeraEmpresa.id)
    }

    const { data: perfilesExistentes } = await admin
      .from('perfiles')
      .select('id')
      .limit(100)

    const esPrimerUsuario = !perfilesExistentes || perfilesExistentes.length === 0

    let esPrimerUsuarioEmpresa = true
    if (empresaId) {
      const { data: perfilesEmpresa } = await admin
        .from('perfiles')
        .select('id')
        .eq('empresa_id', empresaId)
        .limit(1)
      esPrimerUsuarioEmpresa = !perfilesEmpresa || perfilesEmpresa.length === 0
    }
    const rol = esPrimerUsuario || esPrimerUsuarioEmpresa ? 'Admin' : 'Vendedor'

    const acceptanceTimestamp = new Date().toISOString()
    const nuevoPerfil: Record<string, unknown> = {
      user_id: user.id,
      nombre_completo: nombreCompleto,
      rol,
      activo: true,
      terminos_aceptados: true,
      terminos_version: LEGAL_VERSIONS.terminos,
      fecha_aceptacion: acceptanceTimestamp,
      privacidad_aceptada: true,
      privacidad_version: LEGAL_VERSIONS.privacidad,
      privacidad_fecha_aceptacion: acceptanceTimestamp,
    }
    if (empresaId) nuevoPerfil.empresa_id = empresaId

    const { error: insertError } = await admin
      .from('perfiles')
      .insert(nuevoPerfil)

    if (insertError) {
      console.error('[crear-perfil] Error insertando:', insertError)
      return NextResponse.json(
        { error: insertError.message || 'No se pudo crear el perfil' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      mensaje: `Perfil creado como ${rol}. Puedes iniciar sesión.`,
    })
  } catch (e: any) {
    console.error('[crear-perfil] Error:', e)
    return NextResponse.json(
      { error: e.message || 'Error al crear perfil' },
      { status: 500 }
    )
  }
}
