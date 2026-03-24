import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  getPerfilPagosVerificar,
  tenantIdsUnicos,
} from '@/lib/server/pagos-pendientes-verificacion-tenant'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RpcResult = {
  ok?: boolean
  error?: string
  alreadyProcessed?: boolean
  estado?: string
  pago_id?: string
  numero_cuota?: number | null
}

function esNotificacionNoEncontrada(msg: string) {
  return (
    msg.includes('Notificación no encontrada') ||
    msg.includes('Notificacion no encontrada')
  )
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const admin = getSupabaseAdmin()
    const perfil = await getPerfilPagosVerificar(admin, user.id)
    const rol = (perfil?.rol || '').toLowerCase().replace(/\s+/g, '_')
    const permitido = rol === 'admin' || rol === 'super_admin' || rol === 'cobrador'
    const tenantIds = tenantIdsUnicos(perfil)
    if (!permitido || tenantIds.length === 0) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const id = params.id

    const runRpc = (pIdEmpresa: string) =>
      admin.rpc('aprobar_pago_pendiente_verificacion', {
        p_notificacion_id: id,
        p_id_empresa: pIdEmpresa,
        p_user_id: user.id,
        p_sucursal_id: perfil?.sucursal_id ?? null,
        p_usuario_nombre: perfil?.nombre_completo || user.email || 'Usuario',
      })

    let lastFailMsg = ''

    for (const tid of tenantIds) {
      const { data, error } = await runRpc(tid)
      if (error) {
        return NextResponse.json(
          {
            error: error.message,
            hint: 'Ejecuta en Supabase el script supabase/rpc-aprobar-pago-pendiente-verificacion.sql si la función no existe.',
          },
          { status: 500 }
        )
      }

      const result = (data ?? null) as RpcResult | null
      if (!result || typeof result !== 'object') {
        return NextResponse.json({ error: 'Respuesta RPC inválida' }, { status: 500 })
      }

      if (result.alreadyProcessed) {
        return NextResponse.json({ ok: true, alreadyProcessed: true, estado: result.estado })
      }

      if (result.ok) {
        if (!result.pago_id) {
          return NextResponse.json(
            {
              error:
                'Aprobación incompleta: el RPC respondió ok pero sin pago_id. Debe existir una fila en pagos para el portal. Vuelva a ejecutar supabase/rpc-aprobar-pago-pendiente-verificacion.sql en Supabase.',
            },
            { status: 500 }
          )
        }
        return NextResponse.json({
          ok: true,
          pago_id: result.pago_id,
          estado: result.estado,
          numero_cuota: result.numero_cuota,
        })
      }

      const msg = result.error || 'Error al aprobar pago'
      lastFailMsg = msg
      if (!esNotificacionNoEncontrada(msg)) {
        if (
          msg.includes('Préstamo no encontrado') ||
          msg.includes('Prestamo no encontrado')
        ) {
          return NextResponse.json({ error: msg }, { status: 404 })
        }
        return NextResponse.json({ error: msg }, { status: 500 })
      }
    }

    if (esNotificacionNoEncontrada(lastFailMsg)) {
      return NextResponse.json({ error: lastFailMsg }, { status: 404 })
    }
    return NextResponse.json({ error: lastFailMsg || 'Error al aprobar pago' }, { status: 500 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al aprobar pago' }, { status: 500 })
  }
}
