'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { suggestCurrencyFromLocale, type CurrencyCode } from '@/lib/utils/currencyDetection'
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/currency'
import { authService } from '@/lib/services/auth'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'jasi_currency'
const USER_METADATA_KEY = 'preferredCurrency'

const VALID_CODES: CurrencyCode[] = ['USD', 'MXN', 'COP', 'EUR', 'DOP', 'GTQ', 'PEN', 'CRC']

function isValidCurrency(code: string | undefined): code is CurrencyCode {
  return !!code && VALID_CODES.includes(code as CurrencyCode)
}

function resolveInitialCurrency(user: { user_metadata?: Record<string, unknown> } | null): CurrencyCode {
  if (typeof window === 'undefined') return 'USD'
  if (user?.user_metadata?.[USER_METADATA_KEY] && isValidCurrency(user.user_metadata[USER_METADATA_KEY] as string)) {
    return user.user_metadata[USER_METADATA_KEY] as CurrencyCode
  }
  const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null
  if (stored && VALID_CODES.includes(stored)) return stored
  return suggestCurrencyFromLocale()
}

type CurrencyContextType = {
  currency: CurrencyCode
  setCurrency: (code: CurrencyCode) => void | Promise<void>
  isReady: boolean
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD')
  const [isReady, setIsReady] = useState(false)

  const loadCurrencyFromUser = useCallback(async () => {
    try {
      const user = await authService.getCurrentUser()
      const resolved = resolveInitialCurrency(user)
      setCurrencyState(resolved)
      // Si el usuario está logueado y no tiene moneda guardada, persistir la resuelta (localStorage o sugerida)
      if (user?.user_metadata && !isValidCurrency(user.user_metadata[USER_METADATA_KEY] as string)) {
        await supabase.auth.updateUser({
          data: { ...user.user_metadata, [USER_METADATA_KEY]: resolved },
        })
      }
    } catch {
      const resolved = resolveInitialCurrency(null)
      setCurrencyState(resolved)
    } finally {
      setIsReady(true)
    }
  }, [])

  useEffect(() => {
    loadCurrencyFromUser()

    const authData = authService.onAuthStateChange(() => {
      loadCurrencyFromUser()
    })

    return () => {
      authData?.subscription?.unsubscribe()
    }
  }, [loadCurrencyFromUser])

  const setCurrency = useCallback(async (code: CurrencyCode) => {
    setCurrencyState(code)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, code)
    }
    try {
      const user = await authService.getCurrentUser()
      if (user?.user_metadata) {
        await supabase.auth.updateUser({
          data: { ...user.user_metadata, [USER_METADATA_KEY]: code },
        })
      }
    } catch {
      // Sin sesión o error: la preferencia ya quedó en state y localStorage
    }
  }, [])

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, isReady }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (ctx === undefined) {
    throw new Error('useCurrency debe usarse dentro de CurrencyProvider')
  }
  return ctx
}

/**
 * Hook que devuelve una función de formateo que usa la moneda del contexto.
 * Uso: const formatCurrency = useFormatCurrency(); formatCurrency(1200) → "$1,200.00 USD"
 */
export function useFormatCurrency() {
  const { currency } = useCurrency()
  return useMemo(
    () => (amount: number, showCode = true) =>
      formatCurrencyUtil(amount, { currency, showCode }),
    [currency]
  )
}
