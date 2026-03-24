import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { CLIENTE_PORTAL_COOKIE_NAME, readClientePortalSession } from '@/lib/server/clientePortalSession'
import {
  hashPortalPassword,
  tienePortalPasswordConfigurada,
  verifyPortalPassword,
} from '@/lib/server/portalPassword'
import { verifyPrimeraClavePortal } from '@/lib/server/clientePortalPrimeraClave'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MIN_LEN = 8
const MAX_LEN = 128

function isMissingColumn(msg: string): boolean {
  const m = (msg || '').toLowerCase()
  return m.includes('column') && (m.includes('does not exist') || m.includes('not exist'))
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(CLIENTE_PORTAL_COOKIE_NAME)?.value
    const session = readClientePortalSession(token)
    if (!session) {
      return NextResponse.json({ error: 'Sesion invalida' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const actual = String(body?.contrasena_actual ?? '').trim()
    const nueva = String(body?.contrasena_nueva ?? '').trim()
    const confirmar = String(body?.confirmar_nueva ?? '').trim()

    if (!actual || !nueva || !confirmar) {
      return NextResponse.json({ error: 'Complete todos los campos' }, { status: 400 })
    }
    if (nueva !== confirmar) {
      return NextResponse.json({ error: 'La nueva contraseña y la confirmación no coinciden' }, { status: 400 })
    }
    if (nueva.length < MIN_LEN || nueva.length > MAX_LEN) {
      return NextResponse.json(
        { error: `La nueva contraseña debe tener entre ${MIN_LEN} y ${MAX_LEN} caracteres` },
        { status: 400 }
      )
    }
    if (nueva === actual) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe ser distinta a la actual' },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdmin()
    const { cliente_id, empresa_id } = session

    let { data: cliente, error: cErr } = await admin
      .from('clientes')
      .select('id, empresa_id, cedula, celular, portal_password')
      .eq('id', cliente_id)
      .eq('empresa_id', empresa_id)
      .maybeSingle()

    if (cErr && isMissingColumn(cErr.message || '')) {
      return NextResponse.json(
        { error: 'Esta función requiere la columna portal_password en clientes. Ejecuta el SQL en Supabase.' },
        { status: 503 }
      )
    }

    if (cErr || !cliente?.id) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const stored = (cliente as { portal_password?: string | null }).portal_password

    let actualOk = false
    if (tienePortalPasswordConfigurada(stored)) {
      actualOk = verifyPortalPassword(actual, stored)
    } else {
      actualOk = await verifyPrimeraClavePortal(
        admin,
        empresa_id,
        String(cliente.cedula),
        { celular: cliente.celular },
        actual
      )
    }

    if (!actualOk) {
      return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 401 })
    }

    const hash = hashPortalPassword(nueva)
    const nowIso = new Date().toISOString()
    const { error: uErr } = await admin
      .from('clientes')
      .update({
        portal_password: hash,
        portal_password_updated_at: nowIso,
      })
      .eq('id', cliente_id)

    if (uErr) {
      if (isMissingColumn(uErr.message || '')) {
        return NextResponse.json(
          {
            error:
              'Faltan columnas del portal en clientes. Ejecuta supabase/agregar-portal-password-clientes.sql',
          },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: uErr.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      mensaje:
        'Contraseña actualizada correctamente. En su próximo inicio de sesión deberá usar la nueva contraseña.',
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al cambiar contraseña' },
      { status: 500 }
    )
  }
}
