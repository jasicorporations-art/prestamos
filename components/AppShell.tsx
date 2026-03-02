'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  LogOut,
  Key,
  HelpCircle,
  Headphones,
  MessageCircle,
  ChevronDown,
  Search,
  User,
  Bell,
  Menu,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { authService } from '@/lib/services/auth'
import { useCompania } from '@/lib/contexts/CompaniaContext'
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess'
import { perfilesService } from '@/lib/services/perfiles'
import type { PlanType } from '@/lib/config/planes'
import { Sidebar, SIDEBAR_WIDTH_EXPANDED_PX, SIDEBAR_WIDTH_COLLAPSED_PX } from './Sidebar'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { usePendientesAprobacion } from '@/lib/hooks/usePendientesAprobacion'
import { buildWhatsAppUrl, WHATSAPP_NUMBER_E164 } from '@/lib/config/contacto'

const TOPBAR_HEIGHT = 48
const NAVBAR_BG = '#0f172a' // mismo gris oscuro que el Sidebar

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { setCompania } = useCompania()
  const [userEmail, setUserEmail] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [planType, setPlanType] = useState<PlanType | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [searchQuery, setSearchQuery] = useState('')
  const [notificationCount] = useState(0) // badge numérico; conectar a datos reales si aplica
  const profileRef = useRef<HTMLDivElement>(null)
  const panelAdminAccess = useFeatureAccess('panel_admin')
  const pendientesAprobacion = usePendientesAprobacion(!panelAdminAccess.loading && (panelAdminAccess.hasAccess || isAdmin))

  useEffect(() => {
    async function checkUserAndAdmin() {
      try {
        // 1. Forzar refresco de sesión para obtener metadata actualizada
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user

        if (user) {
          setUserEmail(user.email || 'Usuario')

          // 2. Obtener el plan directamente de la metadata para mayor rapidez
          const currentPlan = (user.user_metadata?.planType as PlanType) || 'TRIAL'
          setPlanType(currentPlan)

          try {
            const rol = await perfilesService.getRolActual()
            // Si es TRIAL, dar privilegios de Admin para que vea todo el panel
            const esAdmin = rol === 'Admin' || currentPlan === 'TRIAL'
            const esSuperAdmin = rol === 'super_admin'
            setIsAdmin(esAdmin || esSuperAdmin)
            setIsSuperAdmin(esSuperAdmin)
          } catch {
            // Fallback: si es TRIAL, dejarlo como admin
            setIsAdmin(currentPlan === 'TRIAL')
          }
        }
      } catch (error) {
        console.error('Error obteniendo usuario:', error)
      }
    }
    checkUserAndAdmin()
  }, [])

  // Persistir estado del sidebar
  useEffect(() => {
    const stored = localStorage.getItem('sidebarCollapsed')
    if (stored !== null) setSidebarCollapsed(JSON.parse(stored))
  }, [])
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  // Cerrar menú perfil al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // En móvil: bloquear scroll del body cuando el menú está abierto
  useEffect(() => {
    if (!isDesktop && mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isDesktop, mobileMenuOpen])

  // DEBUG: ver qué está pasando con el plan y acceso
  useEffect(() => {
    if (userEmail) {
      console.log('🛠 DEBUG PLAN:', {
        email: userEmail,
        plan: planType,
        isAdmin,
        panelAccess: panelAdminAccess.hasAccess,
        loading: panelAdminAccess.loading,
      })
    }
  }, [userEmail, planType, isAdmin, panelAdminAccess.hasAccess, panelAdminAccess.loading])

  async function handleLogout() {
    try {
      await authService.signOut()
      setCompania(null)
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      alert('Error al cerrar sesión')
    }
  }

  function handleOpenChat() {
    if (typeof window === 'undefined') return
    window.$crisp?.push(['do', 'chat:show'])
    window.$crisp?.push(['do', 'chat:open'])
  }

  function buildWhatsappUrl() {
    return buildWhatsAppUrl(WHATSAPP_NUMBER_E164, 'Hola, necesito ayuda con el sistema.') ?? '#'
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = searchQuery.trim()
    if (q) router.push(`/clientes?search=${encodeURIComponent(q)}`)
    setSearchQuery('')
  }

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED_PX : SIDEBAR_WIDTH_EXPANDED_PX
  const pendientes = (panelAdminAccess.hasAccess || isAdmin) ? pendientesAprobacion : 0

  return (
    <div className="flex min-h-screen">
      {/* Navbar: móvil-first, min-w-0 para que el buscador pueda encogerse */}
      <header
        data-app-shell="navbar"
        className="fixed top-0 left-0 right-0 z-[60] no-print flex items-center border-b border-slate-700/50 px-2 md:px-4"
        style={{
          height: `calc(${TOPBAR_HEIGHT}px + env(safe-area-inset-top, 0px))`,
          paddingTop: 'env(safe-area-inset-top, 0px)',
          backgroundColor: NAVBAR_BG,
          width: '100%',
          maxWidth: '100vw',
        }}
      >
        {/* Móvil: botón hamburguesa */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden flex-shrink-0 p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6" />
        </button>
        {/* Logo izquierda */}
        <Link
          href="/dashboard"
          className="flex-shrink-0 flex items-center gap-2 pl-2 md:pl-4"
          aria-label="JASICORPORATIONS"
        >
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center bg-sky-500/20 text-sky-400 ring-1 ring-sky-400/30"
            style={{ boxShadow: '0 0 14px rgba(14, 165, 233, 0.2)' }}
          >
            <span className="text-sm font-bold">J</span>
          </div>
          <span className="text-sm font-semibold text-slate-200 hidden sm:inline">
            JASICORPORATIONS
          </span>
        </Link>

        {/* Buscador global centro */}
        <form
          onSubmit={handleSearch}
          className="flex-1 flex justify-center px-2 md:px-4 max-w-md mx-auto min-w-0"
        >
          <div className="relative w-full min-w-0">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-md bg-slate-700/50 border border-slate-600/50 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500/50 focus:border-sky-500/50"
              aria-label="Búsqueda global"
            />
          </div>
        </form>

        {/* Derecha: notificaciones + perfil */}
        <div className="flex-shrink-0 flex items-center gap-1 pr-1 md:pr-3">
          <button
            type="button"
            className="relative p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
            aria-label="Notificaciones"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
                aria-label={`${notificationCount} notificaciones`}
              >
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-md hover:bg-slate-700/50 transition-colors"
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-slate-300" />
              </div>
              <span className="max-w-[160px] truncate text-sm text-slate-200 hidden md:inline">
                {userEmail}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-64 py-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-[70]"
                style={{ backgroundColor: '#1e293b' }}
              >
                <div className="px-4 py-2 border-b border-slate-600">
                  <p className="text-xs text-slate-500">Sesión</p>
                  <p className="text-sm font-medium text-slate-200 truncate">{userEmail}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/academia"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-slate-100"
                    onClick={() => setProfileOpen(false)}
                  >
                    <HelpCircle className="w-4 h-4" />
                    Ayuda
                  </Link>
                  <Link
                    href="/cambiar-contrasena"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-slate-100"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Key className="w-4 h-4" />
                    Cambiar contraseña
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenChat()
                      setProfileOpen(false)
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 text-left"
                  >
                    <Headphones className="w-4 h-4" />
                    Soporte en tiempo real
                  </button>
                  <a
                    href={buildWhatsappUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-slate-100"
                    onClick={() => setProfileOpen(false)}
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                </div>
                <div className="border-t border-slate-600 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      handleLogout()
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-slate-700/50 hover:text-red-300"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar lateral (desktop siempre visible; móvil drawer con overlay) */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        userEmail={userEmail}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        panelAdminHasAccess={panelAdminAccess.hasAccess}
        panelAdminLoading={panelAdminAccess.loading}
        panelAdminBadge={pendientes}
        onLogout={handleLogout}
        topBarHeight={TOPBAR_HEIGHT}
        isMobile={!isDesktop}
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        planType={planType}
      />

      {/* Contenido principal: en móvil sin margen; en desktop margen del sidebar */}
      <main
        className="flex-1 flex flex-col min-h-0 min-w-0 overflow-x-hidden overflow-y-auto transition-[margin-left] duration-200"
        style={{
          marginLeft: isDesktop ? sidebarWidth : 0,
          paddingTop: `calc(${TOPBAR_HEIGHT}px + env(safe-area-inset-top, 0px))`,
        }}
      >
        {children}
      </main>
    </div>
  )
}
