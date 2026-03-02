'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '../supabase'

const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'

/** Limpia cache de clientes cuando no hay sesión o cambia usuario/empresa */
function clearClientCache() {
  if (typeof window === 'undefined') return
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('jasi_clientes_cache')) keysToRemove.push(k)
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k))
    if (isDev && keysToRemove.length > 0) {
      console.log('[SupabaseAuth] Cache limpiado:', keysToRemove.length, 'claves')
    }
  } catch {
    /* ignore */
  }
}

interface SupabaseAuthContextType {
  sessionReady: boolean
  hasSession: boolean
  refreshSession: () => Promise<void>
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined)

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [sessionReady, setSessionReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (isDev) {
        console.log('[SupabaseAuth] getSession:', { hasSession: !!session?.user, event: 'boot', error: error?.message })
      }
      if (error) {
        setHasSession(false)
        clearClientCache()
        return
      }
      setHasSession(!!session?.user)
      if (!session?.user) {
        clearClientCache()
      }
    } catch (e) {
      if (isDev) console.warn('[SupabaseAuth] getSession error:', e)
      setHasSession(false)
      clearClientCache()
    } finally {
      setSessionReady(true)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function boot() {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (isDev) {
        console.log('[SupabaseAuth] boot getSession:', {
          hasSession: !!session?.user,
          userId: session?.user?.id?.slice(0, 8),
          error: error?.message,
        })
      }
      if (!mounted) return
      setHasSession(!!session?.user)
      if (!session?.user) {
        clearClientCache()
      }
      setSessionReady(true)
    }

    boot()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isDev) {
        console.log('[SupabaseAuth] onAuthStateChange:', { event, hasSession: !!session?.user })
      }
      if (!mounted) return
      setHasSession(!!session?.user)
      if (!session?.user) {
        clearClientCache()
      }
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  return (
    <SupabaseAuthContext.Provider value={{ sessionReady, hasSession, refreshSession }}>
      {children}
    </SupabaseAuthContext.Provider>
  )
}

export function useSupabaseAuth() {
  const ctx = useContext(SupabaseAuthContext)
  if (ctx === undefined) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider')
  }
  return ctx
}
