'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'

/** Tipo mínimo que necesita el mapa: coords, monto y venta con cliente/ruta */
export interface PagoParaMapa {
  id: string
  latitud_cobro?: number | null
  longitud_cobro?: number | null
  monto?: number
  venta?: {
    ruta_id?: string
    cliente?: { nombre_completo?: string }
  } | Array<{ ruta_id?: string; cliente?: { nombre_completo?: string } }>
}

function getClienteNombre(p: PagoParaMapa): string {
  const v = Array.isArray(p.venta) ? p.venta[0] : p.venta
  const c = v?.cliente
  const nombre = Array.isArray(c) ? c[0]?.nombre_completo : (c as { nombre_completo?: string })?.nombre_completo
  return nombre || 'Cliente'
}

const CENTRO = { lat: 18.4861, lng: -69.9312 }

interface MapaCobrosProps {
  pagos: PagoParaMapa[]
  rutaId?: string
  onError?: (msg: string | null) => void
}

export function MapaCobros({ pagos, rutaId, onError }: MapaCobrosProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<{ map: any; markers: any[] } | null>(null)
  const [ready, setReady] = useState(false)

  const pagosFiltrados = rutaId
    ? pagos.filter((p) => {
        const v = Array.isArray(p.venta) ? p.venta[0] : p.venta
        return (v as { ruta_id?: string })?.ruta_id === rutaId
      })
    : pagos

  useEffect(() => {
    if (typeof window === 'undefined') return

    let mounted = true

    const init = async () => {
      try {
        await import('leaflet')
        if (!mounted) return
        setReady(true)
      } catch (err) {
        console.error('Error cargando Leaflet:', err)
        onError?.('No se pudo cargar el mapa. Intenta recargar la página.')
      }
    }
    init()
    return () => { mounted = false }
  }, [onError])

  useEffect(() => {
    if (!ready || !mapRef.current) return

    const run = async () => {
      const L = (await import('leaflet')).default
      if (!mapRef.current || !L) return

      try {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.markers.forEach((m) => m.remove())
          mapInstanceRef.current.map.remove()
          mapInstanceRef.current = null
        }

        const container = mapRef.current
        const map = L.map(container).setView([CENTRO.lat, CENTRO.lng], 11)
        // OpenStreetMap como principal (más estable); Carto y Wikimedia como alternativas
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          subdomains: 'abc',
        })
        const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap © CARTO',
          subdomains: 'abcd',
          maxZoom: 20,
        })
        const wikimedia = L.tileLayer('https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap © Wikimedia',
          maxZoom: 19,
        })
        osm.addTo(map)
        L.control.layers(
          { 'OpenStreetMap': osm, 'Carto': carto, 'Wikimedia': wikimedia },
          {},
          { collapsed: true }
        ).addTo(map)

        const markers: any[] = []
        const conGps = pagosFiltrados.filter((p) => p.latitud_cobro != null && p.longitud_cobro != null)
        const sinGps = pagosFiltrados.filter((p) => p.latitud_cobro == null || p.longitud_cobro == null)

        conGps.forEach((p) => {
          const lat = Number(p.latitud_cobro)
          const lng = Number(p.longitud_cobro)
          const m = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'pin-verde',
              html: `<div style="width:24px;height:24px;background:#22c55e;border-radius:50%;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3)"></div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            }),
          })
          const nombre = getClienteNombre(p)
          const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
          const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
          const info = `<div class="p-1"><strong>$${p.monto?.toLocaleString('es-DO')}</strong> - ${nombre}<br/><small>Coords: ${coords}</small><br/><a href="${mapsUrl}" target="_blank" rel="noopener" class="text-blue-600 text-sm">Ver en Google Maps</a></div>`
          m.bindPopup(info)
          m.addTo(map)
          markers.push(m)
        })

        if (sinGps.length > 0) {
          const lat = CENTRO.lat - 0.03
          const lng = CENTRO.lng - 0.05
          const m = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'pin-gris',
              html: `<div style="width:28px;height:28px;background:#9ca3af;border-radius:50%;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px">${sinGps.length}</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            }),
          })
          const lista = sinGps.map((p) => `$${p.monto?.toLocaleString('es-DO')} - ${getClienteNombre(p)}`).join('<br/>')
          m.bindPopup(`<strong>Cobros sin señal GPS (${sinGps.length})</strong><br/><br/>${lista}`)
          m.addTo(map)
          markers.push(m)
        }

        if (conGps.length > 0) {
          const first = conGps[0]
          map.setView([Number(first.latitud_cobro), Number(first.longitud_cobro)], 14)
        }

        map.invalidateSize()
        setTimeout(() => map.invalidateSize(), 100)
        setTimeout(() => map.invalidateSize(), 500)
        mapInstanceRef.current = { map, markers }
        onError?.(null)
      } catch (err: any) {
        console.error('Error inicializando mapa:', err)
        onError?.(err?.message || 'Error al cargar el mapa')
      }
    }

    run()
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.markers.forEach((m) => m.remove())
        mapInstanceRef.current.map.remove()
        mapInstanceRef.current = null
      }
    }
  }, [pagosFiltrados, ready, rutaId, onError])

  return (
    <div
      ref={mapRef}
      className="w-full h-[500px] min-h-[400px] rounded-lg border border-gray-200 overflow-hidden bg-gray-100 relative"
      style={{ minHeight: 400 }}
    >
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10 rounded-lg">
          <p className="text-gray-500">Cargando mapa...</p>
        </div>
      )}
    </div>
  )
}
