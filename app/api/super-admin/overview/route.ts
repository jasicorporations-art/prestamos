import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/auth-super-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })
  try {
    const admin = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const empresaIdImpersonate = searchParams.get('empresa_id') || undefined

    const { count: totalEmpresas } = await admin.from('empresas').select('*', { count: 'exact', head: true })

    // Mis Ganancias (SaaS): suma de pagos_plataforma (sin filtro compania_id - ingresos globales de JasiCorp)
    let ingresosJasiCorp = 0
    try {
      const { data: rowsPlataforma } = await admin.from('pagos_plataforma').select('monto')
      ingresosJasiCorp = (rowsPlataforma || []).reduce((s: number, r: { monto?: number }) => s + Number(r.monto || 0), 0)
    } catch {
      // Tabla puede no existir aún
    }
    ingresosJasiCorp = Math.round(ingresosJasiCorp * 100) / 100

    // Cartera Total Administrada: suma de monto_total de ventas (préstamos). Sin filtro = global; empresa_id = modo impersonate.
    let carteraTotalAdministrada = 0
    try {
      let q = admin.from('ventas').select('monto_total')
      if (empresaIdImpersonate) q = q.eq('empresa_id', empresaIdImpersonate)
      const { data: rowsVentas } = await q
      carteraTotalAdministrada = (rowsVentas || []).reduce((s: number, r: { monto_total?: number }) => s + Number(r.monto_total || 0), 0)
    } catch {
      carteraTotalAdministrada = 0
    }
    carteraTotalAdministrada = Math.round(carteraTotalAdministrada * 100) / 100

    // Cuentas activas: perfiles con activo = true; si no existe columna activo, contar todos los perfiles
    let cuentasActivas = 0
    try {
      const { count: countActivos } = await admin.from('perfiles').select('*', { count: 'exact', head: true }).eq('activo', true)
      cuentasActivas = countActivos ?? 0
    } catch {
      try {
        const { count: countPerfiles } = await admin.from('perfiles').select('*', { count: 'exact', head: true })
        cuentasActivas = countPerfiles ?? 0
      } catch {
        cuentasActivas = 0
      }
    }

    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    let erroresDia = 0
    try {
      const { count } = await admin.from('system_logs').select('*', { count: 'exact', head: true }).gte('created_at', hace24h)
      erroresDia = count ?? 0
    } catch {
      erroresDia = 0
    }

    return NextResponse.json({
      empresasActivas: totalEmpresas ?? 0,
      cuentasActivas,
      ingresosJasiCorp,
      carteraTotalAdministrada,
      erroresDia,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
