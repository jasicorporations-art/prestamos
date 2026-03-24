import type { LineaProductoElectro } from '@/types'

export type ElectroFieldType = 'text' | 'number' | 'select'

export interface ElectroFieldOption {
  value: string
  label: string
}

export interface ElectroFieldConfig {
  key: string
  label: string
  type: ElectroFieldType
  placeholder?: string
  options?: ElectroFieldOption[]
  /** Unidad mostrada como adornamiento al final del input (ej. "BTU", "Watts") */
  unit?: string
}

export interface LineaProductoConfig {
  id: LineaProductoElectro
  label: string
  subtitle: string
  fields: ElectroFieldConfig[]
}

/**
 * Mapping de Línea de Producto → campos dinámicos del formulario Electro.
 * Usado para renderizar inputs con transiciones y unidades.
 */
export const ELECTRO_LINEAS_CONFIG: Record<LineaProductoElectro, LineaProductoConfig> = {
  linea_blanca: {
    id: 'linea_blanca',
    label: 'Línea Blanca',
    subtitle: 'Cocina y Lavandería',
    fields: [
      { key: 'capacidad', label: 'Capacidad', type: 'text', placeholder: 'Ej: 18 pies³, 12 lbs', unit: 'lbs/pies' },
      { key: 'voltaje', label: 'Voltaje', type: 'select', options: [{ value: '', label: 'Seleccione' }, { value: '110v', label: '110v' }, { value: '220v', label: '220v' }] },
      { key: 'tecnologia', label: 'Tecnología', type: 'select', options: [{ value: '', label: 'Seleccione' }, { value: 'Inverter', label: 'Inverter' }, { value: 'Convencional', label: 'Convencional' }] },
    ],
  },
  linea_marron: {
    id: 'linea_marron',
    label: 'Línea Marrón',
    subtitle: 'Entretenimiento / TV / Audio',
    fields: [
      { key: 'pulgadas', label: 'Pulgadas', type: 'text', placeholder: 'Ej: 55', unit: '"' },
      { key: 'resolucion', label: 'Resolución', type: 'select', options: [{ value: '', label: 'Seleccione' }, { value: '4K', label: '4K' }, { value: 'Full HD', label: 'Full HD' }, { value: 'HD', label: 'HD' }] },
      { key: 'puertos', label: 'Puertos', type: 'select', options: [{ value: '', label: 'Seleccione' }, { value: 'HDMI', label: 'HDMI' }, { value: 'Óptico', label: 'Óptico' }, { value: 'HDMI y Óptico', label: 'HDMI y Óptico' }] },
      { key: 'smart_tv', label: 'Smart TV', type: 'select', options: [{ value: '', label: 'Seleccione' }, { value: 'Sí', label: 'Sí' }, { value: 'No', label: 'No' }] },
    ],
  },
  linea_pequena: {
    id: 'linea_pequena',
    label: 'Línea Pequeña',
    subtitle: 'Portátiles / Cocina',
    fields: [
      { key: 'potencia', label: 'Potencia', type: 'number', placeholder: 'Ej: 1200', unit: 'Watts' },
      { key: 'color', label: 'Color', type: 'text', placeholder: 'Ej: Negro, Blanco' },
      { key: 'material', label: 'Material', type: 'text', placeholder: 'Ej: Acero inoxidable, Plástico' },
    ],
  },
  linea_climatizacion: {
    id: 'linea_climatizacion',
    label: 'Línea de Climatización',
    subtitle: 'Aire / Ambiente',
    fields: [
      { key: 'btus', label: 'BTUs', type: 'select', options: [{ value: '', label: 'Seleccione' }, { value: '9k', label: '9k' }, { value: '12k', label: '12k' }, { value: '18k', label: '18k' }, { value: '24k', label: '24k' }] },
      { key: 'eficiencia_seer', label: 'Eficiencia SEER', type: 'text', placeholder: 'Ej: 14', unit: 'SEER' },
      { key: 'tipo_gas', label: 'Tipo de Gas', type: 'text', placeholder: 'Ej: R-410A' },
    ],
  },
  muebles_hogar: {
    id: 'muebles_hogar',
    label: 'Muebles y Hogar',
    subtitle: 'Camas, comedores, muebles de sala, repisas y armarios',
    fields: [],
  },
  electronica: {
    id: 'electronica',
    label: 'Electrónica',
    subtitle: 'Celulares, tablets y laptops',
    fields: [],
  },
  otros: {
    id: 'otros',
    label: 'Otros',
    subtitle: 'Categoría libre para artículos no contemplados',
    fields: [],
  },
}

export const LINEA_PRODUCTO_OPTIONS: ElectroFieldOption[] = [
  { value: '', label: 'Seleccione línea de producto' },
  { value: 'linea_blanca', label: 'Línea Blanca (Cocina y Lavandería)' },
  { value: 'linea_marron', label: 'Línea Marrón (Entretenimiento / TV / Audio)' },
  { value: 'linea_pequena', label: 'Línea Pequeña (Portátiles / Cocina)' },
  { value: 'linea_climatizacion', label: 'Línea de Climatización (Aire / Ambiente)' },
  { value: 'muebles_hogar', label: 'Muebles y Hogar (Camas, Comedores, Sala, Repisas, Armarios)' },
  { value: 'electronica', label: 'Electrónica (Celulares, Tablets, Laptops)' },
  { value: 'otros', label: 'Otros' },
]

export const CATEGORIA_ELECTRO_OPTIONS: ElectroFieldOption[] = [
  { value: '', label: 'Seleccione categoría' },
  { value: 'linea_blanca', label: 'Línea Blanca' },
  { value: 'linea_climatizacion', label: 'Climatización' },
  { value: 'muebles_hogar', label: 'Muebles y Hogar' },
  { value: 'electronica', label: 'Electrónica' },
  { value: 'otros', label: 'Otros' },
]

export const PRODUCTOS_POR_CATEGORIA: Record<string, ElectroFieldOption[]> = {
  muebles_hogar: [
    { value: '', label: 'Seleccione (opcional)' },
    { value: 'Cama', label: 'Cama' },
    { value: 'Comedor', label: 'Comedor' },
    { value: 'Mueble de sala', label: 'Mueble de sala' },
    { value: 'Repisas', label: 'Repisas' },
    { value: 'Armario', label: 'Armario' },
  ],
  electronica: [
    { value: '', label: 'Seleccione (opcional)' },
    { value: 'Celular', label: 'Celular' },
    { value: 'Tablet', label: 'Tablet' },
    { value: 'Laptop', label: 'Laptop' },
  ],
  linea_blanca: [
    { value: '', label: 'Seleccione (opcional)' },
    { value: 'Nevera', label: 'Nevera' },
    { value: 'Lavadora', label: 'Lavadora' },
    { value: 'Estufa', label: 'Estufa' },
    { value: 'Secadora', label: 'Secadora' },
  ],
  linea_climatizacion: [
    { value: '', label: 'Seleccione (opcional)' },
    { value: 'Aire Acondicionado', label: 'Aire Acondicionado' },
    { value: 'Abanico', label: 'Abanico' },
  ],
}

export const CONDICION_OPTIONS: ElectroFieldOption[] = [
  { value: '', label: 'Seleccione condición' },
  { value: 'Nuevo', label: 'Nuevo' },
  { value: 'Usado', label: 'Usado' },
]
