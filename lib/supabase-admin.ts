import { createClient } from '@supabase/supabase-js'

/**
 * Cliente de Supabase con permisos de administrador
 * Solo debe usarse en rutas API del servidor (nunca en el cliente)
 * Requiere SUPABASE_SERVICE_ROLE_KEY en variables de entorno
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceRoleKey) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY no está configurada. Las funciones de admin no funcionarán.')
}

export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

/**
 * Obtiene el cliente de admin o lanza error
 */
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY no está configurada. Por favor, configura esta variable de entorno en Vercel.'
    )
  }
  return supabaseAdmin
}

