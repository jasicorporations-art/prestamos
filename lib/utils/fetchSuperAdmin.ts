import { authService } from '@/lib/services/auth'
import { supabase } from '@/lib/supabase'

export interface FetchSuperAdminOptions extends Omit<RequestInit, 'credentials' | 'headers'> {
  headers?: HeadersInit
}

export async function fetchSuperAdmin(
  path: string,
  options: FetchSuperAdminOptions = {}
): Promise<Response> {
  let token: string | null = null

  try {
    const { data: { session } } = await supabase.auth.getSession()
    token = session?.access_token ?? null
  } catch (e) {
    console.warn('[fetchSuperAdmin] supabase.auth.getSession() falló:', e)
  }

  if (!token) {
    try {
      const session = await authService.getSession()
      token = session?.access_token ?? null
    } catch (e) {
      console.warn('[fetchSuperAdmin] authService.getSession() falló:', e)
    }
  }

  if (!token && typeof window !== 'undefined') {
    await new Promise((r) => setTimeout(r, 250))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      token = session?.access_token ?? null
    } catch {}
  }

  const headers = new Headers(options.headers || {})
  headers.set('Accept', 'application/json')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  } else {
    console.warn('[fetchSuperAdmin] No se encontró access_token para:', path)
  }

  return fetch(path, {
    ...options,
    credentials: 'include',
    headers,
    cache: 'no-store',
  })
}
