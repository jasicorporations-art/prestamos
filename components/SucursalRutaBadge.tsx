'use client'

import { getSucursalPalette, getVentaSucursalRutaLabel, ventaSucursalId } from '@/lib/utils/sucursalRutaUi'
import type { Venta } from '@/types'

type Props = {
  venta: Venta
  className?: string
}

/** Etiqueta pequeña: sucursal + ruta, color por sucursal. */
export function SucursalRutaBadge({ venta, className = '' }: Props) {
  const sid = ventaSucursalId(venta)
  const p = getSucursalPalette(sid)
  const label = getVentaSucursalRutaLabel(venta)
  return (
    <span
      className={`
        inline-flex max-w-full items-center rounded-full border px-2 py-0.5
        text-[10px] sm:text-xs font-medium leading-tight
        ${p.bg} ${p.text} ${p.border}
        ${className}
      `}
      title={label}
    >
      <span className="truncate">{label}</span>
    </span>
  )
}
