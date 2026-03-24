'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Package, User, Phone, Calendar, DollarSign, FileText, ExternalLink } from 'lucide-react'
import { ventasService } from '@/lib/services/ventas'
import { supabase } from '@/lib/supabase'
import { useCompania } from '@/lib/contexts/CompaniaContext'
import { Button } from '@/components/Button'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDateCustom } from '@/lib/utils/dateFormat'
import type { Venta } from '@/types'

const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

interface VentaConResumen extends Venta {
  cuotasPagadas: number
}

function labelFrecuencia(venta: Venta): string {
  const t = venta.tipo_plazo || 'mensual'
  if (t === 'diario') return 'Diario'
  if (t === 'semanal') return 'Semanal'
  if (t === 'quincenal') return 'Quincenal'
  return 'Mensual'
}

function labelDiaPago(venta: Venta): string {
  const t = venta.tipo_plazo || 'mensual'
  if (t === 'semanal' && venta.dia_pago_semanal !== undefined && venta.dia_pago_semanal !== null) {
    return NOMBRES_DIAS[venta.dia_pago_semanal] ?? `Día ${venta.dia_pago_semanal}`
  }
  if (t === 'mensual' && venta.dia_pago_mensual !== undefined && venta.dia_pago_mensual !== null) {
    return `Día ${venta.dia_pago_mensual} de cada mes`
  }
  if (t === 'quincenal' && venta.fecha_inicio_quincenal) {
    return `Cada 15 días desde ${formatDateCustom(venta.fecha_inicio_quincenal, 'dd/MM/yyyy')}`
  }
  if (t === 'diario') return 'Todos los días'
  return '—'
}

export default function PrestamosActivosPage() {
  const { loading: companiaLoading, compania } = useCompania()
  const [list, setList] = useState<VentaConResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const todas = await ventasService.getAll()
      const activas = todas.filter((v) => (Number(v.saldo_pendiente) ?? 0) > 0)
      const ids = activas.map((v) => v.id)

      let cuotasPorVenta: Record<string, number> = {}
      if (ids.length > 0) {
        const { data: pagos } = await supabase
          .from('pagos')
          .select('venta_id, numero_cuota')
          .in('venta_id', ids)
        const byVenta: Record<string, Set<number>> = {}
        for (const p of pagos || []) {
          if (p.numero_cuota == null) continue
          if (!byVenta[p.venta_id]) byVenta[p.venta_id] = new Set()
          byVenta[p.venta_id].add(Number(p.numero_cuota))
        }
        for (const id of ids) {
          cuotasPorVenta[id] = byVenta[id]?.size ?? 0
        }
      }

      const conResumen: VentaConResumen[] = activas
        .map((v) => ({
          ...v,
          cuotasPagadas: cuotasPorVenta[v.id] ?? 0,
        }))
        .sort((a, b) => new Date(b.fecha_venta).getTime() - new Date(a.fecha_venta).getTime())

      setList(conResumen)
    } catch (e: any) {
      setError(e?.message || 'Error al cargar préstamos activos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (companiaLoading || !compania) {
      if (!companiaLoading && !compania) setLoading(false)
      return
    }
    load()
  }, [companiaLoading, compania, load])

  if (companiaLoading || loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-500">Cargando préstamos activos...</p>
      </div>
    )
  }

  if (!compania) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-amber-700">No tienes empresa asignada. Asigna una para ver los préstamos.</p>
        <Link href="/dashboard">
          <Button className="mt-4">Volver al Dashboard</Button>
        </Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600">{error}</p>
        <Button className="mt-4" onClick={() => load()}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="w-7 h-7 text-primary-500" />
          Préstamos Activos
        </h1>
        <p className="text-sm text-gray-600">
          {list.length} préstamo{list.length !== 1 ? 's' : ''} con saldo pendiente
        </p>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No hay préstamos activos con saldo pendiente.</p>
          <Link href="/ventas/nuevo">
            <Button className="mt-4">Nuevo préstamo</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Frecuencia
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Día de pago
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cuotas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Saldo restante
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((venta) => {
                  const cliente = venta.cliente
                  const nombreCliente = cliente
                    ? (cliente.nombre_completo?.trim() || [cliente.nombre, cliente.apellido].filter(Boolean).join(' ').trim() || cliente.email || '—')
                    : '—'
                  const telefono = cliente?.celular?.trim() || cliente?.telefono?.trim() || '—'
                  return (
                    <tr key={venta.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{nombreCliente}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {telefono}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {labelFrecuencia(venta)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {labelDiaPago(venta)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">
                            {venta.cuotasPagadas} / {venta.cantidad_cuotas}
                          </span>
                          <span className="text-gray-500 text-sm">pagadas</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          {formatCurrency(Number(venta.saldo_pendiente))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/ventas/${venta.id}/amortizacion`}
                          className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-sm"
                        >
                          Ver detalle
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
