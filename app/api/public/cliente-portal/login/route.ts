import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { buildClientePortalSession, CLIENTE_PORTAL_COOKIE_NAME } from '@/lib/server/clientePortalSession'
import { isValidUUID } from '@/lib/utils/compania'
import {
  tienePortalPasswordConfigurada,
  verifyPortalPassword,
} from '@/lib/server/portalPassword'
import { verifyPrimeraClavePortal } from '@/lib/server/clientePortalPrimeraClave'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function normalizeCedula(v: string): string {
  return v.replace(/\s+/g, '').replace(/-/g, '')
}

function isMissingColumn(msg: string): boolean {
  const m = (msg || '').toLowerCase()
  return m.includes('column') && (m.includes('does not exist') || m.includes('not exist'))
}

export async function POST(request: NextRequest) {
  try {
    const admin = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))
    let empresaId = String(body?.empresa_id || '').trim()
    const empresaNombreInput = String(body?.empresa_nombre || '').trim()
    const cedula = normalizeCedula(String(body?.cedula || '').trim())
    const cred = String(body?.pin_o_ultimos4 || '').trim()

    if (!isValidUUID(empresaId) && empresaNombreInput) {
      const { data: empresaPorNombre } = await admin
        .from('empresas')
        .select('id,nombre')
        .ilike('nombre', empresaNombreInput)
        .limit(1)
        .maybeSingle()
      if (empresaPorNombre?.id) empresaId = String(empresaPorNombre.id)
    }

    if (!isValidUUID(empresaId) || !cedula || !cred) {
      return NextResponse.json({ error: 'Datos incompletos o invalidos' }, { status: 400 })
    }

    let { data: cliente, error: cErr } = await admin
      .from('clientes')
      .select('id, empresa_id, cedula, celular, portal_password')
      .eq('empresa_id', empresaId)
      .eq('cedula', cedula)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cErr && isMissingColumn(cErr.message || '')) {
      const retry = await admin
        .from('clientes')
        .select('id, empresa_id, cedula, celular')
        .eq('empresa_id', empresaId)
        .eq('cedula', cedula)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      cliente = retry.data as typeof cliente
      cErr = retry.error
    }

    if (cErr || !cliente?.id) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    if (tienePortalPasswordConfigurada((cliente as { portal_password?: string | null }).portal_password)) {
      if (
        !verifyPortalPassword(cred, (cliente as { portal_password?: string | null }).portal_password)
      ) {
        return NextResponse.json(
          { error: 'Contraseña del portal incorrecta' },
          { status: 401 }
        )
      }
    } else {
      const okPrimera = await verifyPrimeraClavePortal(
        admin,
        empresaId,
        cedula,
        { celular: cliente.celular },
        cred
      )
      if (!okPrimera) {
        return NextResponse.json(
          { error: 'PIN o ultimos 4 del telefono incorrectos' },
          { status: 401 }
        )
      }
    }

    const { data: empresa } = await admin.from('empresas').select('id,nombre').eq('id', empresaId).maybeSingle()

    const token = buildClientePortalSession(cliente.id, empresaId)
    const res = NextResponse.json({
      ok: true,
      empresa_id: empresaId,
      empresa_nombre: empresa?.nombre || null,
    })
    res.cookies.set(CLIENTE_PORTAL_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    })
    return res
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error de autenticacion' }, { status: 500 })
  }
}
