'use client'

import Link from 'next/link'
import type { PlanType } from '@/lib/config/planes'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard,
  Car,
  Users,
  ShoppingCart,
  DollarSign,
  LogOut,
  BarChart3,
  Bell,
  Activity,
  MapPin,
  Route,
  UserCog,
  Wallet,
  Key,
  AlertTriangle,
  HelpCircle,
  Database,
  Shield,
  Archive,
  Tag,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  MessageCircle,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react'

const SIDEBAR_WIDTH_EXPANDED = 260
const SIDEBAR_WIDTH_COLLAPSED = 80

/** Colores por categoría: border-left + glow (Operaciones, Finanzas, Control/Alertas, Sistema) */
const CATEGORY_COLORS = {
  operaciones: { hex: '#10B981', rgb: '16, 185, 129', class: 'text-emerald-400' },
  finanzas: { hex: '#3B82F6', rgb: '59, 130, 246', class: 'text-blue-400' },
  control: { hex: '#F59E0B', rgb: '245, 158, 11', class: 'text-amber-400' },
  sistema: { hex: '#8B5CF6', rgb: '139, 92, 246', class: 'text-violet-400' },
  superadmin: { hex: '#F59E0B', rgb: '245, 158, 11', class: 'text-amber-400' },
  admin: { hex: '#EF4444', rgb: '239, 68, 68', class: 'text-red-400' },
} as const

type CategoryKey = keyof typeof CATEGORY_COLORS

type NavItemConfig = {
  href: string
  label: string
  icon: LucideIcon
  category: CategoryKey
  show: boolean
  badge?: number
}

const NAV_GROUPS: { key: CategoryKey; title: string; order: number }[] = [
  { key: 'operaciones', title: 'Operaciones', order: 0 },
  { key: 'sistema', title: 'Sistema / Configuración', order: 1 },
  { key: 'admin', title: 'Administración', order: 1.5 },
  { key: 'finanzas', title: 'Finanzas', order: 2 },
  { key: 'control', title: 'Control / Alertas', order: 3 },
  { key: 'superadmin', title: 'Centro de Comando', order: 4 },
]

export type SidebarProps = {
  collapsed: boolean
  onToggleCollapse: () => void
  userEmail: string
  isAdmin: boolean
  isSuperAdmin: boolean
  panelAdminHasAccess: boolean
  panelAdminLoading: boolean
  onLogout: () => void
  /** Altura de la barra superior para posicionar el sidebar debajo */
  topBarHeight?: number
  /** En móvil: menú abierto (drawer visible) */
  isMobileOpen?: boolean
  /** En móvil: cerrar el drawer (overlay o X) */
  onMobileClose?: () => void
  /** true cuando viewport < 768px */
  isMobile?: boolean
  /** Badge numérico para Panel Admin (ej: solicitudes pendientes) */
  panelAdminBadge?: number
  /** Plan del usuario (para ocultar Tesorería/Migrar Cartera en Plan Bronce) */
  planType?: PlanType | null
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  userEmail,
  isAdmin,
  isSuperAdmin,
  panelAdminHasAccess,
  panelAdminLoading,
  onLogout,
  topBarHeight = 56,
  isMobileOpen = false,
  onMobileClose,
  isMobile = false,
  panelAdminBadge = 0,
  planType = null,
}: SidebarProps) {
  const pathname = usePathname()
  const showLabels = isMobile ? true : !collapsed

  const groupHasActiveItem = useCallback(
    (items: NavItemConfig[]) =>
      items.some(
        (item) =>
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href)),
      ),
    [pathname],
  )

  /** null = usar regla por defecto (abierto si la ruta activa está en el grupo) */
  const [openOverride, setOpenOverride] = useState<Partial<Record<CategoryKey, boolean>>>({})

  const allItems: NavItemConfig[] = useMemo(
    () => [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'sistema', show: true },
    { href: '/motores', label: 'Préstamos', icon: Car, category: 'operaciones', show: true },
    { href: '/clientes', label: 'Clientes', icon: Users, category: 'operaciones', show: true },
    { href: '/ventas', label: 'Emitir Financiamiento', icon: ShoppingCart, category: 'operaciones', show: true },
    { href: '/pagos', label: 'Cobros', icon: DollarSign, category: 'operaciones', show: true },
    { href: '/ruta', label: 'Mi Ruta de Hoy', icon: Route, category: 'operaciones', show: true },
    { href: '/caja', label: 'Caja', icon: Wallet, category: 'operaciones', show: true },
    { href: '/dashboard/whatsapp-connections', label: 'Conexión WhatsApp', icon: MessageCircle, category: 'operaciones', show: true },
    { href: '/recordatorios', label: 'Recordatorios', icon: Bell, category: 'finanzas', show: true },
    { href: '/precios', label: 'Precios', icon: Tag, category: 'finanzas', show: true },
    { href: '/admin/mora', label: 'Gestión de Mora', icon: AlertTriangle, category: 'control', show: isAdmin },
    {
      href: '/admin',
      label: 'Panel Admin',
      icon: BarChart3,
      category: 'sistema',
      show: isAdmin || isSuperAdmin,
      badge: panelAdminBadge,
    },
    {
      href: '/admin/aprobaciones',
      label: 'Aprobaciones',
      icon: CheckCircle,
      category: 'sistema',
      show: isAdmin,
    },
    {
      href: '/admin/rutas',
      label: 'Rutas',
      icon: Route,
      category: 'sistema',
      show: isAdmin,
    },
    {
      href: '/admin/mapa-cobros',
      label: 'Mapa de Cobros',
      icon: MapPin,
      category: 'sistema',
      show: isAdmin,
    },
    { href: '/admin/usuarios', label: 'Usuarios', icon: UserCog, category: 'sistema', show: isAdmin },
    { href: '/admin/sucursales', label: 'Sucursales', icon: MapPin, category: 'admin', show: isAdmin },
    { href: '/admin/historial', label: 'Historial', icon: Activity, category: 'admin', show: isAdmin },
    { href: '/admin/cajas', label: 'Cajas', icon: Wallet, category: 'admin', show: isAdmin },
    { href: '/admin/tesoreria', label: 'Tesorería', icon: DollarSign, category: 'admin', show: isAdmin && planType !== 'BRONCE' },
    { href: '/admin/migracion', label: 'Migrar Cartera', icon: Database, category: 'admin', show: isAdmin && planType !== 'BRONCE' },
    { href: '/admin/backup', label: 'Backup', icon: Archive, category: 'admin', show: isAdmin },
    { href: '/super-admin', label: 'Centro de Comando', icon: Shield, category: 'superadmin', show: isSuperAdmin },
    {
      href: '/super-admin/auditoria',
      label: 'Auditoría global',
      icon: ClipboardList,
      category: 'superadmin',
      show: isSuperAdmin,
    },
    ],
    [isAdmin, isSuperAdmin, planType, panelAdminBadge],
  )

  const itemsByGroup = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({
        ...g,
        items: allItems.filter((i) => i.category === g.key && i.show),
      })).filter((g) => g.items.length > 0),
    [allItems],
  )

  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED

  /** En la home `/dashboard` los acordeones empiezan cerrados (evita “Sistema” siempre abierto al iniciar sesión). En el resto de rutas se abre el grupo que contiene la página actual. */
  const defaultGroupOpen = (items: NavItemConfig[]) => {
    if (pathname === '/dashboard') return false
    return groupHasActiveItem(items)
  }

  const isGroupOpen = (key: CategoryKey, items: NavItemConfig[]) => {
    if (openOverride[key] !== undefined) return openOverride[key]!
    return defaultGroupOpen(items)
  }

  const toggleGroup = (key: CategoryKey, items: NavItemConfig[]) => {
    setOpenOverride((prev) => {
      const current = prev[key] !== undefined ? prev[key]! : defaultGroupOpen(items)
      return { ...prev, [key]: !current }
    })
  }

  useEffect(() => {
    if (pathname === '/dashboard') {
      setOpenOverride({})
    }
  }, [pathname])

  const renderNavLink = (item: NavItemConfig) => {
    const isActive =
      pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
    const color = CATEGORY_COLORS[item.category]
    const glowShadow = `0 0 16px rgba(${color.rgb}, 0.45)`
    const glowShadowStrong = `0 0 20px rgba(${color.rgb}, 0.6)`
    const textGlow = `0 0 12px ${color.hex}, 0 0 4px ${color.hex}`
    const iconGlow = `drop-shadow(0 0 6px ${color.hex})`
    const colorClass = color.class.replace(/^text-/, '!text-')
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          title={!showLabels ? item.label : undefined}
          onClick={isMobile ? onMobileClose : undefined}
          className={`
                        flex items-center gap-3 pl-2 pr-3 py-2.5 rounded-r-lg text-sm font-medium
                        transition-all duration-200 border-l-[3px]
                        ${isActive ? 'bg-slate-700/60' : 'hover:bg-slate-700/40'}
                        ${colorClass}
                      `}
          style={{
            borderLeftColor: color.hex,
            boxShadow: isActive ? glowShadowStrong : undefined,
          }}
          onMouseEnter={(e) => {
            if (isMobile) return
            e.currentTarget.style.boxShadow = isActive ? glowShadowStrong : glowShadow
            const icon = e.currentTarget.querySelector('[data-sidebar-icon]')
            const text = e.currentTarget.querySelector('[data-sidebar-text]')
            if (icon) (icon as HTMLElement).style.filter = iconGlow
            if (text) (text as HTMLElement).style.textShadow = textGlow
          }}
          onMouseLeave={(e) => {
            if (isMobile) return
            if (!isActive) e.currentTarget.style.boxShadow = ''
            const icon = e.currentTarget.querySelector('[data-sidebar-icon]')
            const text = e.currentTarget.querySelector('[data-sidebar-text]')
            if (icon) (icon as HTMLElement).style.filter = isActive ? iconGlow : ''
            if (text) (text as HTMLElement).style.textShadow = isActive ? textGlow : ''
          }}
        >
          <item.icon
            data-sidebar-icon
            className={`w-5 h-5 flex-shrink-0 transition-[filter] duration-200 ${colorClass}`}
            style={isActive ? { filter: iconGlow, color: color.hex } : { color: color.hex }}
          />
          {showLabels && (
            <span
              data-sidebar-text
              className={`truncate transition-[text-shadow] duration-200 flex-1 ${colorClass}`}
              style={
                isActive ? { textShadow: textGlow, color: color.hex } : { color: color.hex }
              }
            >
              {item.label}
            </span>
          )}
          {showLabels && (item.badge ?? 0) > 0 && (
            <span
              className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-amber-500 !text-white text-xs font-bold"
              aria-label={`${item.badge} pendientes`}
            >
              {item.badge! > 99 ? '99+' : item.badge}
            </span>
          )}
        </Link>
      </li>
    )
  }

  /** Contenido del menú (nav + pie) para reutilizar en desktop y móvil */
  const sidebarContent = (
    <>
      {/* Navegación por grupos (acordeón con cabeceras cuando hay etiquetas) */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 min-h-0">
        {itemsByGroup.map((group) => {
          const open = isGroupOpen(group.key, group.items)
          const headerColor = CATEGORY_COLORS[group.key].class.replace(/^text-/, '!text-')
          return (
            <div key={group.key} className="mb-2 last:mb-0">
              {showLabels ? (
                <>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key, group.items)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 rounded-lg text-left hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-700/50"
                    aria-expanded={open}
                  >
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wider ${headerColor}`}
                      style={{ color: CATEGORY_COLORS[group.key].hex }}
                    >
                      {group.title}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 flex-shrink-0 opacity-90 transition-transform duration-200 ${headerColor} ${
                        open ? 'rotate-180' : ''
                      }`}
                      style={{ color: CATEGORY_COLORS[group.key].hex }}
                      aria-hidden
                    />
                  </button>
                  {open && <ul className="space-y-0.5 mt-0.5">{group.items.map(renderNavLink)}</ul>}
                </>
              ) : (
                <ul className="space-y-0.5">{group.items.map(renderNavLink)}</ul>
              )}
            </div>
          )
        })}
      </nav>

      {/* Parte inferior fija: usuario, Ayuda, Contraseña, Salir */}
      <div className="flex-shrink-0 border-t border-slate-700/50 py-3 px-2 space-y-0.5 bg-slate-900/50">
        {showLabels && (
          <p
            className="px-3 py-1.5 text-xs text-slate-500 truncate"
            title={userEmail}
          >
            {userEmail}
          </p>
        )}
        <Link
          href="/academia"
          className="sidebar-bottom-link flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-700/40 transition-all"
          title="Ayuda"
          onClick={isMobile ? onMobileClose : undefined}
        >
          <HelpCircle className="w-5 h-5 flex-shrink-0" />
          {showLabels && <span className="text-sm !text-inherit">Ayuda</span>}
        </Link>
        <Link
          href="/cambiar-contrasena"
          className="sidebar-bottom-link flex items-center gap-3 px-3 py-2 rounded-lg !text-slate-300 hover:!text-sky-400 hover:bg-slate-700/40 transition-all"
          title="Cambiar contraseña"
          onClick={isMobile ? onMobileClose : undefined}
        >
          <Key className="w-5 h-5 flex-shrink-0" />
          {showLabels && <span className="text-sm !text-inherit">Contraseña</span>}
        </Link>
        <button
          type="button"
          onClick={() => {
            if (isMobile) onMobileClose?.()
            onLogout()
          }}
          className="sidebar-bottom-link w-full flex items-center gap-3 px-3 py-2 rounded-lg !text-slate-300 hover:!text-red-400 hover:bg-slate-700/40 transition-all text-left"
          title="Salir"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {showLabels && <span className="text-sm !text-inherit">Salir</span>}
        </button>
      </div>
    </>
  )

  // --- Móvil: overlay + drawer con transición y botón X ---
  if (isMobile) {
    return (
      <>
        {/* Overlay: fondo oscuro semi-transparente, clic cierra */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Cerrar menú"
          onClick={onMobileClose}
          onKeyDown={(e) => e.key === 'Escape' && onMobileClose?.()}
          className="fixed inset-0 z-[70] no-print transition-opacity duration-300 md:hidden"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: isMobileOpen ? 1 : 0,
            pointerEvents: isMobileOpen ? 'auto' : 'none',
          }}
        />
        {/* Drawer: sidebar que entra por la izquierda */}
        <aside
          className="fixed top-0 bottom-0 left-0 z-[80] no-print flex flex-col bg-[#0f172a] border-r border-slate-700/50 w-[min(280px,85vw)] shadow-xl transition-transform duration-300 ease-out md:hidden"
          style={{
            top: 0,
            transform: isMobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          }}
        >
          {/* Cabecera móvil: logo + botón X */}
          <div className="flex items-center justify-between h-14 px-3 border-b border-slate-700/50 flex-shrink-0">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 min-w-0"
              title="JASICORPORATIONS"
              onClick={onMobileClose}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-sky-500/20 text-sky-400 ring-1 ring-sky-400/30"
                style={{ boxShadow: '0 0 20px rgba(14, 165, 233, 0.25)' }}
              >
                <span className="text-sm font-bold">J</span>
              </div>
              <span className="text-sm font-semibold text-slate-200 truncate">JASI</span>
            </Link>
            <button
              type="button"
              onClick={onMobileClose}
              className="p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          {sidebarContent}
        </aside>
      </>
    )
  }

  // --- Desktop: sidebar fijo colapsable ---
  return (
    <aside
      className="fixed bottom-0 left-0 z-30 no-print hidden md:flex flex-col bg-[#0f172a] border-r border-slate-700/50 transition-[width] duration-200 overflow-hidden"
      style={{
        top: topBarHeight,
        width,
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
      }}
    >
      {/* Logo pequeño arriba */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-slate-700/50 flex-shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 min-w-0"
          title="JASICORPORATIONS"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-sky-500/20 text-sky-400 ring-1 ring-sky-400/30"
            style={{ boxShadow: '0 0 20px rgba(14, 165, 233, 0.25)' }}
          >
            <span className="text-sm font-bold">J</span>
          </div>
          {showLabels && (
            <span className="text-sm font-semibold text-slate-200 truncate">JASI</span>
          )}
        </Link>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex-shrink-0 p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>
      {sidebarContent}
    </aside>
  )
}

export const SIDEBAR_WIDTH_EXPANDED_PX = SIDEBAR_WIDTH_EXPANDED
export const SIDEBAR_WIDTH_COLLAPSED_PX = SIDEBAR_WIDTH_COLLAPSED
