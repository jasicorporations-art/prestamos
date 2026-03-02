'use client'

import Link from 'next/link'
import { Lock, Mail, MessageCircle, Shield } from 'lucide-react'
import { WHATSAPP_DEFAULT_MESSAGE, WHATSAPP_NUMBER_E164, buildWhatsAppUrl } from '@/lib/config/contacto'

// SVG Icon para WhatsApp (más reconocible)
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  )
}

export function Footer() {
  const currentYear = new Date().getFullYear()
  const whatsappUrl = buildWhatsAppUrl(WHATSAPP_NUMBER_E164, WHATSAPP_DEFAULT_MESSAGE)

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Sección Principal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-6 md:mb-8">
          {/* Información de la Empresa */}
          <div className="col-span-1">
            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">JasiCorporations</h3>
            <p className="text-xs md:text-sm text-gray-600 mb-3">
              Plataforma de gestión administrativa.
            </p>
            
            {/* Badge SSL */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Lock className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              <span>Conexión Segura 256-bit SSL</span>
            </div>
          </div>

          {/* Enlaces Legales */}
          <div className="col-span-1">
            <h4 className="text-xs md:text-sm font-semibold text-gray-900 mb-2 md:mb-3">Legal</h4>
            <div className="space-y-1.5 md:space-y-2">
              <Link 
                href="/terminos-de-servicio" 
                className="block text-xs md:text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                Términos de Servicio
              </Link>
              <Link 
                href="/politica-de-privacidad" 
                className="block text-xs md:text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                Política de Privacidad
              </Link>
              <Link 
                href="/academia" 
                className="block text-xs md:text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                Centro de Ayuda
              </Link>
            </div>
          </div>

          {/* Soporte */}
          <div className="col-span-1">
            <h4 className="text-xs md:text-sm font-semibold text-gray-900 mb-2 md:mb-3">Soporte</h4>
            <div className="space-y-2 md:space-y-3">
              {/* Botón WhatsApp */}
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Contactar por WhatsApp"
                  className="flex items-center gap-2 text-xs md:text-sm text-gray-600 hover:text-green-600 transition-colors group"
                >
                  <WhatsAppIcon className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <span>Soporte Técnico</span>
                </a>
              ) : (
                <p className="text-xs text-gray-500">WhatsApp pendiente de configuración</p>
              )}
              
              {/* Correos */}
              <a
                href="mailto:info@jasicorporations.com"
                className="flex items-center gap-2 text-xs md:text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">info@jasicorporations.com</span>
              </a>
              <a
                href="mailto:soporte@jasicorporations.com"
                className="flex items-center gap-2 text-xs md:text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">soporte@jasicorporations.com</span>
              </a>
            </div>
          </div>

          {/* Tecnologías */}
          <div className="col-span-1">
            <h4 className="text-xs md:text-sm font-semibold text-gray-900 mb-2 md:mb-3">Tecnología</h4>
            <div className="space-y-1.5 md:space-y-2 text-xs text-gray-500 opacity-75">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 flex-shrink-0" />
                <span>Powered by Supabase</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 flex-shrink-0" />
                <span>Next.js Security</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider y Footer Inferior */}
        <div className="border-t border-gray-200 pt-4 md:pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4">
            {/* Micro-copy Legal */}
            <p className="text-xs text-gray-500 text-center md:text-left leading-relaxed max-w-2xl">
              JasiCorporations es una plataforma de gestión administrativa. Todos los derechos reservados {currentYear}.
            </p>

            {/* Badges de Seguridad y Tecnología (versión compacta para móvil) */}
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 text-xs text-gray-400">
              {/* SSL Badge compacto */}
              <div className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-green-600 flex-shrink-0" />
                <span className="hidden sm:inline">256-bit SSL</span>
                <span className="sm:hidden">SSL</span>
              </div>
              
              {/* Tecnologías en formato compacto */}
              <div className="flex items-center gap-2 md:gap-3 opacity-60">
                <span className="hidden md:inline">Supabase</span>
                <span className="hidden md:inline text-gray-300">•</span>
                <span>Next.js</span>
                <span className="text-gray-300">•</span>
                <span className="text-green-600 font-medium" title="Si ves esto, los cambios se desplegaron correctamente">v2025.02.05</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
