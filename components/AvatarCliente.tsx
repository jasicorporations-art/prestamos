'use client'

import { useEffect, useMemo, useState } from 'react'
import { resolveAvatarUrl } from '@/lib/utils/avatarUrl'

interface AvatarClienteProps {
  nombreCompleto?: string | null
  fotoUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function AvatarCliente({
  nombreCompleto,
  fotoUrl,
  size = 'md',
  className = '',
}: AvatarClienteProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const displayUrl = useMemo(() => {
    const resolved = resolveAvatarUrl(fotoUrl)
    return resolved ?? ''
  }, [fotoUrl])

  useEffect(() => {
    setImageError(false)
    setImageLoaded(false)
  }, [displayUrl])

  const initials = useMemo(() => {
    const nombre = (nombreCompleto || '').trim()
    if (!nombre) return '?'

    const partes = nombre.split(/\s+/).filter(Boolean)
    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase()
    }

    return `${partes[0][0] || ''}${partes[1][0] || ''}`.toUpperCase()
  }, [nombreCompleto])

  const sizeClass =
    size === 'xl' ? 'w-28 h-28 text-2xl' :
    size === 'lg' ? 'w-20 h-20 text-xl' :
    size === 'sm' ? 'w-10 h-10 text-sm' :
    'w-14 h-14 text-base'

  const shouldShowImage = !!displayUrl && !imageError

  return (
    <div
      className={`${sizeClass} min-w-[7rem] min-h-[7rem] rounded-full overflow-hidden bg-gray-200 flex items-center justify-center shrink-0 ${className}`}
    >
      {shouldShowImage ? (
        <img
          key={displayUrl}
          src={displayUrl}
          alt={nombreCompleto || 'Cliente'}
          className="w-full h-full object-cover"
          onLoad={() => {
            setImageLoaded(true)
            setImageError(false)
          }}
          onError={() => {
            console.warn('[AvatarCliente] Error cargando imagen:', displayUrl)
            setImageError(true)
            setImageLoaded(false)
          }}
        />
      ) : (
        <span className="font-semibold text-gray-700 select-none">
          {initials}
        </span>
      )}
    </div>
  )
}
