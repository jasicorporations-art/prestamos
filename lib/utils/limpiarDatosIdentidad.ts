/**
 * Extrae cédula (RD) y nombre completo del texto OCR de la cédula de identidad.
 *
 * En la cédula dominicana el nombre completo está debajo de la foto principal,
 * en dos líneas: primera = nombres (ej. JOHN IVAN), segunda = apellidos (ej. RIJO RAMIREZ).
 * No hay etiquetas "nombre" o "apellido"; solo texto en mayúsculas.
 *
 * Estrategia: aceptar solo líneas que sean 100% nombre (solo letras, sin palabras
 * de la tarjeta). Si hace falta, quitar palabras prohibidas y usar el resto.
 */

const RD_CEDULA_REGEX = /(\d{3}[-]?\d{7}[-]?\d{1})|(\d{11})/

/** Frases y palabras que aparecen en la tarjeta y no son parte del nombre (ruido). */
const BASURA_RD = [
  'REPUBLICA DOMINICANA',
  'JUNTA CENTRAL ELECTORAL',
  'CEDULA DE IDENTIDAD Y ELECTORAL',
  'CEDULA DE IDENTIDAD',
  'LUGAR DE NACIMIENTO',
  'FECHA DE EXPIRACION',
  'FECHA DE NACIMIENTO',
  'FECHA DE EMISION',
  'ESTADO CIVIL',
  'SANTO DOMINGO',
  'SATO DOMINGO',
  'REPUBLICA',
  'DOMINICANA',
  'JUNTA',
  'CENTRAL',
  'ELECTORAL',
  'IDENTIDAD',
  'EVALUACION',
  'ESTUDIANTE',
  'OCUPACION',
  'OCUPACIÓN',
  'SANGRE',
  'VENCIMIENTO',
  'CASADO',
  'SOLTERO',
  'SEXO',
  'NACIONALIDAD',
  'NACIMIENTO',
  'EXPIRACION',
  'DOMINGO',
  'CEDULA',
  'SANTO',
  'SATO',
]

/** Normaliza para comparar (mayúsculas, sin tildes, un solo espacio). */
function normalizarSinTildes(s: string): string {
  return s
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Set de palabras prohibidas (normalizadas) para filtrar por palabra. */
const BASURA_PALABRAS = new Set(
  BASURA_RD.flatMap((f) => f.split(/\s+/).filter(Boolean)).map((w) => normalizarSinTildes(w))
)

function esLineaCedula(linea: string): boolean {
  return /\d{3}-?\d{7}-?\d{1}/.test(linea) || /\d{11}/.test(linea.replace(/\s/g, ''))
}

/** Quita de la línea frases y palabras prohibidas; devuelve el resto normalizado. */
function quitarBasuraDeLinea(linea: string): string {
  let texto = normalizarSinTildes(linea)
  const frasesLargas = [...BASURA_RD].filter((b) => b.includes(' ')).sort((a, b) => b.length - a.length)
  for (const f of frasesLargas) {
    texto = texto.replace(new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ')
  }
  const palabras = texto.split(/\s+/).filter(Boolean)
  const sinBasura = palabras.filter((p) => !BASURA_PALABRAS.has(p))
  return sinBasura.join(' ').trim()
}

/** True si el texto es claramente un nombre: 2-4 palabras, solo letras, longitud razonable, no es basura. */
function pareceNombreValido(resto: string): boolean {
  const n = normalizarSinTildes(resto)
  if (!n || n.length < 4 || n.length > 45) return false
  if (/\d/.test(resto)) return false
  const palabras = n.split(/\s+/).filter(Boolean)
  if (palabras.length < 1 || palabras.length > 4) return false
  const soloLetras = n.replace(/\s/g, '').replace(/[^A-Za-z]/g, '')
  if (soloLetras.length < 4) return false
  if (BASURA_PALABRAS.has(n) || BASURA_RD.includes(n)) return false
  const todasSonBasura = palabras.every((p) => BASURA_PALABRAS.has(p))
  return !todasSonBasura
}

/** Candidatos estrictos: línea sin números y sin contener ninguna palabra prohibida. */
function lineasSinBasura(lineas: string[]): string[] {
  return lineas.filter((linea) => {
    if (/\d/.test(linea)) return false
    const texto = normalizarSinTildes(linea)
    const palabras = texto.split(/\s+/).filter(Boolean)
    const algunaBasura = palabras.some((p) => BASURA_PALABRAS.has(p)) || BASURA_RD.some((b) => texto.includes(b))
    return !algunaBasura && texto.length > 2
  })
}

export function extraerSoloCedulaYNombre(texto: string): {
  cedula: string
  nombreCompleto: string
} {
  const lines = texto
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  let cedula = ''
  for (const line of lines) {
    const match = line.match(RD_CEDULA_REGEX)
    if (match) {
      cedula = (match[1] || match[2] || match[0]).replace(/-/g, '')
      break
    }
  }

  const sinLineaCedula = lines.filter((l) => !esLineaCedula(l))
  let candidatas: string[] = []

  // 1) Intentar solo líneas 100% limpias (sin ninguna palabra prohibida)
  const limpias = lineasSinBasura(sinLineaCedula)
  for (const linea of limpias) {
    const n = normalizarSinTildes(linea)
    if (pareceNombreValido(n)) candidatas.push(n)
  }

  // 2) Si no hay suficientes, usar líneas quitando basura por palabra y quedarse con el resto
  if (candidatas.length < 2) {
    candidatas = []
    for (const linea of sinLineaCedula) {
      if (/\d/.test(linea)) continue
      const resto = quitarBasuraDeLinea(linea)
      if (pareceNombreValido(resto)) candidatas.push(resto)
    }
  }

  // Eliminar duplicados
  const unicos: string[] = []
  const vistos = new Set<string>()
  for (const c of candidatas) {
    const n = normalizarSinTildes(c)
    if (!vistos.has(n)) {
      vistos.add(n)
      unicos.push(c)
    }
  }

  // En la cédula: debajo de la foto van 2 líneas → primera = nombres, segunda = apellidos.
  // Si el OCR devolvió todo en una línea (ej. "JOHN IVAN RIJO RAMIREZ"), partir en nombres + apellidos.
  let nombres: string
  let apellidos: string
  if (unicos.length === 1) {
    const palabras = unicos[0].trim().split(/\s+/).filter(Boolean)
    if (palabras.length >= 4) {
      // Típico: nombre nombre apellido apellido → primera mitad = nombres, segunda = apellidos
      const mitad = Math.ceil(palabras.length / 2)
      nombres = capitalizarPalabras(palabras.slice(0, mitad).join(' '))
      apellidos = capitalizarPalabras(palabras.slice(mitad).join(' '))
    } else {
      nombres = capitalizarPalabras(unicos[0])
      apellidos = ''
    }
  } else {
    nombres = capitalizarPalabras(unicos[0] || '')
    apellidos = capitalizarPalabras(
      unicos
        .slice(1, 3)
        .filter(Boolean)
        .join(' ')
    )
  }
  const nombreCompleto = [apellidos, nombres].filter(Boolean).join(' ') || ''

  return { cedula, nombreCompleto }
}

function capitalizarPalabras(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}
