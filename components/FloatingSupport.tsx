'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { Headphones, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { buildWhatsAppUrl, WHATSAPP_NUMBER_E164 } from '@/lib/config/contacto'

function formatPageName(pathname: string) {
  if (!pathname || pathname === '/') {
    return 'Inicio'
  }
  const parts = pathname.split('/').filter(Boolean)
  const last = parts[parts.length - 1] || 'Inicio'
  return last
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function buildWhatsappUrl(message: string) {
  return buildWhatsAppUrl(WHATSAPP_NUMBER_E164, message) ?? '#'
}

export default function FloatingSupport() {
  const pathname = usePathname()
  const pageName = formatPageName(pathname)

  const whatsappMensaje = `Hola! Estoy en la página ${pageName} y necesito ayuda.`

  const handleSupportClick = async () => {
    if (typeof window === 'undefined') return

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const nombre = user.user_metadata?.nombre || ''
        const apellido = user.user_metadata?.apellido || ''
        const nombreCompleto =
          user.user_metadata?.full_name || `${nombre} ${apellido}`.trim() || user.email

        if (user.email) {
          window.$crisp?.push(['set', 'user:email', [user.email]])
        }
        if (nombreCompleto) {
          window.$crisp?.push(['set', 'user:nickname', [nombreCompleto]])
        }
      }
    } catch (error) {
      // No bloquear apertura del chat si falla la identificación
    }

    window.$crisp?.push(['set', 'session:data', [['pwa_name', 'JasiCorporations_App']]])
    window.$crisp?.push(['do', 'chat:show'])
    window.$crisp?.push(['do', 'chat:open'])
  }

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const buttons = (
    <div
      dir="ltr"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-3"
    >
      <button
        type="button"
        onClick={handleSupportClick}
        aria-label="Soporte técnico"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fb7185] text-white shadow-xl"
      >
        <Headphones className="h-7 w-7" />
      </button>
      <a
        href={buildWhatsappUrl(whatsappMensaje)}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl"
      >
        <MessageCircle className="h-7 w-7" />
      </a>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(buttons, document.body)
}
