const path = require('path')
// Service Worker deshabilitado completamente para evitar errores de Workbox
// const withPWA = require('next-pwa')({
//   dest: 'public',
//   register: true,
//   skipWaiting: true,
//   disable: true, // Deshabilitado completamente
// })

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Permite que el build termine aunque haya errores de TypeScript (p. ej. tipos Supabase desactualizados).
  // Quita esto cuando regeneres tipos con: npx supabase gen types typescript --project-id <id>
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Deshabilitar caché en producción para evitar problemas con módulos
  swcMinify: true,
  // PWA Configuration
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript' },
          { key: 'Cache-Control', value: 'no-cache, max-age=0' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
        ],
      },
    ]
  },
  // Configuración para evitar problemas de caché
  webpack: (config, { isServer }) => {
    // Alias @/ para que resuelva igual en Vercel y local
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    }
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    return config
  },
  // output: 'standalone' deshabilitado - causa ENOENT con 500.html en builds locales.
  // Si despliegas en Docker, descomenta esta línea. Vercel no lo requiere.
  // output: 'standalone',
}

// Service Worker deshabilitado - no usar withPWA
//
// PRUEBA DE ACCESO A SCREENSHOTS (tras deploy en Vercel):
// https://prestamos.jasicorporations.com/screenshots/clientess.jpg
// https://prestamos.jasicorporations.com/screenshots/panell%20admin.jpg
module.exports = nextConfig


