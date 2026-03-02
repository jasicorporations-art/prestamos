'use client'

import { useRouter } from 'next/navigation'
import { useFeatureAccess, type Feature } from '@/lib/hooks/useFeatureAccess'
import { Button, type ButtonProps } from './Button'
import { Lock, AlertCircle } from 'lucide-react'
import { useState } from 'react'

interface FeatureButtonProps extends Omit<ButtonProps, 'disabled' | 'onClick'> {
  feature: Feature
  onClick?: () => void
  showUpgradeMessage?: boolean
  upgradeMessage?: string
}

/**
 * Botón que se deshabilita automáticamente si el usuario no tiene acceso a la característica
 * según su plan de suscripción
 */
export function FeatureButton({
  feature,
  onClick,
  showUpgradeMessage = true,
  upgradeMessage,
  children,
  className = '',
  ...props
}: FeatureButtonProps) {
  const router = useRouter()
  const { hasAccess, message, loading, requiredPlan } = useFeatureAccess(feature)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleClick = () => {
    if (!hasAccess && showUpgradeMessage) {
      // Mostrar mensaje y redirigir a precios
      alert(message)
      router.push('/precios')
      return
    }

    if (hasAccess && onClick) {
      onClick()
    }
  }

  if (loading) {
    return (
      <Button {...props} disabled className={className}>
        {children}
      </Button>
    )
  }

  return (
    <div className="relative inline-block">
      <Button
        {...props}
        disabled={!hasAccess}
        onClick={handleClick}
        className={`${className} ${!hasAccess ? 'opacity-60 cursor-not-allowed' : ''}`}
        onMouseEnter={() => !hasAccess && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={!hasAccess ? message : undefined}
      >
        {!hasAccess && <Lock className="w-4 h-4 mr-2" />}
        {children}
      </Button>

      {/* Tooltip para mostrar mensaje de actualización */}
      {showTooltip && !hasAccess && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md shadow-lg whitespace-nowrap">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{upgradeMessage || message}</span>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  )
}

