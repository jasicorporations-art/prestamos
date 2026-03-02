/**
 * POST: Asegura que el usuario que acaba de registrarse tenga perfil con rol Admin
 * si es el primer usuario (global o de su empresa). Usa service role para evitar RLS.
 * Si metadata.compania existe pero la empresa no está en la tabla, la crea (y sucursal por defecto).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { LEGAL_VERSIONS } from '@/lib/config/legal'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const metadata = user.user_metadata || {}
    const nombreCompleto =
      `${metadata.nombre || ''} ${metadata.apellido || ''}`.trim() || user.email || 'Usuario'
    const empresaNombre = typeof metadata.compania === 'string' ? metadata.compania.trim() : ''

    let empresaId: string | null = null
    let empresaRecienCreada = false

    if (empresaNombre) {
      const { data: emp } = await admin
        .from('empresas')
        .select('id')
        .eq('nombre', empresaNombre)
        .limit(1)
        .maybeSingle()
      if (emp?.id) {
        empresaId = emp.id
      } else {
        const payload: Record<string, unknown> = {
          nombre: empresaNombre,
          user_id: user.id,
          email: metadata.email || user.email || null,
        }
        if (typeof metadata.rnc === 'string' && metadata.rnc.trim()) payload.rnc = metadata.rnc.trim()
        if (typeof metadata.telefono === 'string' && metadata.telefono.trim()) payload.telefono = metadata.telefono.trim()
        if (typeof metadata.direccion === 'string' && metadata.direccion.trim()) payload.direccion = metadata.direccion.trim()

        const { data: inserted, error: insertEmpError } = await admin
          .from('empresas')
          .insert(payload)
          .select('id')
          .single()

        if (insertEmpError) {
          if (String(insertEmpError.message || '').includes('duplicate') || (insertEmpError as { code?: string }).code === '23505') {
            const { data: existente } = await admin
              .from('empresas')
              .select('id')
              .eq('nombre', empresaNombre)
              .limit(1)
              .maybeSingle()
            if (existente?.id) empresaId = existente.id
          }
          if (!empresaId) {
            console.error('[registro-asegurar-admin] Error creando empresa:', insertEmpError)
          }
        } else if (inserted?.id) {
          empresaId = inserted.id
          empresaRecienCreada = true
        }
      }
    }

    if (!empresaId) {
      const { data: porCreador } = await admin
        .from('empresas')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (porCreador?.id) empresaId = porCreador.id
    }
    if (!empresaId) {
      const { data: primera } = await admin.from('empresas').select('id').limit(1).maybeSingle()
      if (primera?.id) empresaId = primera.id
    }

    let sucursalId: string | null = null
    if (empresaId) {
      const { data: sucursal } = await admin
        .from('sucursales')
        .select('id')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (sucursal?.id) {
        sucursalId = sucursal.id
      } else if (empresaRecienCreada) {
        const { data: nuevaSuc, error: sucError } = await admin
          .from('sucursales')
          .insert({
            empresa_id: empresaId,
            nombre: 'Principal',
            direccion: metadata.direccion || '',
            telefono: metadata.telefono || '',
            activa: true,
          })
          .select('id')
          .single()
        if (!sucError && nuevaSuc?.id) {
          sucursalId = nuevaSuc.id
          // Crear "Ruta A" para la sucursal recién creada (por si no existe trigger en BD)
          await admin
            .from('rutas')
            .insert({
              sucursal_id: nuevaSuc.id,
              nombre: 'Ruta A',
              descripcion: 'Ruta de cobro creada automáticamente. Puedes editar el nombre en Configuración de Rutas.',
              activa: true,
            })
        }
      }
    }

    const { data: perfilExistente } = await admin
      .from('perfiles')
      .select('id, rol, empresa_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const ahora = new Date().toISOString()
    const { data: todosPerfiles } = await admin.from('perfiles').select('id').limit(1)
    const esPrimerUsuarioGlobal = !todosPerfiles || todosPerfiles.length === 0

    let esPrimerUsuarioEmpresa = true
    if (empresaId) {
      let q = admin.from('perfiles').select('id').eq('empresa_id', empresaId)
      if (perfilExistente) {
        q = q.neq('user_id', user.id)
      }
      const { data: perfilesEmpresa } = await q.limit(1)
      esPrimerUsuarioEmpresa = !perfilesEmpresa || perfilesEmpresa.length === 0
    }

    const debeSerAdmin = esPrimerUsuarioGlobal || esPrimerUsuarioEmpresa

    if (perfilExistente) {
      if (debeSerAdmin && (perfilExistente.rol ?? '').toLowerCase() !== 'admin') {
        const updatePayload: Record<string, unknown> = {
          rol: 'Admin',
          empresa_id: empresaId ?? perfilExistente.empresa_id,
        }
        if (sucursalId) updatePayload.sucursal_id = sucursalId
        await admin.from('perfiles').update(updatePayload).eq('user_id', user.id)
        return NextResponse.json({ ok: true, rol: 'Admin', actualizado: true })
      }
      if (empresaId && !perfilExistente.empresa_id) {
        const updatePayload: Record<string, unknown> = { empresa_id: empresaId }
        if (sucursalId) updatePayload.sucursal_id = sucursalId
        await admin.from('perfiles').update(updatePayload).eq('user_id', user.id)
      }
      return NextResponse.json({ ok: true, rol: perfilExistente.rol ?? 'Admin' })
    }

    const nuevoPerfil: Record<string, unknown> = {
      user_id: user.id,
      nombre_completo: nombreCompleto,
      rol: debeSerAdmin ? 'Admin' : 'Vendedor',
      activo: true,
      terminos_aceptados: true,
      terminos_version: LEGAL_VERSIONS.terminos,
      fecha_aceptacion: ahora,
      privacidad_aceptada: true,
      privacidad_version: LEGAL_VERSIONS.privacidad,
      privacidad_fecha_aceptacion: ahora,
    }
    if (empresaId) {
      nuevoPerfil.empresa_id = empresaId
    }
    if (sucursalId) {
      nuevoPerfil.sucursal_id = sucursalId
    }

    const { error: insertError } = await admin.from('perfiles').insert(nuevoPerfil)

    if (insertError) {
      console.error('[registro-asegurar-admin] Error insert perfil:', insertError)
      return NextResponse.json(
        { error: insertError.message || 'No se pudo crear el perfil' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      rol: debeSerAdmin ? 'Admin' : 'Vendedor',
      creado: true,
    })
  } catch (e) {
    console.error('[registro-asegurar-admin]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al asegurar perfil' },
      { status: 500 }
    )
  }
}
