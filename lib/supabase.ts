// lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// =====================
// 1️⃣ Variables de entorno
// =====================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '❌ ERROR: Variables de entorno NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no definidas.'
  )
}

if (!SUPABASE_SERVICE_ROLE_KEY && typeof window === 'undefined') {
  console.warn(
    '⚠️ Advertencia: SUPABASE_SERVICE_ROLE_KEY no está definida. El cliente admin no funcionará.'
  )
}

// =====================
// 2️⃣ Cliente browser (para frontend)
// =====================
const AUTH_STORAGE_KEY = 'sb-auth'

let supabaseClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient

  const authOptions =
    typeof window !== 'undefined'
      ? {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: AUTH_STORAGE_KEY,
          storage: window.localStorage,
        }
      : {
          persistSession: false,
          autoRefreshToken: false,
        }

  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: authOptions })
  return supabaseClient
}

// =====================
// 3️⃣ Cliente admin/server (solo server-side)
// =====================
export function getSupabaseAdmin(): SupabaseClient {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      '❌ ERROR: SUPABASE_SERVICE_ROLE_KEY no definida. Solo usar en server-side.'
    )
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

// =====================
// 4️⃣ Export cliente por defecto (browser)
// =====================
export const supabase = getSupabaseClient()

// Cliente sin proxy (para consultas que no usan appId) — compatibilidad con servicios existentes
export const supabaseRaw = getSupabaseClient()

/** Log de errores Supabase (solo en desarrollo) — usado por servicios */
export function logSupabaseError(table: string, op: string, err: unknown) {
  if (process.env.NODE_ENV !== 'development') return
  const e = err as { status?: number; message?: string; hint?: string }
  console.warn(`[Supabase] ${table} ${op}:`, { status: e?.status, message: e?.message, hint: e?.hint })
}
