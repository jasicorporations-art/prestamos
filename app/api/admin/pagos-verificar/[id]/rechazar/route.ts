import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { normalizarEstadoPagoVerificacion } from '@/lib/estado-pago-verificacion'
import {
  getPerfilPagosVerificar,
  isLikelyMissingColumnError,
  tenantIdsUnicos,
} from '@/lib/server/pagos-pendientes-verificacion-tenant'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function updateRechazoParaTenant(
  admin: ReturnType<typeof getSupabaseAdmin>,
  params: {
    notifId: string
    tenantId: string
    patch: Record<string, unknown>
    userId: string
  }
) {
  const { notifId, tenantId, patch } = params

  let res = await admin
    .from('pagos_pendientes_verificacion')
    .update(patch)
    .eq('id', notifId)
    .or(`id_empresa.eq.${tenantId},empresa_id.eq.${tenantId}`)
    .select('id, estado')
    .maybeSingle()

  if (res.error && isLikelyMissingColumnError(res.error.message)) {
    res = await admin
      .from('pagos_pendientes_verificacion')
      .update(patch)
      .eq('id', notifId)
      .eq('id_empresa', tenantId)
      .select('id, estado')
      .maybeSingle()
  } else if (!res.error && !res.data) {
    res = await admin
      .from('pagos_pendientes_verificacion')
      .update(patch)
      .eq('id', notifId)
      .eq('id_empresa', tenantId)
      .select('id, estado')
      .maybeSingle()
  }

  if (!res.error && !res.data) {
    const rComp = await admin
      .from('pagos_pendientes_verificacion')
      .update(patch)
      .eq('id', notifId)
      .eq('compania_id', tenantId)
      .select('id, estado')
      .maybeSingle()
    if (!rComp.error && rComp.data) {
      res = rComp
    } else if (rComp.error && !isLikelyMissingColumnError(rComp.error.message)) {
      return rComp
    }
  }

  if (!res.error && !res.data) {
    const rEmp = await admin
      .from('pagos_pendientes_verificacion')
      .update(patch)
      .eq('id', notifId)
      .eq('empresa_id', tenantId)
      .select('id, estado')
      .maybeSingle()
    if (!rEmp.error && rEmp.data) {
      res = rEmp
    }
  }

  return res
}

/** Supabase JS: .update() antes que .eq() encadenados */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const perfil = await getPerfilPagosVerificar(admin, user.id)

    const rol = String(perfil?.rol || '')
      .toLowerCase()
      .replace(/\s+/g, '_')

    const permitido =
      rol === 'admin' ||
      rol === 'super_admin' ||
      rol === 'cobrador'

    const tenantIds = tenantIdsUnicos(perfil)

    if (!permitido || tenantIds.length === 0) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const motivo = typeof body?.motivo === 'string' ? body.motivo.trim() : ''

    if (!motivo) {
      return NextResponse.json({ error: 'Motivo requerido' }, { status: 400 })
    }

    const notifId = params.id
    const nowIso = new Date().toISOString()

    const intentos: Array<{ patch: Record<string, unknown> }> = [
      {
        patch: {
          estado: 'Rechazado',
          motivo_rechazo: motivo,
          aprobado_por_user_id: user.id,
          updated_at: nowIso,
        },
      },
      {
        patch: {
          estado: 'Rechazado',
          motivo_rechazo: motivo,
          revisado_por_user_id: user.id,
          fecha_revision: nowIso,
          updated_at: nowIso,
        },
      },
      {
        patch: {
          estado: 'Rechazado',
          motivo_rechazo: motivo,
          updated_at: nowIso,
        },
      },
    ]

    let upd: {
      data: { id: string; estado: string } | null
      error: { message: string } | null
    } | null = null

    outer: for (const { patch } of intentos) {
      for (const tenantId of tenantIds) {
        const res = await updateRechazoParaTenant(admin, {
          notifId,
          tenantId,
          patch,
          userId: user.id,
        })

        if (res.error) {
          if (isLikelyMissingColumnError(res.error.message)) {
            continue
          }
          return NextResponse.json({ error: res.error.message }, { status: 500 })
        }

        if (
          res.data &&
          normalizarEstadoPagoVerificacion(res.data.estado) === 'Rechazado'
        ) {
          upd = res
          break outer
        }
      }
    }

    if (!upd?.data || normalizarEstadoPagoVerificacion(upd.data.estado) !== 'Rechazado') {
      return NextResponse.json(
        { error: 'No se pudo rechazar la notificación (0 filas actualizadas).' },
        { status: 409 }
      )
    }

    const empresaLog = perfil?.empresa_id || perfil?.compania_id || null

    await admin.from('actividad_logs').insert({
      empresa_id: empresaLog,
      usuario_id: user.id,
      accion: 'Rechazó pago por verificar',
      detalle: `Notificación ${notifId} rechazada. Motivo: ${motivo}`,
      entidad_tipo: 'pagos_pendientes_verificacion',
      entidad_id: notifId,
      usuario_nombre: perfil?.nombre_completo || user.email || 'Usuario',
    })

    return NextResponse.json({ ok: true, estado: 'Rechazado' })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al rechazar pago' },
      { status: 500 }
    )
  }
}
