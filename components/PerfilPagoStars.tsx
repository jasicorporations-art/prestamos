'use client'

import { Star, AlertTriangle } from 'lucide-react'
import type { PerfilPagoResult } from '@/lib/services/perfilPago'

interface PerfilPagoStarsProps {
  perfil: PerfilPagoResult | null
  loading?: boolean
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function PerfilPagoStars({ perfil, loading }: PerfilPagoStarsProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
        <p className="text-sm text-amber-700">Cargando perfil de pago...</p>
      </div>
    )
  }

  if (!perfil) {
    return null
  }

  const { estrellas, vecesPagadoConMora, totalPagadoEnRecargos, esAltoRiesgo } = perfil
  const estrellasEnteras = Math.floor(estrellas)
  const mediaEstrella = estrellas % 1 >= 0.5

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <h3 className="text-sm font-semibold text-amber-900 mb-3">Perfil de Pago</h3>

      {/* Estrellas */}
      <div className="flex items-center gap-0.5 mb-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="text-amber-500" title={`${estrellas} de 5 estrellas`}>
            {i <= estrellasEnteras ? (
              <Star className="w-6 h-6 fill-amber-400 stroke-amber-500" />
            ) : i === estrellasEnteras + 1 && mediaEstrella ? (
              <Star className="w-6 h-6 fill-amber-400/60 stroke-amber-500" />
            ) : (
              <Star className="w-6 h-6 fill-none stroke-amber-300" />
            )}
          </span>
        ))}
      </div>

      {/* Resumen */}
      <div className="space-y-1 text-sm text-gray-700">
        <p>
          <span className="text-gray-600">Veces pagado con mora:</span>{' '}
          <span className="font-medium">{vecesPagadoConMora}</span>
        </p>
        <p>
          <span className="text-gray-600">Total pagado en recargos:</span>{' '}
          <span className="font-medium">{formatCurrency(totalPagadoEnRecargos)}</span>
        </p>
      </div>

      {/* Advertencia alto riesgo */}
      {esAltoRiesgo && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-red-100 border border-red-200 px-3 py-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-800">Cliente de alto riesgo</p>
        </div>
      )}
    </div>
  )
}
