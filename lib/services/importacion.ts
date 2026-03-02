/**
 * Servicio de Importación Masiva CSV
 * Permite migrar cartera de clientes y préstamos desde archivos CSV
 */

import { getCompaniaActual } from '../utils/compania'
import { clientesService } from './clientes'
import { motoresService } from './motores'
import { ventasService } from './ventas'

// Encabezados esperados en el CSV (case-insensitive, normalizados)
export const CSV_HEADERS = [
  // Cliente
  'nombre_completo',
  'cedula',
  'telefono',
  'direccion',
  'correo_electronico',
  // Garante
  'nombre_del_garante',
  'telefono_del_garante',
  'direccion_del_garante',
  'correo_del_garante',
  // Préstamo
  'monto_principal',
  'tasa_de_interes',
  'cantidad_de_cuotas',
  'fecha_de_inicio',
] as const

export const CSV_HEADERS_DISPLAY = [
  'Nombre Completo',
  'Cédula',
  'Teléfono',
  'Dirección',
  'Correo Electrónico',
  'Nombre del Garante',
  'Teléfono del Garante',
  'Dirección del Garante',
  'Correo del Garante',
  'Monto Principal',
  'Tasa de Interés',
  'Cantidad de Cuotas',
  'Fecha de Inicio',
] as const

export interface ImportRow {
  rowIndex: number
  nombre_completo: string
  cedula: string
  telefono: string
  direccion: string
  correo_electronico: string
  nombre_del_garante: string
  telefono_del_garante: string
  direccion_del_garante: string
  correo_del_garante: string
  monto_principal: string
  tasa_de_interes: string
  cantidad_de_cuotas: string
  fecha_de_inicio: string
  hasLoanData: boolean
  isValid: boolean
  errors: string[]
}

function normalizarEncabezado(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

const HEADER_ALIASES: Record<string, string> = {
  nombre_completo: 'nombre_completo',
  nombrecompleto: 'nombre_completo',
  nombre: 'nombre_completo',
  cedula: 'cedula',
  cedulaidentidad: 'cedula',
  telefono: 'telefono',
  celular: 'telefono',
  telefono_cliente: 'telefono',
  direccion: 'direccion',
  correo_electronico: 'correo_electronico',
  correo: 'correo_electronico',
  email: 'correo_electronico',
  email_cliente: 'correo_electronico',
  nombre_del_garante: 'nombre_del_garante',
  nombre_garante: 'nombre_del_garante',
  garante: 'nombre_del_garante',
  telefono_del_garante: 'telefono_del_garante',
  telefono_garante: 'telefono_del_garante',
  direccion_del_garante: 'direccion_del_garante',
  direccion_garante: 'direccion_del_garante',
  correo_del_garante: 'correo_del_garante',
  email_garante: 'correo_del_garante',
  monto_principal: 'monto_principal',
  monto: 'monto_principal',
  monto_prestamo: 'monto_principal',
  tasa_de_interes: 'tasa_de_interes',
  tasa_interes: 'tasa_de_interes',
  interes: 'tasa_de_interes',
  cantidad_de_cuotas: 'cantidad_de_cuotas',
  cuotas: 'cantidad_de_cuotas',
  cantidad_cuotas: 'cantidad_de_cuotas',
  fecha_de_inicio: 'fecha_de_inicio',
  fecha_inicio: 'fecha_de_inicio',
  fecha_inicio_prestamo: 'fecha_de_inicio',
}

function parseCSV(text: string): string[][] {
  const lines: string[][] = []
  let current: string[] = []
  let inQuotes = false
  let field = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else {
        field += char
      }
    } else if (char === ',' || char === ';') {
      current.push(field.trim())
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      current.push(field.trim())
      field = ''
      if (current.some((c) => c.length > 0)) {
        lines.push(current)
      }
      current = []
    } else {
      field += char
    }
  }
  if (field.length > 0 || current.length > 0) {
    current.push(field.trim())
    lines.push(current)
  }
  return lines
}

function mapHeaderToKey(header: string): string | null {
  const norm = normalizarEncabezado(header)
  return HEADER_ALIASES[norm] ?? (CSV_HEADERS.includes(norm as any) ? norm : null)
}

export function parseCSVFile(fileContent: string): ImportRow[] {
  const rows = parseCSV(fileContent)
  if (rows.length < 2) return []

  const headers = rows[0]
  const headerMap: Record<number, string> = {}
  headers.forEach((h, i) => {
    const key = mapHeaderToKey(h)
    if (key) headerMap[i] = key
  })

  const result: ImportRow[] = []
  for (let r = 1; r < rows.length; r++) {
    const raw = rows[r]
    if (raw.every((c) => !c.trim())) continue

    const get = (key: string) => {
      const idx = Object.entries(headerMap).find(([, k]) => k === key)?.[0]
      return idx !== undefined ? (raw[Number(idx)] ?? '').trim() : ''
    }

    const nombre = get('nombre_completo')
    const telefono = get('telefono')
    const montoStr = get('monto_principal')
    const tasaStr = get('tasa_de_interes')
    const cuotasStr = get('cantidad_de_cuotas')
    const fechaStr = get('fecha_de_inicio')

    const hasLoanData = !!(montoStr || tasaStr || cuotasStr || fechaStr)
    const errors: string[] = []

    if (!nombre) errors.push('Falta el nombre del cliente')
    if (!telefono) errors.push('Falta el teléfono del cliente')

    const isValid = errors.length === 0

    result.push({
      rowIndex: r + 1,
      nombre_completo: nombre,
      cedula: get('cedula') || 'N/A',
      telefono,
      direccion: get('direccion') || 'Sin especificar',
      correo_electronico: get('correo_electronico'),
      nombre_del_garante: get('nombre_del_garante') || 'Sin especificar',
      telefono_del_garante: get('telefono_del_garante'),
      direccion_del_garante: get('direccion_del_garante'),
      correo_del_garante: get('correo_del_garante'),
      monto_principal: montoStr,
      tasa_de_interes: tasaStr,
      cantidad_de_cuotas: cuotasStr,
      fecha_de_inicio: fechaStr,
      hasLoanData,
      isValid,
      errors,
    })
  }
  return result
}

export function generateTemplateCSV(): string {
  const headers = CSV_HEADERS_DISPLAY
  const separator = ','
  const content = headers.join(separator)
  return '\uFEFF' + content + '\n'
}

export function downloadTemplateCSV(): void {
  const csv = generateTemplateCSV()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'plantilla-importacion-clientes.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export interface ImportResult {
  success: number
  failed: number
  errors: { row: number; message: string }[]
}

export const importacionService = {
  /**
   * Ejecuta la importación de filas validadas a Supabase
   * Asigna automáticamente compania_id del usuario logueado
   */
  async importar(rows: ImportRow[]): Promise<ImportResult> {
    const compania = getCompaniaActual()
    if (!compania) {
      throw new Error('No hay compañía seleccionada. Inicia sesión nuevamente.')
    }

    const { perfilesService } = await import('./perfiles')
    const esAdmin = await perfilesService.esAdmin()
    if (!esAdmin) {
      throw new Error('Solo los administradores pueden realizar importación masiva de clientes.')
    }

    const validRows = rows.filter((r) => r.isValid)
    if (validRows.length === 0) {
      throw new Error('No hay filas válidas para importar')
    }

    const sucursalId = await perfilesService.getSucursalActual()
    const result: ImportResult = { success: 0, failed: 0, errors: [] }

    for (const row of validRows) {
      try {
        const cedula = row.cedula || `IMP-${Date.now()}-${row.rowIndex}`
        // 1. Buscar cliente existente por cédula o crear uno nuevo (permite varias filas con mismo cliente = varios préstamos)
        let cliente = await clientesService.getByCedula(cedula)
        if (!cliente) {
          const clienteData = {
            nombre_completo: row.nombre_completo,
            cedula,
            direccion: row.direccion || 'Sin especificar',
            nombre_garante: row.nombre_del_garante || 'Sin especificar',
            celular: row.telefono,
            email: row.correo_electronico || undefined,
            direccion_garante: row.direccion_del_garante || undefined,
            telefono_garante: row.telefono_del_garante || undefined,
            email_garante: row.correo_del_garante || undefined,
          }
          cliente = await clientesService.create(clienteData as any)
        }

        // 2. Si hay datos de préstamo, crear motor placeholder + venta
        if (row.hasLoanData && row.monto_principal) {
          const monto = parseFloat(String(row.monto_principal).replace(/[^0-9.-]/g, '')) || 0
          const tasa = parseFloat(String(row.tasa_de_interes).replace(/[^0-9.-]/g, '')) || 0
          const cuotas = parseInt(String(row.cantidad_de_cuotas).replace(/\D/g, ''), 10) || 12
          let fechaInicio = row.fecha_de_inicio
          if (!fechaInicio) {
            const d = new Date()
            fechaInicio = d.toISOString().split('T')[0]
          } else {
            const parsed = new Date(fechaInicio)
            if (!isNaN(parsed.getTime())) {
              fechaInicio = parsed.toISOString().split('T')[0]
            }
          }

          if (monto > 0 && cuotas > 0) {
            const numeroPrestamo = await motoresService.getSiguienteNumeroPrestamo()
            const { motoresService: motoresSvc } = await import('./motores')
            const motor = await motoresSvc.create({
              marca: 'Importación',
              matricula: numeroPrestamo,
              numero_chasis: numeroPrestamo,
              precio_venta: monto,
              estado: 'Disponible',
              cantidad: 1,
            } as any)

            const ventaData = {
              motor_id: motor.id,
              cliente_id: cliente.id,
              monto_total: monto,
              cantidad_cuotas: cuotas,
              saldo_pendiente: monto,
              fecha_venta: fechaInicio,
              ...(tasa > 0 && { porcentaje_interes: tasa }),
              // plazo_meses, tipo_plazo, dia_pago_mensual son opcionales (pueden no existir en schema mínimo)
            }

            await ventasService.create(ventaData as any)
          }
        }

        result.success++
      } catch (err: any) {
        result.failed++
        result.errors.push({
          row: row.rowIndex,
          message: err?.message || 'Error desconocido',
        })
      }
    }

    // Registrar en historial de actividad cuando hay importaciones exitosas
    if (result.success > 0) {
      try {
        const { actividadService } = await import('./actividad')
        await actividadService.registrarActividad(
          'Importación masiva de clientes',
          `Subió ${result.success} cliente(s) vía CSV${result.failed > 0 ? ` (${result.failed} con errores)` : ''}`,
          'clientes',
          undefined
        )
      } catch (error) {
        console.warn('⚠️ Error registrando actividad de importación:', error)
      }
    }

    return result
  },
}
