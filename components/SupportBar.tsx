'use client'

import { useRouter } from 'next/navigation'
import { useCompania } from '@/lib/contexts/CompaniaContext'
import { LogOut } from 'lucide-react'

export function SupportBar() {
  const router = useRouter()
  const { isImpersonating, impersonateNombre, endImpersonation } = useCompania()

  if (!isImpersonating) return null

  const handleEndSupport = () => {
    endImpersonation()
    router.push('/super-admin')
  }

  return (
    <div className="sticky top-0 z-50 w-full min-w-0 bg-gradient-to-r from-amber-600 to-red-600 text-white shadow-lg">
      <div className="w-full max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">
          Modo soporte: viendo como <strong>{impersonateNombre ?? 'Empresa'}</strong>
        </span>
        <button
          type="button"
          onClick={handleEndSupport}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 font-medium text-sm border border-white/40"
        >
          <LogOut className="w-4 h-4" />
          Finalizar Sesión de Soporte
        </button>
      </div>
    </div>
  )
}
