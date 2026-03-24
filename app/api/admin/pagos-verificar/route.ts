import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { normalizarEstadoPagoVerificacion } from '@/lib/estado-pago-verificacion'
import { signComprobanteStorageUrl } from '@/lib/storage/sign-comprobante-storage-url'
import {
  fetchPagosPendientesTodosLosTenants,
  getPerfilPagosVerificar,
  tenantIdsUnicos,
  type RowPagoPendiente,
} from '@/lib/server/pagos-pendientes-verificacion-tenant'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function clienteIdOf(r: RowPagoPendiente): string {
  return String(r.id_cliente ?? r.cliente_id ?? '')
}

function prestamoIdOf(r: RowPagoPendiente): string {
  return String(r.id_prestamo ?? r.prestamo_id ?? r.venta_id ?? '')
}

/**
 * Lista notificaciones de pago del tenant del admin.
 *
 * - `empresa_id` y `compania_id` del perfil (multi-tenant): se consultan ambos y se fusionan filas.
 * - Por cada UUID: `id_empresa` / `empresa_id` / `compania_id` en la tabla de pendientes.
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getUserFromRequest(_request)
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

    const { rows, error: fetchError } = await fetchPagosPendientesTodosLosTenants(
      admin,
      tenantIds
    )

    if (fetchError) {
      return NextResponse.json({ error: fetchError }, { status: 500 })
    }

    const clienteIds = [...new Set(rows.map(clienteIdOf).filter(Boolean))]
    const prestamoIds = [...new Set(rows.map(prestamoIdOf).filter(Boolean))]

    const [{ data: clientesData }, { data: ventasData }] = await Promise.all([
      clienteIds.length
        ? admin.from('clientes').select('id, nombre_completo, cedula, celular').in('id', clienteIds)
        : Promise.resolve({ data: [] as any[] }),
      prestamoIds.length
        ? admin.from('ventas').select('id, numero_prestamo').in('id', prestamoIds)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const clienteMap = new Map(
      ((clientesData || []) as Array<any>).map((c) => [
        String(c.id),
        {
          nombre_completo: c.nombre_completo ?? '',
          cedula: c.cedula ?? '',
          celular: c.celular ?? '',
        },
      ])
    )

    const ventaMap = new Map(
      ((ventasData || []) as Array<any>).map((v) => [
        String(v.id),
        {
          numero_prestamo: v.numero_prestamo ?? '',
        },
      ])
    )

    const items = await Promise.all(
      rows.map(async (row) => {
        const cid = clienteIdOf(row)
        const pid = prestamoIdOf(row)
        return {
          id: String(row.id ?? ''),
          prestamo_id: pid,
          monto: Number(row.monto || 0),
          foto_comprobante: await signComprobanteStorageUrl(
            admin,
            String(row.foto_comprobante ?? '')
          ),
          fecha_notificacion: String(row.fecha_notificacion ?? ''),
          estado: normalizarEstadoPagoVerificacion(row.estado),
          motivo_rechazo: (row.motivo_rechazo as string | null | undefined) ?? null,
          updated_at: (row.updated_at as string | null | undefined) ?? null,
          clientes: clienteMap.get(String(cid)) ?? null,
          ventas: ventaMap.get(String(pid)) ?? null,
        }
      })
    )

    return NextResponse.json(
      { items },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : 'Error cargando pagos por verificar',
      },
      { status: 500 }
    )
  }
}
