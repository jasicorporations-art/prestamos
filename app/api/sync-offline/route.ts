/**
 * API para sincronizar operaciones offline desde Background Sync (Service Worker).
 * Recibe las operaciones pendientes y las ejecuta en Supabase con la sesión del usuario.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase-server'
import type { PendingOperation } from '@/lib/utils/offlineOpsDB'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const operations: PendingOperation[] = Array.isArray(body.operations)
      ? body.operations
      : Array.isArray(body)
        ? body
        : []

    if (!operations?.length) {
      return NextResponse.json({ success: 0, failed: 0, syncedIds: [] })
    }

    const syncedIds: string[] = []
    let success = 0
    let failed = 0

    for (const op of operations) {
      try {
        await syncOperation(supabase, op)
        syncedIds.push(op.id)
        success++
      } catch (err) {
        console.error(`[sync-offline] Error en ${op.id}:`, err)
        failed++
      }
    }

    return NextResponse.json({ success, failed, syncedIds })
  } catch (error: any) {
    console.error('[sync-offline] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function syncOperation(supabase: any, op: PendingOperation): Promise<void> {
  const { type, entity, data } = op

  switch (entity) {
    case 'venta':
      if (type === 'create') {
        const ventaData = {
          ...data,
          fecha_venta: data.fecha_venta || new Date().toISOString(),
          empresa_id: data.empresa_id || data.compania_id,
          compania_id: data.compania_id || data.empresa_id,
        }
        const { error } = await supabase.from('ventas').insert(ventaData).select().single()
        if (error) throw error
      } else throw new Error(`Operación ${type} no soportada para ventas`)
      break

    case 'cliente':
      if (type === 'create') {
        const { error } = await supabase.from('clientes').insert(data).select().single()
        if (error) throw error
      } else if (type === 'update') {
        const { error } = await supabase.from('clientes').update({ ...data, updated_at: new Date().toISOString() }).eq('id', data.id)
        if (error) throw error
      } else if (type === 'delete') {
        const { error } = await supabase.from('clientes').delete().eq('id', data.id)
        if (error) throw error
      } else throw new Error(`Operación ${type} no soportada para clientes`)
      break

    case 'pago':
      if (type === 'create') {
        const pagoData = { ...data, fecha_pago: data.fecha_pago || new Date().toISOString() }
        const { error } = await supabase.from('pagos').insert(pagoData).select().single()
        if (error) throw error
      } else if (type === 'delete') {
        const { error } = await supabase.from('pagos').delete().eq('id', data.id)
        if (error) throw error
      } else throw new Error(`Operación ${type} no soportada para pagos`)
      break

    case 'motor':
      if (type === 'create') {
        const { error } = await supabase.from('motores').insert(data).select().single()
        if (error) throw error
      } else if (type === 'update') {
        const { error } = await supabase.from('motores').update({ ...data, updated_at: new Date().toISOString() }).eq('id', data.id)
        if (error) throw error
      } else if (type === 'delete') {
        const { error } = await supabase.from('motores').delete().eq('id', data.id)
        if (error) throw error
      } else throw new Error(`Operación ${type} no soportada para motores`)
      break

    default:
      throw new Error(`Entidad desconocida: ${entity}`)
  }
}
