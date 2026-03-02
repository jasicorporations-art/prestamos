import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { getAppId, shouldApplyAppId, withAppIdData, withAppIdFilter } from './utils/appId'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kpqvzkgsbawfqdsxjdjc.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ6a2dzYmF3ZnFkc3hqZGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTQ4NTMsImV4cCI6MjA4MjQzMDg1M30.6TF4spG7V9Z9UvXslezSDCyxBwjM_-OAcEfZEVCvbng'

function wrapQuery(query: any, tableName: string) {
  return new Proxy(query, {
    get(target, prop, receiver) {
      if (prop === 'select') {
        return (...args: any[]) =>
          shouldApplyAppId(tableName)
            ? withAppIdFilter(target.select(...args), tableName)
            : target.select(...args)
      }
      if (prop === 'update') {
        return (values: any, ...args: any[]) =>
          shouldApplyAppId(tableName)
            ? withAppIdFilter(target.update(withAppIdData(values, tableName), ...args), tableName)
            : target.update(values, ...args)
      }
      if (prop === 'insert') {
        return (values: any, ...args: any[]) =>
          shouldApplyAppId(tableName)
            ? target.insert(withAppIdData(values, tableName), ...args)
            : target.insert(values, ...args)
      }
      return Reflect.get(target, prop, receiver)
    },
  })
}

function wrapClient(client: any) {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'from') {
      return (table: string) => wrapQuery((target as any).from(table), table)
      }
      const value = Reflect.get(target, prop, receiver)
      if (typeof value === 'function') {
        return value.bind(target)
      }
      return value
    },
  })
}

/**
 * Cliente de Supabase para usar en Server Components
 * Lee las cookies usando next/headers
 */
export async function createClient() {
  const cookieStore = await cookies()
  const appId = getAppId()
  const storageKey = appId ? `jasi-${appId.toLowerCase()}-auth` : undefined

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kpqvzkgsbawfqdsxjdjc.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ6a2dzYmF3ZnFkc3hqZGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTQ4NTMsImV4cCI6MjA4MjQzMDg1M30.6TF4spG7V9Z9UvXslezSDCyxBwjM_-OAcEfZEVCvbng',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Las cookies pueden no ser modificables en algunos contextos
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Las cookies pueden no ser modificables en algunos contextos
          }
        },
      },
      cookieOptions: storageKey ? { name: storageKey } : undefined,
    }
  )
  return wrapClient(client)
}

/**
 * Cliente de Supabase para usar en API Routes
 * Lee las cookies directamente del NextRequest.
 * Usa el mismo storageKey que el cliente del navegador (jasi-{appId}-auth) para que la sesión se reconozca.
 */
export function createClientFromRequest(request: NextRequest) {
  const appId = getAppId()
  const storageKey = appId && appId !== '' ? `jasi-${appId.toLowerCase()}-auth` : undefined

  const allCookies = request.cookies.getAll()
  const supabaseCookies = allCookies.filter(c =>
    c.name.includes('sb-') || c.name.includes('supabase') || c.name === (storageKey ?? '')
  )

  if (supabaseCookies.length === 0 && !storageKey) {
    console.log('⚠️ No se encontraron cookies de Supabase en la request')
    console.log('Cookies disponibles:', allCookies.map(c => c.name))
  }

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kpqvzkgsbawfqdsxjdjc.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ6a2dzYmF3ZnFkc3hqZGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTQ4NTMsImV4cCI6MjA4MjQzMDg1M30.6TF4spG7V9Z9UvXslezSDCyxBwjM_-OAcEfZEVCvbng',
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // En API routes, no podemos modificar cookies directamente
        },
        remove(name: string, options: CookieOptions) {
          // En API routes, no podemos modificar cookies directamente
        },
      },
      cookieOptions: storageKey ? { name: storageKey } : undefined,
    }
  )
  return wrapClient(client)
}

/**
 * Obtiene el usuario desde la request: primero intenta cookies, luego Authorization Bearer.
 * Útil cuando el cliente guarda la sesión en localStorage (no envía cookies).
 */
export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  const fromCookies = createClientFromRequest(request)
  const { data: { user }, error } = await fromCookies.auth.getUser()
  if (user && !error) return user
  const { data: { session } } = await fromCookies.auth.getSession()
  if (session?.user) return session.user

  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token || !supabaseAnonKey) return null
  const anon = createSupabaseClient(supabaseUrl, supabaseAnonKey)
  const { data: { user: userFromJwt }, error: jwtError } = await anon.auth.getUser(token)
  if (jwtError || !userFromJwt) return null
  return userFromJwt
}

/**
 * Obtiene el usuario actual desde las cookies en una API route
 */
export async function getServerUser() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      if (error.message?.includes('session missing') || error.message?.includes('Auth session missing')) {
        return null
      }
      throw error
    }
    
    return user
  } catch (error: any) {
    if (error?.message?.includes('session missing') || error?.message?.includes('Auth session missing')) {
      return null
    }
    throw error
  }
}

/**
 * Cliente con Service Role para operaciones super-admin (bypass RLS).
 * Solo usar en API routes después de verificar que el usuario tiene rol super_admin.
 */
export function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for super-admin operations')
  }
  return createSupabaseClient(supabaseUrl, key)
}