/**
 * Parsea el texto crudo del código PDF417 del reverso de cédula/ID dominicana
 * cuando no sigue el estándar AAMVA (etiquetas de 3 letras).
 * Intenta extraer cédula, nombres, apellidos, fecha de nacimiento y sexo.
 */

const RD_CEDULA_REGEX = /(\d{3}[-]?\d{7}[-]?\d{1})|(\d{11})/
const FECHA_REGEX = /(\d{2}\/\d{2}\/\d{4})|(\d{4}-\d{2}-\d{2})|(\d{8})/

export interface ReversoRD {
  cedula: string | null
  nombreCompleto: string | null
  nombres: string | null
  apellidos: string | null
  fechaNacimiento: string | null
  sexo: string | null
}

/**
 * Formatea AAAAMMDD a MM/DD/YYYY
 */
function formatDate(aaaammdd: string): string {
  if (aaaammdd.length >= 8) {
    const y = aaaammdd.slice(0, 4)
    const m = aaaammdd.slice(4, 6)
    const d = aaaammdd.slice(6, 8)
    return `${m}/${d}/${y}`
  }
  return aaaammdd
}

export function decodificarReversoRD(rawText: string): ReversoRD {
  const result: ReversoRD = {
    cedula: null,
    nombreCompleto: null,
    nombres: null,
    apellidos: null,
    fechaNacimiento: null,
    sexo: null,
  }

  if (!rawText || typeof rawText !== 'string') return result

  const text = rawText.trim()
  const lines = text.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean)

  // Cédula
  const cedulaMatch = text.match(RD_CEDULA_REGEX)
  if (cedulaMatch) {
    result.cedula = (cedulaMatch[1] || cedulaMatch[2] || cedulaMatch[0]).replace(/-/g, '')
  }

  // Fecha (AAAAMMDD o DD/MM/YYYY)
  const dateMatch = text.match(/\b(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/)
  if (dateMatch) {
    result.fechaNacimiento = formatDate(dateMatch[0])
  } else {
    const slashDate = text.match(FECHA_REGEX)
    if (slashDate) result.fechaNacimiento = slashDate[0]
  }

  // Sexo (M/F o 1/2)
  if (/\b([MF])\b/i.test(text)) {
    const m = text.match(/\b([MF])\b/i)
    result.sexo = m![1].toUpperCase() === 'M' ? 'Masculino' : 'Femenino'
  } else if (/\b[12]\b/.test(text)) {
    result.sexo = text.includes('1') ? 'Masculino' : 'Femenino'
  }

  // Nombres/apellidos: líneas que parecen nombres (2+ palabras, no solo números)
  const nameLines: string[] = []
  for (const line of lines) {
    if (line.length < 4 || line.length > 60) continue
    if (line.replace(/\s/g, '').replace(/-/g, '').match(/^\d+$/)) continue
    const words = line.split(/\s+/).filter((w) => w.length > 0)
    if (words.length >= 2 && words.length <= 5) nameLines.push(line)
  }
  if (nameLines.length >= 1) {
    result.nombreCompleto = nameLines.join(' ')
    result.apellidos = nameLines[0] ?? null
    result.nombres = nameLines[1] ?? null
  }

  return result
}
