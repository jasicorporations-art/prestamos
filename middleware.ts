import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // ============================================
  // 1. FORZAR HTTPS (Seguridad de conexión)
  // ============================================
  if (process.env.NODE_ENV === 'production') {
    const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol
    const host = request.headers.get('host') || request.nextUrl.host

    // Si la solicitud viene por HTTP, redirigir a HTTPS
    if (protocol === 'http:' || request.url.startsWith('http://')) {
      const httpsUrl = request.url.replace('http://', 'https://')
      return NextResponse.redirect(httpsUrl, 301) // 301 = Permanent Redirect
    }
  }

  // ============================================
  // 2. VALIDACIÓN DE APP_ID POR COOKIE
  // ============================================
  const appId = process.env.NEXT_PUBLIC_APP_ID?.toUpperCase()
  const cookieAppId = request.cookies.get('jasi_app_id')?.value?.toUpperCase()
  const path = request.nextUrl.pathname

  if (appId && cookieAppId && cookieAppId !== appId && !path.startsWith('/login')) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'Acceso no autorizado para esta plataforma')
    const redirect = NextResponse.redirect(loginUrl)
    redirect.cookies.set('jasi_app_id', '', { path: '/', maxAge: 0 })
    return redirect
  }

  // ============================================
  // 3. RESPUESTA BASE (sin Supabase en Edge)
  // ============================================
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // ============================================
  // 4. HEADERS DE SEGURIDAD ADICIONALES
  // ============================================
  if (process.env.NODE_ENV === 'production') {
    // Headers de seguridad para proteger contra ataques comunes
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'geolocation=(self), microphone=(), camera=(self)')
    // CSP: lista blanca de URLs para mapas (tiles) - evita errores de carga
    // OpenStreetMap: *.tile.openstreetmap.org | Carto: *.basemaps.cartocdn.com | Wikimedia: maps.wikimedia.org
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://client.crisp.chat https://unpkg.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://client.crisp.chat https://unpkg.com; img-src 'self' data: blob: https: https://storage.crisp.chat https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://maps.wikimedia.org; font-src 'self' data: https://client.crisp.chat; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://client.crisp.chat wss://client.crisp.chat wss://client.relay.crisp.chat wss://client.relay.rescue.crisp.chat wss://stream.relay.crisp.chat https://storage.crisp.chat https://unpkg.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://maps.wikimedia.org; frame-src https://client.crisp.chat;"
    )
  } else {
    // En desarrollo, solo headers básicos
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
  }

  return response
}

// Configurar qué rutas deben pasar por el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest - debe ser público, sin middleware)
     * - screenshots/ (capturas PWA - acceso directo sin middleware)
     * - .well-known/ (Digital Asset Links para TWA Android)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|screenshots/|splash/|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
