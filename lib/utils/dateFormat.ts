/**
 * Utilidades para formatear fechas y horas
 * Formato de hora: 12 horas (AM/PM)
 */

/**
 * Formatea una fecha en formato DD/MM/YYYY
 * Maneja correctamente las fechas que vienen de Supabase (UTC)
 */
export function formatDate(date: Date | string): string {
  let d: Date
  if (typeof date === 'string') {
    // Si la fecha viene como string de Supabase, crear Date sin conversión de timezone
    // Supabase devuelve fechas en formato ISO con timezone
    d = new Date(date)
    // Si la fecha tiene información de timezone, usar los métodos UTC para evitar conversión
    if (date.includes('T') && (date.includes('Z') || date.includes('+'))) {
      // Es una fecha ISO con timezone, usar los valores locales pero sin ajuste de timezone
      // Para evitar problemas, usar los métodos getUTC* pero ajustar a hora local
      const dateObj = new Date(date)
      // Obtener los componentes de fecha/hora locales (sin conversión de timezone)
      const day = String(dateObj.getDate()).padStart(2, '0')
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const year = dateObj.getFullYear()
      return `${day}/${month}/${year}`
    }
    d = new Date(date)
  } else {
    d = date
  }
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Formatea una hora en formato 12 horas (AM/PM)
 * Ejemplo: "02:30 PM" o "11:45 AM"
 * Maneja correctamente las fechas que vienen de Supabase (UTC)
 */
export function formatTime12Hours(date: Date | string): string {
  let d: Date
  if (typeof date === 'string') {
    d = new Date(date)
    // Si la fecha tiene información de timezone, usar los valores locales
    if (date.includes('T') && (date.includes('Z') || date.includes('+'))) {
      // Es una fecha ISO con timezone, usar los valores locales
      const dateObj = new Date(date)
      let hours = dateObj.getHours()
      const minutes = dateObj.getMinutes()
      const ampm = hours >= 12 ? 'PM' : 'AM'
      
      // Convertir a formato 12 horas
      hours = hours % 12
      hours = hours ? hours : 12 // 0 se convierte en 12
      
      const minutesStr = String(minutes).padStart(2, '0')
      const hoursStr = String(hours).padStart(2, '0')
      
      return `${hoursStr}:${minutesStr} ${ampm}`
    }
    d = new Date(date)
  } else {
    d = date
  }
  
  let hours = d.getHours()
  const minutes = d.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  
  // Convertir a formato 12 horas
  hours = hours % 12
  hours = hours ? hours : 12 // 0 se convierte en 12
  
  const minutesStr = String(minutes).padStart(2, '0')
  const hoursStr = String(hours).padStart(2, '0')
  
  return `${hoursStr}:${minutesStr} ${ampm}`
}

/**
 * Formatea fecha y hora en formato 12 horas
 * Ejemplo: "15/01/2024 02:30 PM"
 */
export function formatDateTime12Hours(date: Date | string): string {
  return `${formatDate(date)} ${formatTime12Hours(date)}`
}

/** Zona horaria de República Dominicana (AST, UTC-4) */
export const TIMEZONE_DOMINICANA = 'America/Santo_Domingo'

/**
 * Formatea una fecha/hora en zona horaria de República Dominicana.
 * Usa la hora almacenada en la base de datos (no la hora de procesamiento).
 * Formato: dd 'de' MMM 'de' yyyy, hh:mm a (ej: 15 de feb de 2025, 02:30 p.m.)
 * Meses en español en minúscula.
 */
export function formatDateDominican(date: Date | string): string {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return 'N/A'

  const formatter = new Intl.DateTimeFormat('es-DO', {
    timeZone: TIMEZONE_DOMINICANA,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  const parts = formatter.formatToParts(d)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  const day = get('day')
  const month = (get('month') || '').toLowerCase().replace(/\.$/, '')
  const year = get('year')
  const hour = get('hour')
  const minute = get('minute')
  const dayPeriod = (get('dayPeriod') || 'a.m.').toLowerCase()

  return `${day} de ${month} de ${year}, ${hour}:${minute} ${dayPeriod}`
}

/**
 * Función de compatibilidad para formatDate con formato personalizado
 * Soporta: 'dd/MM/yyyy', 'HH:mm', 'hh:mm a'
 */
export function formatDateCustom(date: Date | string, formatStr: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  if (formatStr === 'dd/MM/yyyy') {
    return formatDate(d)
  }
  
  if (formatStr === 'HH:mm') {
    // Formato 24 horas (legacy - mantener por compatibilidad)
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }
  
  if (formatStr === 'hh:mm a' || formatStr === 'hh:mm A') {
    // Formato 12 horas con AM/PM
    return formatTime12Hours(d)
  }
  
  // Por defecto, solo fecha
  return formatDate(d)
}

/**
 * Formatea una fecha como "15 ene 2025" (solo fecha, sin hora)
 * en zona horaria de República Dominicana.
 */
export function formatCalendarDateDominican(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—'
  try {
    const d = typeof dateInput === 'string'
      ? new Date(dateInput.includes('T') ? dateInput : dateInput + 'T00:00:00')
      : dateInput
    if (isNaN(d.getTime())) return String(dateInput)
    return d.toLocaleDateString('es-DO', {
      timeZone: TIMEZONE_DOMINICANA,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(dateInput)
  }
}

/**
 * Formatea la hora en formato 12 horas (AM/PM) en zona horaria dominicana.
 * Ejemplo: "02:30 p. m."
 */
export function formatTime12Dominican(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—'
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return String(dateInput)
    return d.toLocaleTimeString('es-DO', {
      timeZone: TIMEZONE_DOMINICANA,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return String(dateInput)
  }
}
