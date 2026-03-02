import { Resend } from 'resend'

// Inicializar Resend con la API key
// En Vercel, las variables de entorno están disponibles en runtime
const resendApiKeyRaw = process.env.RESEND_API_KEY
const resendApiKey = resendApiKeyRaw?.trim()

// Limpiar la clave si contiene código de ejemplo (solo en desarrollo para debugging)
let cleanApiKey: string | undefined = resendApiKey
if (resendApiKey && (resendApiKey.includes('import') || resendApiKey.includes('resend'))) {
  console.error('❌ ERROR: RESEND_API_KEY contiene código de ejemplo. Debe contener solo la clave (re_...).')
  cleanApiKey = undefined
}

// Solo mostrar advertencia en runtime, no en build time
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Verificar solo en el servidor y no durante el build
  if (!cleanApiKey && process.env.NEXT_PHASE !== 'phase-production-build') {
    console.warn('⚠️ RESEND_API_KEY no está configurada. Los correos no se podrán enviar.')
    console.warn('💡 Asegúrate de configurar RESEND_API_KEY en las variables de entorno de Vercel.')
    console.warn('💡 La clave debe ser solo el valor (ej: re_...), NO código de ejemplo.')
  }
}

export const resend = cleanApiKey ? new Resend(cleanApiKey) : null

// Email del remitente (debe estar verificado en Resend)
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'JASICORPORATIONS <noreply@jasicorporations.com>'



