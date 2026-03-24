import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import dynamic from 'next/dynamic'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import Script from 'next/script'
import { AuthGuard } from '@/components/AuthGuard'
import { SupabaseAuthProvider } from '@/lib/contexts/SupabaseAuthProvider'
import { CompaniaProvider } from '@/lib/contexts/CompaniaContext'
import { CurrencyProvider } from '@/lib/contexts/CurrencyContext'
import { ConditionalLayout } from '@/components/ConditionalLayout'

const FloatingSupport = dynamic(() => import('@/components/FloatingSupport').then((m) => m.default), { ssr: false })
const DebugOverlay = dynamic(() => import('@/components/DebugOverlay').then((m) => m.DebugOverlay), { ssr: false })

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'JASICORPORATIONS',
  description: '',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'JASICORPORATIONS',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0ea5e9',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const crispWebsiteId =
    process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID || 'cef36b09-e358-4ee0-987d-ed399ba5a416'

  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="JASICORPORATIONS" />
        {/* Splash screen iOS - logo JASICORPORATIONS sobre fondo #000000 */}
        <link rel="apple-touch-startup-image" href="/splash/splash-1170x2532.png" media="(device-width: 390px) and (device-height: 844px)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-1284x2778.png" media="(device-width: 393px) and (device-height: 852px)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-1290x2796.png" media="(device-width: 430px) and (device-height: 932px)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-750x1334.png" media="(device-width: 375px) and (device-height: 667px)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-1242x2688.png" media="(device-width: 414px) and (device-height: 896px)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-828x1792.png" media="(device-width: 414px) and (device-height: 896px)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-2048x2732.png" media="(device-width: 1024px) and (device-height: 1366px)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-1668x2388.png" media="(device-width: 834px) and (device-height: 1194px)" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        <link rel="manifest" href="/manifest.json" />
        {crispWebsiteId ? (
          <Script id="crisp-chat" strategy="afterInteractive">
            {`
              window.$crisp = window.$crisp || [];
              window.CRISP_WEBSITE_ID = "${crispWebsiteId}";
              (function() {
                var d = document;
                var s = d.createElement("script");
                s.src = "https://client.crisp.chat/l.js";
                s.async = 1;
                d.getElementsByTagName("head")[0].appendChild(s);
              })();
              window.$crisp.push(["do", "chat:hide"]);

              (function() {
                var inactivityTimeout = 1800000;
                var inactivityTimer;
                function reiniciarChatCrisp() {
                  if (!window.$crisp || !window.$crisp.push) return;
                  window.$crisp.push(["do", "session:reset"]);
                }
                function resetTimer() {
                  if (inactivityTimer) clearTimeout(inactivityTimer);
                  inactivityTimer = setTimeout(reiniciarChatCrisp, inactivityTimeout);
                }
                window.addEventListener("load", resetTimer, { passive: true });
                window.addEventListener("mousemove", resetTimer, { passive: true });
                window.addEventListener("keypress", resetTimer, { passive: true });
                window.addEventListener("touchstart", resetTimer, { passive: true });
                window.addEventListener("beforeunload", reiniciarChatCrisp);
              })();
            `}
          </Script>
        ) : null}
      </head>
      <body className={inter.className}>
        <ServiceWorkerRegistration />
        <SupabaseAuthProvider>
          <CurrencyProvider>
            <CompaniaProvider>
              <AuthGuard>
                <ConditionalLayout>
                  {children}
                </ConditionalLayout>
              </AuthGuard>
            </CompaniaProvider>
          </CurrencyProvider>
        </SupabaseAuthProvider>
        <DebugOverlay />
        <FloatingSupport />
      </body>
    </html>
  )
}

