'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { perfilesService } from '@/lib/services/perfiles'

/**
 * Solo Admin y super_admin pueden acceder a /admin/*.
 * Los Vendedores son redirigidos a /dashboard.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const rol = await perfilesService.getRolActual()
        const esAdmin = rol === 'Admin'
        const esSuperAdmin = rol === 'super_admin'
        if (!cancelled) {
          setAllowed(esAdmin || esSuperAdmin)
        }
      } catch {
        if (!cancelled) setAllowed(false)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (checking) return
    if (!allowed) {
      router.replace('/dashboard')
    }
  }, [checking, allowed, router])

  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  if (!allowed) {
    return null
  }

  return <>{children}</>
}
