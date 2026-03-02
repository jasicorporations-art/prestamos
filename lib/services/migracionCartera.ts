/**
 * Servicio de Migración de Cartera Activa
 * Permite importar préstamos con historial de pagos desde otro software
 */

import { supabase } from '../supabase'
import { getCompaniaActual } from '../utils/compania'
import { withAppIdData, withAppIdFilter, getAppId } from '../utils/appId'
import { clientesService } from './clientes'
import { motoresService } from './motores'
import { ventasService } from './ventas'
import { calcularAmortizacionFrancesa } from './amortizacion'

export const MIGRACION_HEADERS = [
  'cedula_cliente',
  'nombre_cliente',
  'telefono',
  'direccion',
  'monto_total_prestado',
  'tasa_interes',
  'total_cuotas_pactadas',
  'cuotas_ya_pagadas',
  'monto_ya_pagado',
  'fecha_ultimo_pago',
  'nombre_garante',
  'telefono_garante',
] as const

export const MIGRACION_HEADERS_DISPLAY = [
  'Cédula Cliente',
  'Nombre Cliente',
  'Teléfono',
  'Dirección',
  'Monto Total Prestado',
  'Tasa Interés (%)',
  'Total Cuotas Pactadas',
  'Cuotas Ya Pagadas',
  'Monto Ya Pagado',
  'Fecha Último Pago',
  'Nombre Garante',
  'Teléfono Garante',
] as const

export interface MigracionRow {
  rowIndex: number
  cedula_cliente: string
  nombre_cliente: string
  telefono: string
  direccion: string
  monto_total_prestado: string
  tasa_interes: string
  total_cuotas_pactadas: string
  cuotas_ya_pagadas: string
  monto_ya_pagado: string
  fecha_ultimo_pago: string
  nombre_garante: string
  telefono_garante: string
  isValid: boolean
  errors: string[]
  saldoRestante?: number
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

const HEADER_MAP: Record<string, string> = {
  cedula_cliente: 'cedula_cliente',
  cedula: 'cedula_cliente',
  nombre_cliente: 'nombre_cliente',
  nombre: 'nombre_cliente',
  telefono: 'telefono',
  celular: 'telefono',
  direccion: 'direccion',
  monto_total_prestado: 'monto_total_prestado',
  monto: 'monto_total_prestado',
  tasa_interes: 'tasa_interes',
  tasa: 'tasa_interes',
  total_cuotas_pactadas: 'total_cuotas_pactadas',
  cuotas: 'total_cuotas_pactadas',
  cuotas_ya_pagadas: 'cuotas_ya_pagadas',
  pagadas: 'cuotas_ya_pagadas',
  monto_ya_pagado: 'monto_ya_pagado',
  pagado: 'monto_ya_pagado',
  fecha_ultimo_pago: 'fecha_ultimo_pago',
  ultimo_pago: 'fecha_ultimo_pago',
  nombre_garante: 'nombre_garante',
  garante: 'nombre_garante',
  telefono_garante: 'telefono_garante',
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
      if (current.some((c) => c.length > 0)) lines.push(current)
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

function mapHeader(header: string): string | null {
  const norm = normalizarEncabezado(header)
  return HEADER_MAP[norm] ?? (MIGRACION_HEADERS.includes(norm as any) ? norm : null)
}

export function parseMigracionCSV(fileContent: string): MigracionRow[] {
  const rows = parseCSV(fileContent)
  if (rows.length < 2) return []

  const headers = rows[0]
  const headerMap: Record<number, string> = {}
  headers.forEach((h, i) => {
    const key = mapHeader(h)
    if (key) headerMap[i] = key
  })

  const result: MigracionRow[] = []
  for (let r = 1; r < rows.length; r++) {
    const raw = rows[r]
    if (raw.every((c) => !c.trim())) continue

    const get = (key: string) => {
      const idx = Object.entries(headerMap).find(([, k]) => k === key)?.[0]
      return idx !== undefined ? (raw[Number(idx)] ?? '').trim() : ''
    }

    const nombre = get('nombre_cliente')
    const telefono = get('telefono')
    const montoStr = get('monto_total_prestado')
    const cuotasStr = get('total_cuotas_pactadas')
    const pagadasStr = get('cuotas_ya_pagadas')
    const montoPagadoStr = get('monto_ya_pagado')

    const errors: string[] = []
    if (!nombre) errors.push('Falta nombre del cliente')
    if (!telefono) errors.push('Falta teléfono del cliente')
    if (!montoStr || parseFloat(String(montoStr).replace(/[^0-9.-]/g, '')) <= 0) {
      errors.push('Monto total prestado inválido')
    }
    const totalCuotas = parseInt(String(cuotasStr).replace(/\D/g, ''), 10) || 0
    if (totalCuotas <= 0) errors.push('Total cuotas pactadas inválido')
    const cuotasPagadas = parseInt(String(pagadasStr).replace(/\D/g, ''), 10) || 0
    if (cuotasPagadas > totalCuotas && totalCuotas > 0) {
      errors.push('Cuotas pagadas no puede ser mayor que total')
    }

    const montoTotal = parseFloat(String(montoStr).replace(/[^0-9.-]/g, '')) || 0
    const montoPagado = parseFloat(String(montoPagadoStr).replace(/[^0-9.-]/g, '')) || 0
    const saldoRestante = Math.max(0, montoTotal - montoPagado)

    result.push({
      rowIndex: r + 1,
      cedula_cliente: get('cedula_cliente') || `MIG-${r}`,
      nombre_cliente: nombre,
      telefono,
      direccion: get('direccion') || 'Sin especificar',
      monto_total_prestado: montoStr,
      tasa_interes: get('tasa_interes'),
      total_cuotas_pactadas: cuotasStr,
      cuotas_ya_pagadas: pagadasStr,
      monto_ya_pagado: montoPagadoStr,
      fecha_ultimo_pago: get('fecha_ultimo_pago'),
      nombre_garante: get('nombre_garante') || 'Sin especificar',
      telefono_garante: get('telefono_garante'),
      isValid: errors.length === 0,
      errors,
      saldoRestante,
    })
  }
  return result
}

export function generateMigracionTemplate(): string {
  return '\uFEFF' + MIGRACION_HEADERS_DISPLAY.join(',') + '\n'
}

export function downloadMigracionTemplate(): void {
  const csv = generateMigracionTemplate()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'plantilla-migracion-cartera.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export interface MigracionResult {
  success: number
  failed: number
  errors: { row: number; message: string }[]
}

export const migracionCarteraService = {
  async migrar(rows: MigracionRow[]): Promise<MigracionResult> {
    const compania = getCompaniaActual()
    if (!compania) throw new Error('No hay compañía seleccionada.')

    const validRows = rows.filter((r) => r.isValid)
    if (validRows.length === 0) throw new Error('No hay filas válidas para migrar.')

    const { perfilesService } = await import('./perfiles')
    const sucursalId = await perfilesService.getSucursalActual()
    const appId = getAppId()
    const empresaId = compania

    const result: MigracionResult = { success: 0, failed: 0, errors: [] }

    for (const row of validRows) {
      try {
        const montoTotal = parseFloat(String(row.monto_total_prestado).replace(/[^0-9.-]/g, '')) || 0
        const tasa = parseFloat(String(row.tasa_interes).replace(/[^0-9.-]/g, '')) || 0
        const totalCuotas = parseInt(String(row.total_cuotas_pactadas).replace(/\D/g, ''), 10) || 12
        const cuotasPagadas = parseInt(String(row.cuotas_ya_pagadas).replace(/\D/g, ''), 10) || 0
        const montoPagado = parseFloat(String(row.monto_ya_pagado).replace(/[^0-9.-]/g, '')) || 0
        const saldoPendiente = Math.max(0, montoTotal - montoPagado)

        // Calcular fecha de inicio: si hay fecha_ultimo_pago y cuotas pagadas, retroceder N meses
        let fechaInicio: string
        if (row.fecha_ultimo_pago && cuotasPagadas > 0) {
          const d = new Date(row.fecha_ultimo_pago)
          if (!isNaN(d.getTime())) {
            d.setMonth(d.getMonth() - cuotasPagadas)
            fechaInicio = d.toISOString().split('T')[0]
          } else {
            const fallback = new Date()
            fallback.setMonth(fallback.getMonth() - cuotasPagadas)
            fechaInicio = fallback.toISOString().split('T')[0]
          }
        } else if (!row.fecha_ultimo_pago && cuotasPagadas > 0) {
          const d = new Date()
          d.setMonth(d.getMonth() - cuotasPagadas)
          fechaInicio = d.toISOString().split('T')[0]
        } else {
          fechaInicio = row.fecha_ultimo_pago || new Date().toISOString().split('T')[0]
          const parsed = new Date(fechaInicio)
          if (isNaN(parsed.getTime())) fechaInicio = new Date().toISOString().split('T')[0]
          else fechaInicio = parsed.toISOString().split('T')[0]
        }

        // 1. Crear cliente
        const cliente = await clientesService.create({
          nombre_completo: row.nombre_cliente,
          cedula: row.cedula_cliente || `MIG-${Date.now()}-${row.rowIndex}`,
          direccion: row.direccion || 'Sin especificar',
          nombre_garante: row.nombre_garante || 'Sin especificar',
          celular: row.telefono,
          telefono_garante: row.telefono_garante || undefined,
        } as any)

        // 2. Crear motor placeholder
        const numeroPrestamo = await motoresService.getSiguienteNumeroPrestamo()
        const motor = await motoresService.create({
          marca: 'Migración',
          matricula: numeroPrestamo,
          numero_chasis: numeroPrestamo,
          precio_venta: montoTotal,
          estado: 'Disponible',
          cantidad: 1,
        } as any)

        // 3. Generar número de préstamo y crear venta
        const numeroPrestamoVenta = await ventasService.generarCodigoPrestamo(
          row.nombre_cliente.split(' ')[0] || 'X',
          row.nombre_cliente.split(' ').pop() || 'X',
          row.cedula_cliente
        )

        const ventaData: any = withAppIdData({
          motor_id: motor.id,
          cliente_id: cliente.id,
          numero_prestamo: numeroPrestamoVenta,
          monto_total: montoTotal,
          cantidad_cuotas: totalCuotas,
          saldo_pendiente: saldoPendiente,
          fecha_venta: fechaInicio,
          plazo_meses: totalCuotas,
          porcentaje_interes: tasa,
          tipo_plazo: 'mensual',
          dia_pago_mensual: 1,
          empresa_id: empresaId,
          compania_id: empresaId,
          sucursal_id: sucursalId,
        })

        const { data: venta, error: ventaError } = await (supabase as any)
          .from('ventas')
          .insert(ventaData)
          .select()
          .single()

        if (ventaError) throw ventaError
        if (!venta) throw new Error('Error creando venta')

        // 4. Marcar motor como Vendido
        let motorUpdate = (supabase as any)
          .from('motores')
          .update(
            withAppIdData({
              cantidad: 0,
              estado: 'Vendido',
              updated_at: new Date().toISOString(),
            })
          )
          .eq('id', motor.id)
        motorUpdate = withAppIdFilter(motorUpdate, 'motores')
        await motorUpdate

        // 5. Generar e insertar cuotas detalladas (calendario completo)
        const cuotas = calcularAmortizacionFrancesa({
          monto_total: montoTotal,
          tasa_interes_anual: tasa,
          plazo_meses: totalCuotas,
          fecha_inicio: fechaInicio,
          dia_pago_mensual: 1,
        })

        const cuotasRows = cuotas.map((c) => ({
          venta_id: venta.id,
          empresa_id: empresaId,
          numero_cuota: c.numero_cuota,
          fecha_pago: c.fecha_pago,
          cuota_fija: c.cuota_fija,
          monto_cuota: c.cuota_fija,
          interes_mes: c.interes_mes,
          abono_capital: c.abono_capital,
          saldo_pendiente: c.saldo_pendiente,
        }))

        const { error: cuotasError } = await (supabase as any)
          .from('cuotas_detalladas')
          .insert(withAppIdData(cuotasRows, 'cuotas_detalladas'))

        if (cuotasError) throw cuotasError

        // 6. Insertar pagos históricos (cuotas 1 a N como PAGADAS)
        if (cuotasPagadas > 0) {
          const pagosToInsert = []
          for (let i = 1; i <= Math.min(cuotasPagadas, cuotas.length); i++) {
            const cuota = cuotas[i - 1]
            const fechaPagoStr =
              i === cuotasPagadas && row.fecha_ultimo_pago
                ? row.fecha_ultimo_pago
                : cuota.fecha_pago
            const fechaPagoDate = new Date(fechaPagoStr)
            const fechaPagoISO = isNaN(fechaPagoDate.getTime())
              ? new Date().toISOString()
              : fechaPagoDate.toISOString()
            pagosToInsert.push({
              venta_id: venta.id,
              monto: cuota.cuota_fija,
              numero_cuota: i,
              fecha_pago: fechaPagoISO.split('T')[0],
              fecha_hora: fechaPagoISO,
              empresa_id: empresaId,
              compania_id: empresaId,
              sucursal_id: sucursalId,
              app_id: appId || undefined,
            })
          }

          const { error: pagosError } = await (supabase as any).from('pagos').insert(pagosToInsert)
          if (pagosError) throw pagosError
        }

        // 7. Actualizar número de préstamo en cliente
        await ventasService.actualizarNumeroPrestamoCliente({
          cliente_id: cliente.id,
          numero_prestamo: numeroPrestamoVenta,
        })

        result.success++
      } catch (err: any) {
        result.failed++
        result.errors.push({ row: row.rowIndex, message: err?.message || 'Error desconocido' })
      }
    }

    return result
  },
}
