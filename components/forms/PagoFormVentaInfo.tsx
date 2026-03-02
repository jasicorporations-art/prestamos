'use client'

import type { Venta } from '@/types'
import type { ProximoVencimientoResult } from '@/lib/services/proximoVencimiento'
import type { OpcionesCobro } from '@/lib/services/mora'

interface PagoFormVentaInfoProps {
  venta: Venta
  pagosExistentes: Array<{ numero_cuota?: number | null }>
  cuotasDetalladas: Array<{ numero_cuota: number; cuota_fija?: number }>
  tipoPago: 'cuota_del_dia' | 'total_al_dia' | 'completo'
  cantidadCuotasPagar: number
  monto: number
  cargosMoraPendientes: number
  opcionesCobro: OpcionesCobro | null
  proximoVencimiento: ProximoVencimientoResult | null
  proximoDespuesDePagar: ProximoVencimientoResult | null
  cargandoPagos: boolean
}

export function PagoFormVentaInfo({
  venta,
  pagosExistentes,
  cuotasDetalladas,
  tipoPago,
  cantidadCuotasPagar,
  monto,
  cargosMoraPendientes,
  opcionesCobro,
  proximoVencimiento,
  proximoDespuesDePagar,
  cargandoPagos,
}: PagoFormVentaInfoProps) {
  const cuotasPagadasSet = new Set(
    pagosExistentes.map((p) => p.numero_cuota).filter((n): n is number => n !== null && n !== undefined)
  )
  const cuotasPendientes = cuotasDetalladas
    .filter((c) => !cuotasPagadasSet.has(c.numero_cuota))
    .sort((a, b) => (a.numero_cuota || 0) - (b.numero_cuota || 0))
  const numeroCuotasPendientesAntes =
    cuotasPendientes.length > 0
      ? cuotasPendientes.length
      : venta.saldo_pendiente <= 0
        ? 0
        : Math.max(0, (venta.cantidad_cuotas || 0) - cuotasPagadasSet.size)
  const saldoPendiente = venta.saldo_pendiente
  const valorCuotaActual =
    cuotasPendientes.length > 0
      ? Number(cuotasPendientes[0].cuota_fija || 0)
      : numeroCuotasPendientesAntes > 0
        ? Math.round((saldoPendiente / numeroCuotasPendientesAntes) * 100) / 100
        : saldoPendiente
  let montoCalculado = 0
  if (tipoPago === 'completo') {
    montoCalculado = saldoPendiente + cargosMoraPendientes
  } else if (opcionesCobro) {
    montoCalculado = tipoPago === 'total_al_dia' ? opcionesCobro.totalParaPonerseAlDia : opcionesCobro.cuotaDelDia
  } else {
    const cuotasAPagar = cuotasPendientes.slice(0, Math.max(1, cantidadCuotasPagar))
    const totalCuotas = cuotasAPagar.reduce((s: number, c: any) => s + Number(c.cuota_fija || 0), 0)
    montoCalculado = Math.min(totalCuotas || valorCuotaActual * cantidadCuotasPagar, saldoPendiente) + cargosMoraPendientes
  }
  const nuevoSaldo = saldoPendiente - (monto || montoCalculado)
  const modeloTexto = venta.motor?.modelo ? '- ' + venta.motor.modelo : ''

  return (
    <div className="bg-gray-50 p-4 rounded-md space-y-2">
      <p className="text-sm text-gray-600">
        <strong>Cliente:</strong> {venta.cliente?.nombre_completo}
      </p>
      <p className="text-sm text-gray-600">
        <strong>Producto:</strong> {venta.motor?.marca} {modeloTexto} ({venta.motor?.numero_chasis})
      </p>
      <p className="text-sm text-gray-600">
        <strong>Monto Total:</strong> {'$' + venta.monto_total.toLocaleString('es-DO')}
      </p>
      <p className="text-sm text-gray-600">
        <strong>Saldo Pendiente:</strong> {'$' + saldoPendiente.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p className="text-sm text-gray-600">
        <strong>Valor por Cuota Actual:</strong> {'$' + valorCuotaActual.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      {cargosMoraPendientes > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded mt-2">
          <p className="text-sm text-red-800 font-medium">⚠️ Cargos por Mora Pendientes</p>
          <p className="text-xs text-red-700 mt-1">
            El cliente debe pagar la cuota + <strong>todos</strong> los cargos por mora para poder registrar el pago. No se aceptan pagos parciales que excluyan el mora.
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-red-700">
              <strong>Cargos por mora:</strong> {'$' + cargosMoraPendientes.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-red-700">
              <strong>Monto cuotas:</strong>{' '}
              {'$' +
                (tipoPago === 'completo'
                  ? saldoPendiente
                  : opcionesCobro
                    ? tipoPago === 'total_al_dia'
                      ? opcionesCobro.montoAtrasado
                      : opcionesCobro.valorCuota
                    : Math.min(
                        cuotasPendientes.slice(0, Math.max(1, cantidadCuotasPagar)).reduce((s: number, c: any) => s + Number(c.cuota_fija || 0), 0) ||
                          valorCuotaActual * cantidadCuotasPagar,
                        saldoPendiente
                      )
                ).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-red-800 font-semibold">
              <strong>Total a pagar:</strong> {'$' + (monto || montoCalculado).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}
      <p className="text-sm text-gray-600">
        <strong>Cuotas Restantes:</strong> {numeroCuotasPendientesAntes}
      </p>
      {proximoVencimiento?.fecha && (
        <p className="text-sm text-gray-700">
          <strong>Próximo vencimiento:</strong> {proximoVencimiento.fecha.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })}
          {proximoVencimiento.numeroCuota != null && (
            <span className="text-gray-500"> (Cuota {proximoVencimiento.numeroCuota})</span>
          )}
        </p>
      )}
      {(tipoPago === 'cuota_del_dia' || tipoPago === 'total_al_dia') && cantidadCuotasPagar >= 1 && proximoDespuesDePagar?.fecha && (
        <div className="mt-2 p-2 rounded bg-green-50 border border-green-200">
          <p className="text-sm text-green-800 font-medium">
            Al registrar este pago ({cantidadCuotasPagar} {cantidadCuotasPagar === 1 ? 'cuota' : 'cuotas'}), su próximo vencimiento será:{' '}
            {proximoDespuesDePagar.fecha.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      )}
      {cargandoPagos && <p className="text-xs text-gray-500 italic">Cargando información de pagos...</p>}
      {monto && monto > valorCuotaActual && nuevoSaldo > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded mt-2">
          <p className="text-sm text-blue-800 font-medium">💰 Pago Mayor a la Cuota (Pago a Capital)</p>
          <p className="text-xs text-blue-700 mt-1">
            {'Al pagar $' +
              monto.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
              ', estás pagando parte del capital. El saldo pendiente se reducirá y podrás terminar el préstamo antes.'}
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-blue-700">
              <strong>Nuevo saldo:</strong> {'$' + nuevoSaldo.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
