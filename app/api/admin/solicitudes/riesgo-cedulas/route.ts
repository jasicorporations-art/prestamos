import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  getPerfilPagosVerificar,
  tenantIdsUnicos,
  isRolAdminOSuper,
  isRolSuperAdmin,
} from '@/lib/server/require-admin-api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const admin = getSupabaseAdmin()
    const perfil = await getPerfilPagosVerificar(admin, user.id)
    if (!isRolAdminOSuper(perfil?.rol)) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const tenantIds = tenantIdsUnicos(perfil)
    const verTodo = isRolSuperAdmin(perfil?.rol)

    if (!verTodo && tenantIds.length === 0) {
      return NextResponse.json(
        { error: 'Perfil sin empresa asignada; no se puede calcular riesgo.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const cedulasInput = Array.isArray(body?.cedulas) ? body.cedulas : []
    const cedulas = cedulasInput.map((c: unknown) => String(c || '').trim()).filter(Boolean)
    if (!cedulas.length) return NextResponse.json({ map: {} })

    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    let q = admin
      .from('solicitudes_prestamos')
      .select('empresa_id, created_at, datos_cliente')
      .gte('created_at', since)
      .in('estado', ['pendiente', 'aprobado', 'rechazado'])

    if (!verTodo) {
      q = q.in('empresa_id', tenantIds)
    }

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const map: Record<string, { total_48h: number; empresas_48h: number; riesgo_multi: boolean }> = {}
    for (const ced of cedulas) {
      const rows = (data || []).filter((r: any) => String(r?.datos_cliente?.cedula || '') === ced)
      const empresas = new Set(rows.map((r: any) => r?.empresa_id).filter(Boolean))
      const total = rows.length
      const multi = total > 3 && empresas.size > 1
      map[ced] = { total_48h: total, empresas_48h: empresas.size, riesgo_multi: multi }
    }

    return NextResponse.json({ map })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error calculando riesgo' }, { status: 500 })
  }
}
