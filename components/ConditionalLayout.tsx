'use client'

import { usePathname } from 'next/navigation'
import { AppShell } from './AppShell'
import { OfflineSyncManager } from './OfflineSyncManager'
import { Footer } from './Footer'
import { SupportBar } from './SupportBar'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLanding = pathname === '/landing' || pathname === '/'
  const isPublicAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/recuperar-contrasena' || pathname === '/actualizar-contrasena'
  const isPortalClientePage = pathname.startsWith('/portal-cliente')
  const isSuperAdminPage = pathname === '/super-admin'
  const useAppShell = !isLanding && !isPublicAuthPage && !isSuperAdminPage && !isPortalClientePage

  if (useAppShell) {
    return (
      <>
        <AppShell>
          <SupportBar />
          <div className="relative flex-1 w-full overflow-x-hidden overflow-y-auto">
            {children}
          </div>
          <Footer />
        </AppShell>
        <OfflineSyncManager />
      </>
    )
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      <div className="flex min-w-0 min-h-0 flex-1 flex-col w-full overflow-x-hidden overflow-y-auto">
        <SupportBar />
        <main className={`flex-1 min-w-0 overflow-x-hidden overflow-y-auto ${isLanding || isPublicAuthPage ? '' : 'p-4'}`}>
          {children}
        </main>
        {!isLanding && !isPublicAuthPage && <OfflineSyncManager />}
      </div>
    </div>
  )
}

