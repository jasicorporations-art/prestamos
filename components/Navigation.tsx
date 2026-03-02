'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Package, Users, ShoppingCart, DollarSign, LogOut, BarChart3, Bell, Activity, MapPin, UserCog, Wallet, Key, AlertTriangle, HelpCircle, Headphones, MessageCircle, Database, Shield, Archive } from 'lucide-react'
import { authService } from '@/lib/services/auth'
import { useCompania } from '@/lib/contexts/CompaniaContext'
import { Button } from './Button'
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess'
import { perfilesService } from '@/lib/services/perfiles'
import { subscriptionService } from '@/lib/services/subscription'
import type { PlanType } from '@/lib/config/planes'
import { buildWhatsAppUrl, WHATSAPP_NUMBER_E164 } from '@/lib/config/contacto'

// Los items de navegación se generan dinámicamente según el acceso del usuario

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { setCompania } = useCompania()
  const [userEmail, setUserEmail] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [planType, setPlanType] = useState<PlanType | null>(null)
  const reportesAccess = useFeatureAccess('reportes_ganancias')

  useEffect(() => {
    async function checkUserAndAdmin() {
      try {
        const user = await authService.getCurrentUser()
        if (user) {
          setUserEmail(user.email || 'Usuario')
          
          // Verificar rol del usuario
          try {
            const rol = await perfilesService.getRolActual()
            const esAdmin = rol === 'Admin'
            const esSuperAdmin = rol === 'super_admin'
            console.log('🔐 Usuario es Admin:', esAdmin, '| Super Admin:', esSuperAdmin)
            setIsAdmin(esAdmin || esSuperAdmin)
            setIsSuperAdmin(esSuperAdmin)
            
            // Si no es Admin según el perfil, pero queremos mostrar enlaces de prueba, comentar esto:
            // setIsAdmin(true) // Temporal para debugging
          } catch (error) {
            console.error('Error verificando Admin:', error)
            setIsAdmin(false)
          }
          subscriptionService.getCurrentPlan().then(setPlanType)
        }
      } catch (error) {
        console.error('Error obteniendo usuario:', error)
      }
    }
    
    checkUserAndAdmin()
  }, [])

  async function handleLogout() {
    try {
      await authService.signOut()
      setCompania(null) // Limpiar compañía al cerrar sesión
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


  // No mostrar navegación en la página de login, registro, landing, recuperar contraseña o página principal
  if (pathname === '/login' || pathname === '/register' || pathname === '/' || pathname === '/landing' || pathname === '/recuperar-contrasena' || pathname === '/actualizar-contrasena') {
    return null
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-primary-600">
              JASICORPORATIONS
            </h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto">
            <div className="flex space-x-1 flex-shrink-0">
              {/* Items siempre disponibles */}
              <Link
                href="/dashboard"
                className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  pathname === '/dashboard'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Home className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <Link
                href="/motores"
                className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  pathname === '/motores'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Package className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">Préstamos</span>
              </Link>
              <Link
                href="/clientes"
                className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  pathname === '/clientes'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">Clientes</span>
              </Link>
              <Link
                href="/ventas"
                className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  pathname === '/ventas'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">Emitir Financiamiento</span>
              </Link>
              <Link
                href="/pagos"
                className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  pathname === '/pagos'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">Cobros</span>
              </Link>
              <Link
                href="/caja"
                className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  pathname === '/caja'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">Caja</span>
              </Link>
              
              {/* Panel Admin - solo Admin y Super Admin (vendedores no ven este enlace) */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    pathname === '/admin'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Panel Admin</span>
                </Link>
              )}
              
              {isAdmin && (
                <Link
                  href="/admin/usuarios"
                  className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    pathname === '/admin/usuarios'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <UserCog className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Usuarios</span>
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin/sucursales"
                  className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    pathname === '/admin/sucursales'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Sucursales</span>
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin/historial"
                  className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    pathname === '/admin/historial'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Historial</span>
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin/mora"
                  className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    pathname === '/admin/mora'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Gestión de Mora</span>
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin/cajas"
                  className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    pathname === '/admin/cajas'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Cajas</span>
                </Link>
              )}
              {isAdmin && planType !== 'BRONCE' && (
                <Link
                  href="/admin/tesoreria"
                  className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    pathname === '/admin/tesoreria'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Tesorería</span>
                </Link>
              )}
              {isSuperAdmin && (
                <Link
                  href="/super-admin"
                  className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    pathname === '/super-admin'
                      ? 'bg-amber-100 text-amber-800'
                      : 'text-amber-700 hover:bg-amber-50 border border-amber-200'
                  }`}
                >
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Centro de Comando</span>
                </Link>
              )}
              {isAdmin && planType !== 'BRONCE' && (
                <Link
                  href="/admin/migracion"
                  className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    pathname === '/admin/migracion'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Database className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Migrar Cartera</span>
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin/backup"
                  className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    pathname === '/admin/backup'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Archive className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Backup</span>
                </Link>
              )}
              
              <Link
                href="/recordatorios"
                className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  pathname === '/recordatorios'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">Recordatorios</span>
              </Link>
              <Link
                href="/dashboard/whatsapp-connections"
                className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  pathname === '/dashboard/whatsapp-connections'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Link>
              <Link
                href="/precios"
                className={`flex items-center px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  pathname === '/precios'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">Precios</span>
              </Link>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 border-l border-gray-200 pl-2 sm:pl-4 flex-shrink-0">
              <div className="hidden lg:flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenChat}
                  className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
                  aria-label="Soporte en tiempo real"
                >
                  <Headphones className="h-3.5 w-3.5" />
                  Soporte en tiempo real
                </button>
                <a
                  href={buildWhatsappUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  aria-label="Atención personalizada por WhatsApp"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Atención personalizada
                </a>
              </div>
              <span className="text-xs sm:text-sm text-gray-600 hidden lg:inline truncate max-w-[150px]">
                {userEmail}
              </span>
              
              {/* Botón de Ayuda - Navega directamente a Academia */}
              <Link
                href="/academia"
                className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                title="Centro de Ayuda"
                aria-label="Ir al Centro de Ayuda"
              >
                <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline ml-2">Ayuda</span>
              </Link>

              <Link
                href="/cambiar-contrasena"
                className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Cambiar contraseña"
              >
                <Key className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Contraseña</span>
              </Link>
              <Button
                variant="secondary"
                onClick={handleLogout}
                className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}



