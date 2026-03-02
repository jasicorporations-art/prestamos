import { supabase } from '@/lib/supabase'
import { LEGAL_VERSIONS } from '@/lib/config/legal'
import type { Perfil } from '@/types'

export type LegalAcceptanceStatus = {
  terminos: boolean
  privacidad: boolean
  actualizado: boolean
}

export function evaluarAceptacionLegal(perfil: Perfil | null): LegalAcceptanceStatus {
  const terminos = Boolean(
    perfil?.terminos_aceptados &&
      (!perfil?.terminos_version || perfil?.terminos_version === LEGAL_VERSIONS.terminos)
  )
  const privacidad = Boolean(
    perfil?.privacidad_aceptada &&
      (!perfil?.privacidad_version || perfil?.privacidad_version === LEGAL_VERSIONS.privacidad)
  )

  return {
    terminos,
    privacidad,
    actualizado: terminos && privacidad,
  }
}

export async function registrarAceptacionLegal({
  userId,
  ipAddress,
  userAgent,
}: {
  userId: string
  ipAddress?: string | null
  userAgent?: string | null
}) {
  const acceptedAt = new Date().toISOString()

  const { error: perfilError } = await (supabase as any)
    .from('perfiles')
    .update({
      terminos_aceptados: true,
      terminos_version: LEGAL_VERSIONS.terminos,
      fecha_aceptacion: acceptedAt,
      ip_registro: ipAddress || null,
      privacidad_aceptada: true,
      privacidad_version: LEGAL_VERSIONS.privacidad,
      privacidad_fecha_aceptacion: acceptedAt,
      privacidad_ip: ipAddress || null,
    })
    .eq('user_id', userId)

  if (perfilError) {
    const errorMessage = perfilError.message || ''
    const errorCode = (perfilError as any).code || ''
    if (errorCode === '42703' || errorMessage.includes('does not exist')) {
      const { error: fallbackError } = await (supabase as any)
        .from('perfiles')
        .update({
          terminos_aceptados: true,
          fecha_aceptacion: acceptedAt,
        })
        .eq('user_id', userId)

      if (fallbackError) {
        throw fallbackError
      }
    } else {
      throw perfilError
    }
  }

  const { error: aceptacionError } = await (supabase as any).from('legal_aceptaciones').insert([
    {
      user_id: userId,
      documento: 'terminos',
      version: LEGAL_VERSIONS.terminos,
      accepted_at: acceptedAt,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    },
    {
      user_id: userId,
      documento: 'privacidad',
      version: LEGAL_VERSIONS.privacidad,
      accepted_at: acceptedAt,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    },
  ])

  if (aceptacionError) {
    const errorMessage = aceptacionError.message || ''
    const statusCode = (aceptacionError as any).status || 0
    if (
      statusCode === 404 ||
      errorMessage.includes('schema cache') ||
      errorMessage.includes('does not exist')
    ) {
      // La tabla legal_aceptaciones no existe: no bloquear el flujo.
      return
    }
    throw aceptacionError
  }
}
