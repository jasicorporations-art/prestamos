'use client'

import { AlertTriangle } from 'lucide-react'

export interface AlertaRedData {
  prestamosActivos: number
  enMora: boolean
  vecesRecargo: number
  tieneHistorial: boolean
}

interface AlertaRedProps {
  data: AlertaRedData | null
  loading?: boolean
}

/**
 * Cuadro de alerta de red: historial del cliente en otras compañías (solo comportamiento, sin nombres).
 * Solo se muestra si hay historial previo (tieneHistorial).
 */
export function AlertaRed({ data, loading }: AlertaRedProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-800">
        <span className="inline-flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          Consultando historial en la red...
        </span>
      </div>
    )
  }

  if (!data?.tieneHistorial) return null

  return (
    <div
      className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm"
      role="alert"
    >
      <div className="flex gap-2">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-900">Alerta de red</p>
          <p className="text-amber-800">
            Préstamos activos en la red: <strong>{data.prestamosActivos}</strong>
          </p>
          <p className="text-amber-800">
            Estatus global:{' '}
            <strong className={data.enMora ? 'text-red-700' : 'text-emerald-700'}>
              {data.enMora ? 'En Mora' : 'Al día'}
            </strong>
          </p>
          <p className="text-amber-800">
            Veces que ha pagado con recargo: <strong>{data.vecesRecargo}</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
