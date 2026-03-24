/**
 * POST: Vincula el perfil de un usuario recién creado a la empresa del Admin que lo crea.
 * Usa service role para evitar RLS. Solo un Admin puede llamar y solo para su misma empresa_id.
 * Así el primer usuario (y cualquier usuario) creado por el Admin queda ligado a la compañía.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { LEGAL_VERSIONS } from '@/lib/config/legal'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser()
    if (authError || !caller) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const user_id = typeof body.user_id === 'string' ? body.user_id.trim() : null
    const empresa_id = typeof body.empresa_id === 'string' ? body.empresa_id.trim() : null
    const rolRaw = body.rol === 'Admin' || body.rol === 'Vendedor' || body.rol === 'Cobrador' ? body.rol : 'Vendedor'
    const rol = rolRaw.toLowerCase()
    const nombre_completo = typeof body.nombre_completo === 'string' ? body.nombre_completo.trim() || null : null
    const sucursal_id = body.sucursal_id != null && body.sucursal_id !== '' ? String(body.sucursal_id) : null
    const ruta_id = body.ruta_id != null && body.ruta_id !== '' ? String(body.ruta_id) : null

    if (!user_id || !empresa_id) {
      return NextResponse.json(
        { error: 'Faltan user_id o empresa_id' },
        { status: 400 }
      )
    }

    const { data: perfilCaller } = await supabase
      .from('perfiles')
      .select('rol, empresa_id')
      .eq('user_id', caller.id)
      .maybeSingle()

    const callerRol = String(perfilCaller?.rol ?? '')
      .toLowerCase()
      .replace(/\s+/g, '_')
    const esSuper = callerRol === 'super_admin' || callerRol === 'superadmin'
    const esAdminEmpresa = callerRol === 'admin'
    const empresaCaller = perfilCaller?.empresa_id ?? null

    if (!esSuper && !esAdminEmpresa) {
      return NextResponse.json({ error: 'Solo un Admin puede vincular usuarios a la empresa' }, { status: 403 })
    }

    // Admin de empresa: obligatorio coincidir con su empresa (no confiar solo en el body).
    if (!esSuper) {
      if (!empresaCaller || empresaCaller !== empresa_id) {
        return NextResponse.json(
          { error: 'Solo puedes vincular usuarios a tu propia empresa' },
          { status: 403 }
        )
      }
    }

    let admin
    try {
      admin = getSupabaseAdmin()
    } catch {
      return NextResponse.json(
        { error: 'Servicio no disponible. Configura SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      )
    }

    const acceptedAt = new Date().toISOString()
    const payload: Record<string, unknown> = {
      user_id,
      empresa_id,
      rol,
      nombre_completo: nombre_completo || null,
      sucursal_id,
      ruta_id,
      activo: true,
      terminos_aceptados: true,
      terminos_version: LEGAL_VERSIONS.terminos,
      fecha_aceptacion: acceptedAt,
      ip_registro: null,
      privacidad_aceptada: true,
      privacidad_version: LEGAL_VERSIONS.privacidad,
      privacidad_fecha_aceptacion: acceptedAt,
      privacidad_ip: null,
    }

    const { data: perfil, error: upsertError } = await admin
      .from('perfiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single()

    if (upsertError) {
      console.error('[vincular-perfil-empresa] Error upsert:', upsertError)
      return NextResponse.json(
        { error: upsertError.message || 'No se pudo vincular el perfil a la empresa' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, perfil })
  } catch (e) {
    console.error('[vincular-perfil-empresa]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al vincular perfil' },
      { status: 500 }
    )
  }
}
