'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase } from '../supabase'
import { authService } from '../services/auth'
import { perfilesService } from '../services/perfiles'
import { authTraceStart } from '../utils/authInstrumentation'
import { isValidUUID } from '../utils/compania'

const IMPERSONATE_ORIGINAL_KEY = 'jasi_impersonate_original'
const IMPERSONATE_NOMBRE_KEY = 'jasi_impersonate_nombre'

interface CompaniaContextType {
  compania: string | null
  setCompania: (compania: string | null) => void
  loading: boolean
  isImpersonating: boolean
  impersonateNombre: string | null
  startImpersonation: (companiaId: string, nombre: string) => void
  endImpersonation: () => void
}

const CompaniaContext = createContext<CompaniaContextType | undefined>(undefined)

export function CompaniaProvider({ children }: { children: ReactNode }) {
  const [compania, setCompaniaState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [impersonateNombre, setImpersonateNombre] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    async function initializeCompania() {
      timeoutId = setTimeout(() => {
        if (!cancelled) {
          const saved = typeof window !== 'undefined' ? localStorage.getItem('compania_actual') : null
          const valid = saved && saved.trim() && saved !== 'SISTEMA' ? saved.trim() : null
          if (valid) setCompaniaState(valid)
          setLoading(false)
          if (process.env.NODE_ENV === 'development') {
            console.warn('[CompaniaContext] Timeout 5s - usando compania de localStorage')
          }
        }
      }, 5000)
      try {
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('compania_actual')
          const validSaved = saved && saved.trim() && saved !== 'SISTEMA' ? saved.trim() : null
          if (validSaved) {
            setCompaniaState(validSaved)
            setLoading(false)
            if (timeoutId) clearTimeout(timeoutId)
            return
          }
        }
        if (typeof window !== 'undefined' && sessionStorage.getItem(IMPERSONATE_ORIGINAL_KEY) != null) {
          const saved = localStorage.getItem('compania_actual')
          if (saved) setCompaniaState(saved)
          setIsImpersonating(true)
          setImpersonateNombre(sessionStorage.getItem(IMPERSONATE_NOMBRE_KEY))
          setLoading(false)
          return
        }
        const session = await authService.getSession()
        const getValidCompania = (v: string | null | undefined): string | null => {
          if (!v || typeof v !== 'string' || !v.trim() || v.trim() === 'SISTEMA') return null
          const trimmed = v.trim()
          return isValidUUID(trimmed) ? trimmed : null
        }

        if (!session?.user) {
          const savedCompania = localStorage.getItem('compania_actual')
          const validSaved = getValidCompania(savedCompania)
          if (validSaved) setCompaniaState(validSaved)
          setLoading(false)
          return
        }

        if (session?.user?.user_metadata?.compania) {
          const valid = getValidCompania(session.user.user_metadata.compania)
          if (valid) {
            setCompaniaState(valid)
            localStorage.setItem('compania_actual', valid)
            setLoading(false)
            return
          }
        }
        
        // Si no hay empresa en metadata, intentar desde el perfil
        if (session?.user && !session.user.user_metadata?.compania) {
          try {
            const perfil = await perfilesService.getPerfilActual()
            const valid = getValidCompania(perfil?.empresa_id || perfil?.compania_id)
            if (valid) {
              setCompaniaState(valid)
              localStorage.setItem('compania_actual', valid)
              setLoading(false)
              return
            }
          } catch (error) {
            console.warn('No se pudo obtener empresa desde perfil:', error)
          }
        }

        // Si no hay sesión o compania es SISTEMA, cargar desde localStorage solo si es válida
        const savedCompania = localStorage.getItem('compania_actual')
        const validSaved = getValidCompania(savedCompania)
        if (validSaved) {
          setCompaniaState(validSaved)
        } else if (savedCompania === 'SISTEMA') {
          localStorage.removeItem('compania_actual')
        }
      } catch (error) {
        console.error('Error inicializando compañía:', error)
        // Si hay error, intentar cargar desde localStorage
        const savedCompania = localStorage.getItem('compania_actual')
        if (savedCompania) {
          setCompaniaState(savedCompania)
        }
      } finally {
        clearTimeout(timeoutId)
        if (!cancelled) setLoading(false)
      }
    }

    initializeCompania()

    // Escuchar cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') authTraceStart('onAuthStateChangeSignedIn')
      if (typeof window !== 'undefined' && sessionStorage.getItem(IMPERSONATE_ORIGINAL_KEY) != null) return
      const getValidCompania = (v: string | null | undefined): string | null =>
        (v && typeof v === 'string' && v.trim() && v !== 'SISTEMA') ? v.trim() : null
      if (session?.user) {
        try {
          const fromMetadata = getValidCompania(session.user.user_metadata?.compania)
          if (fromMetadata) {
            setCompaniaState(fromMetadata)
            localStorage.setItem('compania_actual', fromMetadata)
            return
          }
          const perfil = await perfilesService.getPerfilActual()
          const fromPerfil = getValidCompania(perfil?.empresa_id || perfil?.compania_id)
          if (fromPerfil) {
            setCompaniaState(fromPerfil)
            localStorage.setItem('compania_actual', fromPerfil)
          }
        } catch (error) {
          console.warn('No se pudo obtener empresa desde perfil:', error)
        }
      } else if (event === 'SIGNED_OUT') {
        setCompaniaState(null)
        localStorage.removeItem('compania_actual')
        if (typeof window !== 'undefined') {
          import('../services/perfiles').then(({ invalidatePerfilCache }) => invalidatePerfilCache())
          sessionStorage.removeItem(IMPERSONATE_ORIGINAL_KEY)
          sessionStorage.removeItem(IMPERSONATE_NOMBRE_KEY)
        }
        setIsImpersonating(false)
        setImpersonateNombre(null)
      }
    })

    return () => {
      cancelled = true
      if (timeoutId != null) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const setCompania = useCallback((newCompania: string | null) => {
    setCompaniaState(newCompania)
    if (newCompania) {
      localStorage.setItem('compania_actual', newCompania)
    } else {
      localStorage.removeItem('compania_actual')
    }
  }, [])

  const startImpersonation = useCallback((companiaId: string, nombre: string) => {
    const current = typeof window !== 'undefined' ? localStorage.getItem('compania_actual') : null
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(IMPERSONATE_ORIGINAL_KEY, current ?? '')
      sessionStorage.setItem(IMPERSONATE_NOMBRE_KEY, nombre)
    }
    setCompaniaState(companiaId)
    localStorage.setItem('compania_actual', companiaId)
    setIsImpersonating(true)
    setImpersonateNombre(nombre)
  }, [])

  const endImpersonation = useCallback(() => {
    const original = typeof window !== 'undefined' ? sessionStorage.getItem(IMPERSONATE_ORIGINAL_KEY) : null
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(IMPERSONATE_ORIGINAL_KEY)
      sessionStorage.removeItem(IMPERSONATE_NOMBRE_KEY)
    }
    const value = original ?? null
    setCompaniaState(value)
    if (value) localStorage.setItem('compania_actual', value)
    else localStorage.removeItem('compania_actual')
    setIsImpersonating(false)
    setImpersonateNombre(null)
  }, [])

  return (
    <CompaniaContext.Provider value={{
      compania,
      setCompania,
      loading,
      isImpersonating,
      impersonateNombre,
      startImpersonation,
      endImpersonation,
    }}>
      {children}
    </CompaniaContext.Provider>
  )
}

export function useCompania() {
  const context = useContext(CompaniaContext)
  if (context === undefined) {
    throw new Error('useCompania must be used within a CompaniaProvider')
  }
  return context
}



