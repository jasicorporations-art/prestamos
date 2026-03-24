import type { TipoNegocio, EspecificacionesDealer, EspecificacionesElectro, EspecificacionesProducto, Motor } from '@/types'

const MAX_STRING_LENGTH = 500
const MAX_GARANTIA_LENGTH = 200

function trimStr(value: unknown): string {
  if (value == null) return ''
  const s = String(value).trim()
  return s.length > MAX_STRING_LENGTH ? s.slice(0, MAX_STRING_LENGTH) : s
}

function safeNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Sanitiza el objeto especificaciones según tipo_negocio.
 * Solo permite claves conocidas; recorta strings y valida números.
 */
export function sanitizarEspecificaciones(
  raw: unknown,
  tipoNegocio: TipoNegocio
): EspecificacionesProducto | null {
  if (raw == null || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  if (tipoNegocio === 'dealer') {
    const out: EspecificacionesDealer = {}
    if (Object.prototype.hasOwnProperty.call(obj, 'marca')) out.marca = trimStr(obj.marca)
    if (Object.prototype.hasOwnProperty.call(obj, 'modelo')) out.modelo = trimStr(obj.modelo)
    if (Object.prototype.hasOwnProperty.call(obj, 'año')) {
      const v = safeNumber(obj.año)
      if (v !== undefined) out.año = v
      else out.año = trimStr(obj.año)
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'chasis')) out.chasis = trimStr(obj.chasis)
    if (Object.prototype.hasOwnProperty.call(obj, 'color')) out.color = trimStr(obj.color)
    return out
  }

  if (tipoNegocio === 'electro') {
    const out: EspecificacionesElectro = {}
    if (Object.prototype.hasOwnProperty.call(obj, 'marca')) out.marca = trimStr(obj.marca)
    if (Object.prototype.hasOwnProperty.call(obj, 'modelo')) out.modelo = trimStr(obj.modelo)
    if (Object.prototype.hasOwnProperty.call(obj, 'serial')) out.serial = trimStr(obj.serial)
    if (Object.prototype.hasOwnProperty.call(obj, 'condicion')) {
      const c = trimStr(obj.condicion)
      if (c === 'Nuevo' || c === 'Usado') out.condicion = c
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'tiempo_garantia')) {
      const g = String(obj.tiempo_garantia ?? '').trim()
      out.tiempo_garantia = g.length > MAX_GARANTIA_LENGTH ? g.slice(0, MAX_GARANTIA_LENGTH) : g
    }
    const lineaVal = trimStr(obj.linea_producto)
    if (lineaVal && ['linea_blanca', 'linea_marron', 'linea_pequena', 'linea_climatizacion', 'muebles_hogar', 'electronica', 'otros'].includes(lineaVal)) {
      out.linea_producto = lineaVal as EspecificacionesElectro['linea_producto']
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'tipo_equipo')) out.tipo_equipo = trimStr(obj.tipo_equipo)
    if (Object.prototype.hasOwnProperty.call(obj, 'producto')) out.producto = trimStr(obj.producto)
    if (Object.prototype.hasOwnProperty.call(obj, 'descripcion')) out.descripcion = trimStr(obj.descripcion)
    if (Object.prototype.hasOwnProperty.call(obj, 'referencia')) out.referencia = trimStr(obj.referencia)
    if (Object.prototype.hasOwnProperty.call(obj, 'otra_categoria')) out.otra_categoria = trimStr(obj.otra_categoria)
    if (Object.prototype.hasOwnProperty.call(obj, 'garantia')) {
      const g = String(obj.garantia ?? '').trim()
      out.garantia = g.length > MAX_GARANTIA_LENGTH ? g.slice(0, MAX_GARANTIA_LENGTH) : g
    }
    const catVal = trimStr(obj.categoria_electro)
    if (catVal && ['linea_blanca', 'linea_climatizacion', 'muebles_hogar', 'electronica', 'otros'].includes(catVal)) {
      out.categoria_electro = catVal as EspecificacionesElectro['categoria_electro']
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'capacidad')) out.capacidad = trimStr(obj.capacidad)
    if (Object.prototype.hasOwnProperty.call(obj, 'voltaje')) out.voltaje = trimStr(obj.voltaje)
    if (Object.prototype.hasOwnProperty.call(obj, 'tecnologia')) out.tecnologia = trimStr(obj.tecnologia)
    if (Object.prototype.hasOwnProperty.call(obj, 'energia')) out.energia = trimStr(obj.energia)
    if (Object.prototype.hasOwnProperty.call(obj, 'color_acabado')) out.color_acabado = trimStr(obj.color_acabado)
    if (Object.prototype.hasOwnProperty.call(obj, 'pulgadas')) out.pulgadas = trimStr(obj.pulgadas)
    if (Object.prototype.hasOwnProperty.call(obj, 'tamano_pantalla')) out.tamano_pantalla = trimStr(obj.tamano_pantalla)
    if (Object.prototype.hasOwnProperty.call(obj, 'resolucion')) out.resolucion = trimStr(obj.resolucion)
    if (Object.prototype.hasOwnProperty.call(obj, 'puertos')) out.puertos = trimStr(obj.puertos)
    if (Object.prototype.hasOwnProperty.call(obj, 'conectividad')) out.conectividad = trimStr(obj.conectividad)
    if (Object.prototype.hasOwnProperty.call(obj, 'smart_tv')) out.smart_tv = trimStr(obj.smart_tv)
    if (Object.prototype.hasOwnProperty.call(obj, 'potencia')) out.potencia = trimStr(obj.potencia)
    if (Object.prototype.hasOwnProperty.call(obj, 'color')) out.color = trimStr(obj.color)
    if (Object.prototype.hasOwnProperty.call(obj, 'material')) out.material = trimStr(obj.material)
    if (Object.prototype.hasOwnProperty.call(obj, 'btus')) out.btus = trimStr(obj.btus)
    if (Object.prototype.hasOwnProperty.call(obj, 'eficiencia_seer')) out.eficiencia_seer = trimStr(obj.eficiencia_seer)
    if (Object.prototype.hasOwnProperty.call(obj, 'tipo_gas')) out.tipo_gas = trimStr(obj.tipo_gas)
    const estadoVal = trimStr(obj.estado_equipo)
    if (estadoVal && ['Nuevo', 'Open Box', 'Usado'].includes(estadoVal)) {
      out.estado_equipo = estadoVal as EspecificacionesElectro['estado_equipo']
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'ubicacion')) out.ubicacion = trimStr(obj.ubicacion)
    if (Object.prototype.hasOwnProperty.call(obj, 'proveedor')) out.proveedor = trimStr(obj.proveedor)
    return out
  }

  return null
}

/** Etiquetas legibles para mostrar especificaciones en la UI */
export const LABELS_ESPECIFICACIONES: Record<string, string> = {
  marca: 'Marca',
  modelo: 'Modelo',
  año: 'Año',
  chasis: 'Chasis',
  color: 'Color',
  tipo_equipo: 'Producto',
  producto: 'Producto',
  descripcion: 'Descripción',
  referencia: 'Referencia',
  serial: 'Serial / Referencia',
  otra_categoria: 'Otra categoría',
  garantia: 'Garantía',
  categoria_electro: 'Categoría',
  capacidad: 'Capacidad',
  tecnologia: 'Tecnología',
  energia: 'Energía',
  color_acabado: 'Color/Acabado',
  tamano_pantalla: 'Tamaño de pantalla',
  resolucion: 'Resolución',
  conectividad: 'Conectividad',
  potencia: 'Potencia',
  estado_equipo: 'Estado del equipo',
  ubicacion: 'Ubicación',
  proveedor: 'Proveedor',
  linea_producto: 'Línea de producto',
  condicion: 'Condición',
  tiempo_garantia: 'Tiempo de garantía',
  voltaje: 'Voltaje',
  pulgadas: 'Pulgadas',
  puertos: 'Puertos',
  smart_tv: 'Smart TV',
  material: 'Material',
  btus: 'BTUs',
  eficiencia_seer: 'Eficiencia SEER',
  tipo_gas: 'Tipo de gas',
}

/** Valores legibles para algunas claves */
const VALUE_LABELS: Record<string, Record<string, string>> = {
  categoria_electro: {
    linea_blanca: 'Línea Blanca',
    linea_climatizacion: 'Climatización',
    muebles_hogar: 'Muebles y Hogar',
    electronica: 'Electrónica',
    otros: 'Otros',
  },
  linea_producto: {
    linea_blanca: 'Línea Blanca',
    linea_marron: 'Línea Marrón',
    linea_pequena: 'Línea Pequeña',
    linea_climatizacion: 'Línea de Climatización',
    muebles_hogar: 'Muebles y Hogar',
    electronica: 'Electrónica',
    otros: 'Otros',
  },
  condicion: { Nuevo: 'Nuevo', Usado: 'Usado' },
  estado_equipo: {
    Nuevo: 'Nuevo',
    'Open Box': 'Open Box',
    Usado: 'Usado',
  },
}

/**
 * Convierte el objeto especificaciones en una lista de { label, value } para mostrar.
 */
export function especificacionesAListado(especificaciones: EspecificacionesProducto | null | undefined): { label: string; value: string }[] {
  if (!especificaciones || typeof especificaciones !== 'object') return []
  return Object.entries(especificaciones)
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([key, value]) => {
      const strVal = String(value).trim()
      const valueLabel = VALUE_LABELS[key]?.[strVal]
      return {
        label: LABELS_ESPECIFICACIONES[key] ?? key,
        value: valueLabel ?? strVal,
      }
    })
}

/** Tipo de negocio por defecto para registros viejos sin tipo_negocio */
const TIPO_NEGOCIO_DEFAULT: TipoNegocio = 'prestamo_personal'

function str(val: unknown): string {
  if (val == null || val === '') return ''
  const s = String(val).trim()
  return s
}

/**
 * Devuelve una descripción humana del producto según tipo de negocio.
 * - dealer: marca, modelo, color, año, cantidad, precio, estado
 * - electro: tipo_articulo/categoría, marca, modelo, capacidad, cantidad, precio, estado
 * - prestamo_personal: nombre o código con fallback
 * Compatible con registros viejos (sin tipo_negocio o sin especificaciones).
 */
export function getNombreProducto(
  motor: Motor | null | undefined,
  tipoNegocioContext?: TipoNegocio
): string {
  if (!motor) return '—'
  const tipo = (motor.tipo_negocio ?? tipoNegocioContext ?? TIPO_NEGOCIO_DEFAULT) as TipoNegocio
  const spec = motor.especificaciones as Record<string, unknown> | null | undefined
  const precio = Number(motor.precio_venta ?? 0)
  const cantidad = Number(motor.cantidad ?? 0)
  const estado = str(motor.estado)

  if (tipo === 'dealer') {
    const marca = str(spec?.marca ?? motor.marca)
    const modelo = str(spec?.modelo ?? motor.modelo)
    const color = str(spec?.color ?? motor.color)
    const año = spec?.año ?? motor.año
    const añoStr = año != null ? String(año) : ''
    const parts = [marca, modelo, color, añoStr].filter(Boolean)
    const desc = parts.length > 0 ? parts.join(' · ') : motor.numero_chasis
    return [desc, cantidad > 0 ? `Stock: ${cantidad}` : '', estado, precio > 0 ? `$${precio.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''].filter(Boolean).join(' · ')
  }

  if (tipo === 'electro') {
    const categoria = str(spec?.categoria_electro ?? spec?.linea_producto ?? motor.categoria)
    const catLabel = categoria ? (VALUE_LABELS.categoria_electro?.[categoria] ?? VALUE_LABELS.linea_producto?.[categoria] ?? categoria) : ''
    const marca = str(spec?.marca ?? motor.marca)
    const modelo = str(spec?.modelo ?? motor.modelo)
    const capacidad = str(spec?.capacidad ?? motor.capacidad)
    const tipoEquipo = str(spec?.tipo_equipo ?? motor.tipo_articulo)
    const parts = [catLabel, tipoEquipo, marca, modelo, capacidad].filter(Boolean)
    const desc = parts.length > 0 ? parts.join(' · ') : motor.numero_chasis
    return [desc, cantidad > 0 ? `Stock: ${cantidad}` : '', estado, precio > 0 ? `$${precio.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''].filter(Boolean).join(' · ')
  }

  // prestamo_personal o fallback para registros viejos
  const nombre = str(motor.marca ?? motor.modelo) || motor.numero_chasis
  const codigo = motor.numero_chasis ? ` (${motor.numero_chasis})` : ''
  const stock = cantidad > 0 ? ` · Stock: ${cantidad}` : ''
  return `${nombre}${codigo}${stock} · ${estado} · $${precio.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Descripción corta para la primera columna del listado (solo producto, sin precio/estado repetidos).
 */
export function getDescripcionProductoListado(
  motor: Motor | null | undefined,
  tipoNegocioContext?: TipoNegocio
): string {
  if (!motor) return '—'

  const tipo = (motor.tipo_negocio ?? tipoNegocioContext ?? TIPO_NEGOCIO_DEFAULT) as TipoNegocio
  const spec = motor.especificaciones as Record<string, unknown> | null | undefined

  if (tipo === 'dealer') {
    const marca = str(spec?.marca ?? motor.marca)
    const modelo = str(spec?.modelo ?? motor.modelo)
    const año = spec?.año != null ? String(spec.año).trim() : ''
    const color = str(spec?.color)
    const parts = [marca, modelo, año, color].filter(Boolean)
    return parts.length > 0 ? parts.join(' · ') : (motor.numero_chasis || 'Vehículo')
  }

  if (tipo === 'electro') {
    const tipoEquipo = str(spec?.tipo_equipo)
    const categoria = str(spec?.categoria_electro ?? spec?.linea_producto)
    const catLabel = categoria
      ? (VALUE_LABELS.categoria_electro?.[categoria] ?? VALUE_LABELS.linea_producto?.[categoria] ?? categoria)
      : ''
    const marca = str(spec?.marca ?? motor.marca)
    const modelo = str(spec?.modelo ?? motor.modelo)
    const capacidad = str(spec?.capacidad)

    const parts = [tipoEquipo || catLabel, marca, modelo, capacidad].filter(Boolean)
    return parts.length > 0 ? parts.join(' · ') : (motor.numero_chasis || 'Electrodoméstico')
  }

  return str(motor.marca) || motor.numero_chasis || 'Producto'
}
