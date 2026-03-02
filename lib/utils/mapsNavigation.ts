/**
 * Genera URL de navegación GPS según el dispositivo.
 * Android: Google Maps | iPhone: Apple Maps (o Google Maps si está instalado)
 */
export function getMapsNavigationUrl(address: string): string {
  if (!address || typeof address !== 'string') return ''
  const encoded = encodeURIComponent(address.trim())

  if (typeof navigator === 'undefined') {
    return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  if (isIOS) {
    return `https://maps.apple.com/?daddr=${encoded}`
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`
}
