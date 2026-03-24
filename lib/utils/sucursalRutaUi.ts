import type { Venta } from '@/types'

/** Paleta cíclica por sucursal (azul, verde, naranja/ámbar, violeta, rosa, cyan). */
export const SUCURSAL_PALETTE = [
  { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200', bar: 'border-sky-500' },
  { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', bar: 'border-emerald-600' },
  { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', bar: 'border-amber-500' },
  { bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-200', bar: 'border-violet-500' },
  { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', bar: 'border-rose-500' },
  { bg: 'bg-cyan-50', text: 'text-cyan-900', border: 'border-cyan-200', bar: 'border-cyan-600' },
] as const

export function sucursalColorIndex(sucursalId: string | undefined | null): number {
  if (!sucursalId) return 0
  let h = 0
  for (let i = 0; i < sucursalId.length; i++) {
    h = (h * 31 + sucursalId.charCodeAt(i)) >>> 0
  }
  return h % SUCURSAL_PALETTE.length
}

export function getSucursalPalette(sucursalId: string | undefined | null) {
  return SUCURSAL_PALETTE[sucursalColorIndex(sucursalId)]
}

/** Texto compacto para badge: "Sucursal - Ruta". */
export function getVentaSucursalRutaLabel(venta: {
  sucursal?: { nombre?: string | null }
  ruta?: { nombre?: string | null }
  sucursal_id?: string | null
  ruta_id?: string | null
  orden_visita?: number | null
}): string {
  const sucNombre = venta.sucursal?.nombre?.trim() || null
  const rutaNombre = venta.ruta?.nombre?.trim() || null
  const rutaPart =
    rutaNombre ||
    (venta.orden_visita != null && venta.orden_visita !== undefined
      ? `#${venta.orden_visita}`
      : venta.ruta_id
        ? venta.ruta_id.slice(0, 8)
        : null)
  const s = sucNombre || 'Sin sucursal'
  const r = rutaPart || 'Sin ruta'
  return `${s} - ${r}`
}

export function ventaSucursalId(venta: { sucursal_id?: string | null; sucursal?: { id?: string } | null }) {
  return venta.sucursal_id || venta.sucursal?.id || null
}

export function cobroOperacionBannerText(venta: Venta): string {
  const suc = venta.sucursal?.nombre?.trim() || '—'
  const rutaNombre = venta.ruta?.nombre?.trim()
  const rutaNum =
    rutaNombre ||
    (venta.orden_visita != null ? String(venta.orden_visita) : venta.ruta_id ? venta.ruta_id.slice(0, 8) : '—')
  return `Operación para: Sucursal ${suc} | Ruta ${rutaNum}`
}
