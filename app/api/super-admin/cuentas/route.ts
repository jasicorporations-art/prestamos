import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { PLANES, type PlanType } from '@/lib/config/planes'
import { requireSuperAdmin } from '@/lib/auth-super-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })
  try {
    const admin = createServiceRoleClient()
    let users: { id: string; email?: string; user_metadata?: Record<string, unknown> }[] = []

    let page = 1
    const perPage = 1000
    let lastBatch: { id: string; email?: string; user_metadata?: Record<string, unknown> }[] = []
    do {
      const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page, perPage })
      if (usersError) {
        console.warn('[super-admin/cuentas] listUsers failed:', usersError.message)
        break
      }
      lastBatch = (usersData?.users ?? []) as { id: string; email?: string; user_metadata?: Record<string, unknown> }[]
      users = users.concat(lastBatch)
      page++
    } while (lastBatch.length === perPage)

    let perfilesRes = await admin
      .from('perfiles')
      .select('user_id,empresa_id,compania_id,rol,activo,email,nombre_completo')
    if (perfilesRes.error && /column|does not exist/i.test(perfilesRes.error.message || '')) {
      perfilesRes = await admin.from('perfiles').select('user_id,empresa_id,rol,activo,email,nombre_completo')
    }
    if (perfilesRes.error) throw perfilesRes.error
    const perfiles = perfilesRes.data
    let empresas: { id: string; nombre: string; user_id?: string }[] | null = null
    let empresasRes = await admin.from('empresas').select('id,nombre,user_id')
    if (empresasRes.error && /column|does not exist/i.test(empresasRes.error.message || '')) {
      empresasRes = await admin.from('empresas').select('id,nombre')
    }
    if (empresasRes.error) throw empresasRes.error
    empresas = (empresasRes.data || []) as { id: string; nombre: string; user_id?: string }[]

    const empresaMap = new Map<string, string>()
    const empresaByOwner = new Map<string, string>()
    for (const e of empresas || []) {
      const emp = e as { id: string; nombre: string; user_id?: string }
      empresaMap.set(emp.id, emp.nombre)
      empresaMap.set(emp.nombre, emp.nombre)
      if (emp.user_id) empresaByOwner.set(emp.user_id, emp.nombre)
    }
    const perfilesByUser = new Map<
      string,
      { empresa_id?: string; compania_id?: string; rol?: string; activo?: boolean; email?: string }[]
    >()
    for (const p of perfiles || []) {
      const key = (p as { user_id?: string }).user_id
      if (!key) continue
      if (!perfilesByUser.has(key)) perfilesByUser.set(key, [])
      perfilesByUser.get(key)!.push({
        empresa_id: (p as { empresa_id?: string }).empresa_id,
        compania_id: (p as { compania_id?: string }).compania_id,
        rol: (p as { rol?: string }).rol,
        activo: (p as { activo?: boolean }).activo,
        email: (p as { email?: string }).email,
      })
    }

    if (users.length === 0) {
      const userIds = new Set<string>()
      for (const p of perfiles || []) {
        const uid = (p as { user_id?: string }).user_id
        if (uid) userIds.add(uid)
      }
      users = Array.from(userIds).map((id) => ({ id, email: (perfilesByUser.get(id)?.[0]?.email as string) || `user-${id.slice(0, 8)}`, user_metadata: {} }))
    }

    const cuentas = users.map((u: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
      const perfilesUser = perfilesByUser.get(u.id) || []
      const primerPerfil = perfilesUser[0]
      const empresaId =
        primerPerfil?.empresa_id ||
        (primerPerfil as { compania_id?: string })?.compania_id ||
        undefined
      const nombrePorPerfil = empresaId ? empresaMap.get(empresaId) : null
      const nombrePorOwner = empresaByOwner.get(u.id)
      const empresa_nombre = nombrePorPerfil ?? nombrePorOwner ?? (u.user_metadata?.compania as string) ?? '-'
      const planType = ((u.user_metadata?.planType as string) || 'TRIAL') as PlanType
      const trialEndDate = u.user_metadata?.trialEndDate as string | undefined
      const isLifetime = u.user_metadata?.isLifetime === true
      const isActive = u.user_metadata?.isActive !== false
      const rol = primerPerfil?.rol ?? '-'
      const activo = primerPerfil?.activo ?? true
      const plan = PLANES[planType]
      return {
        id: u.id,
        email: u.email ?? primerPerfil?.email ?? '-',
        planType,
        planNombre: plan?.nombre ?? planType,
        trialEndDate: trialEndDate || null,
        isLifetime: !!isLifetime,
        suscripcionActiva: isActive,
        empresa_id: empresaId || null,
        empresa_nombre: empresa_nombre || '-',
        rol,
        perfilActivo: activo,
      }
    })

    return NextResponse.json({ cuentas })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
