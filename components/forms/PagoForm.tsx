'use client'

/**
 * Lógica de cobro:
 * - Total a pagar = (cuotas atrasadas × valor por cuota) + cargos por mora
 * - Ej: diario 300, 4 días atrasado → 1,200 + mora
 * - Ej: semanal/mensual 5, 6 cuotas atrasadas → 30 + mora
 * - Si el cliente no tiene el monto completo, admin autoriza con su contraseña
 */
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { pagosService } from '@/lib/services/pagos'
import { getProximoVencimiento, getProximoVencimientoDespuesDePagar } from '@/lib/services/proximoVencimiento'
import type { ProximoVencimientoResult } from '@/lib/services/proximoVencimiento'
import { calcularTotalCargosMora, calcularOpcionesCobro, type OpcionesCobro } from '@/lib/services/mora'
import { supabase } from '@/lib/supabase'
import { Search, X } from 'lucide-react'
import { PagoFormVentaInfo } from './PagoFormVentaInfo'
import type { Venta } from '@/types'
import { authService } from '@/lib/services/auth'
import { executeWithOfflineFallback, isOnline } from '@/lib/utils/offlineHelper'
import {
  getLocationWithTimeout,
  checkGeolocationPermission,
  isSecureContext,
  type GeolocationPermission,
} from '@/lib/utils/geolocation'

const pagoSchema = z.object({
  venta_id: z.string().min(1, 'Debe seleccionar una venta'),
  monto: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  numero_cuota: z.number().optional(),
  fecha_pago: z.string().min(1, 'La fecha es requerida'),
})

type PagoFormData = z.infer<typeof pagoSchema>

interface PagoFormProps {
  ventas: Venta[]
  onSuccess: () => void
  onCancel: () => void
  /** Si se provee, pre-selecciona esta venta al abrir (útil para "Recoger Pago" desde ruta) */
  initialVentaId?: string
}

export function PagoForm({ ventas, onSuccess, onCancel, initialVentaId }: PagoFormProps) {
  const router = useRouter()
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null)
  const [pagoCreado, setPagoCreado] = useState<string | null>(null)
  const [siguienteCuota, setSiguienteCuota] = useState<number | null>(null)
  const [pagosExistentes, setPagosExistentes] = useState<any[]>([])
  const [cuotasDetalladas, setCuotasDetalladas] = useState<any[]>([])
  const [cargandoPagos, setCargandoPagos] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [tipoPago, setTipoPago] = useState<'cuota_del_dia' | 'total_al_dia' | 'completo'>('total_al_dia')
  const [cantidadCuotasPagar, setCantidadCuotasPagar] = useState<number>(1)
  const [opcionesCobro, setOpcionesCobro] = useState<OpcionesCobro | null>(null)
  const [proximoVencimiento, setProximoVencimiento] = useState<ProximoVencimientoResult | null>(null)
  const [proximoDespuesDePagar, setProximoDespuesDePagar] = useState<ProximoVencimientoResult | null>(null)
  const [cargosMoraPendientes, setCargosMoraPendientes] = useState<number>(0)
  const [gpsPermission, setGpsPermission] = useState<GeolocationPermission | 'checking'>('checking')
  const [gpsRequesting, setGpsRequesting] = useState(false)
  const [modalAutorizacionAbierto, setModalAutorizacionAbierto] = useState(false)
  const [autorizacionPassword, setAutorizacionPassword] = useState('')
  const [autorizacionError, setAutorizacionError] = useState('')
  const [datosPagoPendiente, setDatosPagoPendiente] = useState<{
    payload: {
      tipo: 'completo' | 'una' | 'multi'
      pagos: Array<{
        venta_id: string
        monto: number
        numero_cuota?: number
        fecha_pago: string
        latitud_cobro: number | null
        longitud_cobro: number | null
      }>
    }
    montoAPagar: number
    montoMinimoRequerido: number
    tipoPago: 'cuota_del_dia' | 'total_al_dia' | 'completo'
    cantidadCuotasPagar: number
    esCuotaDelDiaConAtraso?: boolean
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PagoFormData>({
    resolver: zodResolver(pagoSchema),
    defaultValues: {
      fecha_pago: new Date().toISOString().split('T')[0],
    },
  })

  const ventaId = watch('venta_id')
  const monto = watch('monto')

  async function enviarReciboWhatsApp(pagoId: string): Promise<{ ok: boolean; error?: string; sql_vincular?: string; sql_activar?: string; sql_todo?: string }> {
    try {
      const session = await authService.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch('/api/enviar-recibo-whatsapp', {
        method: 'POST',
        headers,
        body: JSON.stringify({ pago_id: pagoId }),
        credentials: 'include',
      })
      const text = await res.text()
      let data: { enviado?: boolean; error?: string; sql_vincular?: string; sql_activar?: string; sql_todo?: string } = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        return { ok: false, error: `Respuesta inválida (${res.status})` }
      }
      if (data.enviado) return { ok: true }
      return {
        ok: false,
        error: data.error || `Error ${res.status}`,
        sql_vincular: data.sql_vincular,
        sql_activar: data.sql_activar,
        sql_todo: data.sql_todo,
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error de conexión'
      return { ok: false, error: msg }
    }
  }

  /** Envía recibo por email (Resend). Fire-and-forget: no retrasa la PWA. Asegura enviar sesión (Bearer) para que la API no devuelva 401. */
  function enviarReciboEmail(pagoId: string): void {
    ;(async () => {
      try {
        const session = await authService.getSession()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
        const res = await fetch('/api/enviar-recibo-email', {
          method: 'POST',
          headers,
          body: JSON.stringify({ pago_id: pagoId }),
          credentials: 'include',
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          console.warn('[Recibo email] No enviado:', res.status, err?.error || err?.mensaje || res.statusText)
        }
      } catch (e) {
        console.warn('Email recibo (fire-and-forget):', e)
      }
    })()
  }

  // Verificar permiso de ubicación antes de mostrar el formulario de cobro
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isSecureContext()) {
      setGpsPermission('denied')
      return
    }
    checkGeolocationPermission().then(setGpsPermission)
  }, [])

  // Alerta si no está en HTTPS (el GPS requiere contexto seguro)
  useEffect(() => {
    if (typeof window !== 'undefined' && !isSecureContext()) {
      console.warn('⚠️ JASIPRESTAMOS: La app no está en HTTPS. El GPS no funcionará.')
      alert(
        '⚠️ JASIPRESTAMOS: La aplicación no está en un entorno seguro (HTTPS).\n\n' +
        'El GPS para registrar cobros solo funciona con conexión HTTPS.\n\n' +
        'Asegúrate de acceder a la app desde https://prestamos.jasicorporations.com'
      )
    }
  }, [])

  const handleSolicitarUbicacion = async () => {
    setGpsRequesting(true)
    const coords = await getLocationWithTimeout(15000)
    setGpsRequesting(false)
    if (coords) {
      setGpsPermission('granted')
    }
  }

  // Pre-seleccionar venta si se pasa initialVentaId (ej: desde "Recoger Pago" en ruta)
  useEffect(() => {
    if (initialVentaId && ventas.length > 0) {
      const venta = ventas.find((v) => v.id === initialVentaId)
      if (venta) {
        setValue('venta_id', venta.id)
        setVentaSeleccionada(venta)
        setBusqueda(`${venta.cliente?.nombre_completo || 'N/A'} - ${venta.motor?.marca} ${venta.motor?.modelo ? `- ${venta.motor.modelo}` : ''} (${venta.motor?.numero_chasis || venta.numero_prestamo || ''})`)
      }
    }
  }, [initialVentaId, ventas, setValue])

  // Filtrar ventas basándose en la búsqueda
  const ventasFiltradas = useMemo(() => {
    if (!busqueda.trim()) {
      return ventas
    }
    
    const busquedaLower = busqueda.toLowerCase().trim()
    return ventas.filter((venta) => {
      const nombreCliente = venta.cliente?.nombre_completo?.toLowerCase() || ''
      const marcaMotor = venta.motor?.marca?.toLowerCase() || ''
      const numeroPrestamo = venta.motor?.numero_chasis?.toLowerCase() || ''
      const numeroPrestamoCliente = venta.cliente?.numero_prestamo_cliente?.toLowerCase() || ''
      const cedulaCliente = venta.cliente?.cedula?.toLowerCase() || ''
      
      // Buscar en todos los campos, incluyendo número de préstamo del préstamo y del cliente
      return (
        nombreCliente.includes(busquedaLower) ||
        marcaMotor.includes(busquedaLower) ||
        numeroPrestamo.includes(busquedaLower) ||
        numeroPrestamoCliente.includes(busquedaLower) ||
        cedulaCliente.includes(busquedaLower)
      )
    })
  }, [busqueda, ventas])

  function handleSeleccionarVenta(venta: Venta) {
    setValue('venta_id', venta.id)
    setVentaSeleccionada(venta)
    setBusqueda(`${venta.cliente?.nombre_completo || 'N/A'} - ${venta.motor?.marca} ${venta.motor?.matricula}`)
    setMostrarResultados(false)
  }

  async function handleConfirmarAutorizacionParcial() {
    if (!datosPagoPendiente) return
    setAutorizacionError('')
    if (!autorizacionPassword.trim()) {
      setAutorizacionError('Ingrese su contraseña')
      return
    }
    try {
      const res = await fetch('/api/verificar-autorizacion-parcial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: autorizacionPassword.trim() }),
      })
      const data = await res.json()
      if (!data.ok) {
        setAutorizacionError(data.error || 'No autorizado')
        return
      }
      const { payload, montoAPagar, tipoPago, cantidadCuotasPagar } = datosPagoPendiente
      const pagosConAuth = payload.pagos.map((p) => ({ ...p, autorizado_por_admin: true }))
      let pagoCreado: { id: string } | null = null
      for (const pagoData of pagosConAuth) {
        pagoCreado = await executeWithOfflineFallback(
          () => pagosService.create(pagoData),
          { type: 'create', entity: 'pago', data: pagoData }
        )
      }
      setModalAutorizacionAbierto(false)
      setDatosPagoPendiente(null)
      setAutorizacionPassword('')
      if (pagoCreado && isOnline()) {
        enviarReciboEmail(pagoCreado.id)
        const waResult = await enviarReciboWhatsApp(pagoCreado.id)
        onSuccess()
        const msgWa = waResult.ok ? '\n\n📱 Recibo enviado por WhatsApp.' : waResult.error ? `\n\n⚠️ WhatsApp: ${waResult.error}` : ''
        alert(`✅ Pago parcial autorizado y registrado.\n\nMonto: $${montoAPagar.toLocaleString('es-DO', { minimumFractionDigits: 2 })}${msgWa}`)
        if (pagoCreado?.id) window.open(`/pagos/${pagoCreado.id}/recibo`, '_blank')
      } else if (!isOnline()) {
        alert('📴 Sin conexión. El pago se guardó offline.')
        onSuccess()
      }
    } catch (e) {
      setAutorizacionError(e instanceof Error ? e.message : 'Error al verificar')
    }
  }

  function handleLimpiarBusqueda() {
    setBusqueda('')
    setValue('venta_id', '')
    setVentaSeleccionada(null)
    setMostrarResultados(false)
  }

  useEffect(() => {
    if (ventaId) {
      const venta = ventas.find((v) => v.id === ventaId)
      setVentaSeleccionada(venta || null)
      
      // Actualizar el campo de búsqueda con la información de la venta seleccionada
      if (venta) {
        setBusqueda(`${venta.cliente?.nombre_completo || 'N/A'} - ${venta.motor?.marca} ${venta.motor?.modelo ? `- ${venta.motor.modelo}` : ''} (${venta.motor?.numero_chasis})`)
      }
      
      // Cargar los pagos existentes para calcular correctamente el valor de cuota
      if (venta) {
        setCargandoPagos(true)
        Promise.all([
          pagosService.getSiguienteNumeroCuota(venta.id),
          pagosService.getByVenta(venta.id),
          supabase
            .from('cuotas_detalladas')
            .select('numero_cuota, cuota_fija, saldo_pendiente, fecha_pago')
            .eq('venta_id', venta.id)
            .order('numero_cuota', { ascending: true }),
          getProximoVencimiento(venta.id),
          calcularTotalCargosMora(venta.id),
          calcularOpcionesCobro(venta.id),
        ])
          .then(([numero, pagos, cuotasResponse, proximo, totalMora, opciones]) => {
            setSiguienteCuota(numero)
            setValue('numero_cuota', numero)
            setPagosExistentes(pagos || [])
            setCuotasDetalladas((cuotasResponse as any)?.data || [])
            setProximoVencimiento(proximo ?? null)
            setCargosMoraPendientes(totalMora || 0)
            setOpcionesCobro(opciones || null)
            console.log('💰 [PagoForm] Opciones cobro:', opciones)
            
            const cuotasPagadasSet = new Set(
              (pagos || [])
                .map((p: any) => p.numero_cuota)
                .filter((n: any): n is number => n !== null && n !== undefined)
            )
            const pendientes = ((cuotasResponse as any)?.data || []).filter(
              (cuota: any) => !cuotasPagadasSet.has(cuota.numero_cuota)
            )
            // Monto por cuota: usar cuota_fija de cuotas_detalladas o calcular saldo_pendiente / cuotas restantes
            const cuotasPendientesCount = Math.max(0, (venta.cantidad_cuotas || 0) - cuotasPagadasSet.size)
            const valorCuotaActual =
              pendientes.length > 0
                ? Number(pendientes[0].cuota_fija || 0)
                : cuotasPendientesCount > 0
                  ? Number((venta.saldo_pendiente || 0) / cuotasPendientesCount)
                  : Number(venta.saldo_pendiente || 0)

            // Monto según Apartado A, B o Completo (defecto: Total para Ponerse al Día)
            if (tipoPago === 'completo') {
              setValue('monto', venta.saldo_pendiente + (totalMora || 0))
            } else if (opciones) {
              const montoOpcion = tipoPago === 'total_al_dia' ? opciones.totalParaPonerseAlDia : opciones.cuotaDelDia
              const cantidad = tipoPago === 'total_al_dia'
                ? Math.max(1, opciones.cuotasVencidas)
                : 1
              setCantidadCuotasPagar(cantidad)
              setValue('monto', Math.round(montoOpcion * 100) / 100)
            } else {
              const montoFallback = venta.saldo_pendiente + (totalMora || 0)
              setValue('monto', montoFallback)
            }
            
            // Resetear cantidad de cuotas si es mayor a las disponibles
            if (pendientes.length > 0 && cantidadCuotasPagar > pendientes.length) {
              const cant = tipoPago === 'total_al_dia' && opciones?.cuotasVencidas
                ? Math.min(opciones.cuotasVencidas, pendientes.length)
                : Math.min(cantidadCuotasPagar, pendientes.length)
              setCantidadCuotasPagar(Math.max(1, cant))
            }
          })
          .catch(error => {
            console.error('Error obteniendo datos de pagos:', error)
            setSiguienteCuota(null)
            setPagosExistentes([])
            setCuotasDetalladas([])
            setProximoVencimiento(null)
            setCargosMoraPendientes(0)
          })
          .finally(() => {
            setCargandoPagos(false)
          })
      }
    } else {
      setVentaSeleccionada(null)
      setSiguienteCuota(null)
      setPagosExistentes([])
      setProximoVencimiento(null)
      setProximoDespuesDePagar(null)
      setOpcionesCobro(null)
    }
  }, [ventaId, ventas, setValue, tipoPago, cantidadCuotasPagar])

  // Calcular próximo vencimiento después de pagar N cuotas (salto de cuotas)
  useEffect(() => {
    const saldo = ventaSeleccionada?.saldo_pendiente ?? 0
    if (!ventaId || saldo <= 0) {
      setProximoDespuesDePagar(null)
      return
    }
    if (tipoPago === 'completo') {
      setProximoDespuesDePagar(null)
      return
    }
    const cant = tipoPago === 'total_al_dia' && opcionesCobro?.cuotasVencidas
      ? Math.max(1, opcionesCobro.cuotasVencidas)
      : cantidadCuotasPagar
    getProximoVencimientoDespuesDePagar(ventaId, cant).then(setProximoDespuesDePagar)
  }, [ventaId, ventaSeleccionada?.saldo_pendiente, tipoPago, cantidadCuotasPagar, opcionesCobro?.cuotasVencidas])

  // Actualizar monto cuando cambia tipoPago (Apartado A, B o Completo)
  useEffect(() => {
    if (!ventaSeleccionada || ventaSeleccionada.saldo_pendiente <= 0) return
    if (tipoPago === 'completo') {
      setValue('monto', ventaSeleccionada.saldo_pendiente + cargosMoraPendientes)
      return
    }
    if (opcionesCobro) {
      const monto = tipoPago === 'total_al_dia' ? opcionesCobro.totalParaPonerseAlDia : opcionesCobro.cuotaDelDia
      const cant = tipoPago === 'total_al_dia' ? Math.max(1, opcionesCobro.cuotasVencidas) : 1
      setCantidadCuotasPagar(cant)
      setValue('monto', Math.round(monto * 100) / 100)
    }
  }, [tipoPago, ventaSeleccionada, setValue, cargosMoraPendientes, opcionesCobro])

  // Cerrar el dropdown cuando se hace clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (!target.closest('.buscador-ventas')) {
        setMostrarResultados(false)
      }
    }

    if (mostrarResultados) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [mostrarResultados])

  async function onSubmit(data: PagoFormData) {
    if (submitting) {
      console.warn('⚠️ [PagoForm] Envío bloqueado - evitar doble cobro')
      return
    }
    setSubmitting(true)
    try {
      if (!ventaSeleccionada) {
        alert('Debe seleccionar una venta')
        return
      }

      // Captura de GPS con alta precisión (15s timeout para exteriores)
      const coords = await getLocationWithTimeout(15000)

      // Verificar que la caja esté abierta antes de registrar un pago
      try {
        const { cajasService } = await import('@/lib/services/cajas')
        const cajaAbierta = await cajasService.estaCajaAbierta()
        if (!cajaAbierta) {
          alert('⚠️ No puedes registrar pagos porque la caja está cerrada.\n\nUn admin debe abrir la caja en "Admin/Cajas" antes de continuar.')
          return
        }
      } catch (error) {
        console.error('Error verificando estado de caja:', error)
        alert('No se pudo verificar el estado de la caja. Intenta nuevamente o contacta al administrador.')
        return
      }

      // Obtener la venta actualizada desde la base de datos para tener el saldo pendiente real
      let ventaActualizada = ventaSeleccionada
      try {
        const { ventasService } = await import('@/lib/services/ventas')
        const ventaDB = await ventasService.getById(ventaSeleccionada.id)
        if (ventaDB) {
          ventaActualizada = ventaDB
          console.log('🔄 [PagoForm] Venta actualizada desde DB:', {
            saldo_pendiente: ventaActualizada.saldo_pendiente,
            saldo_anterior: ventaSeleccionada.saldo_pendiente
          })
        }
      } catch (error) {
        console.warn('⚠️ [PagoForm] No se pudo obtener venta actualizada, usando la del estado:', error)
      }

      // Obtener cargos por mora y opciones de cobro actualizados
      let cargosMoraActuales = 0
      let opcionesCobroActuales: OpcionesCobro | null = null
      try {
        cargosMoraActuales = await calcularTotalCargosMora(ventaActualizada.id)
        opcionesCobroActuales = await calcularOpcionesCobro(ventaActualizada.id)
        console.log('💰 [PagoForm] Cargos por mora:', cargosMoraActuales, 'Opciones:', opcionesCobroActuales)
      } catch (error) {
        console.error('❌ [PagoForm] Error obteniendo cargos/opciones:', error)
        cargosMoraActuales = cargosMoraPendientes || 0
        opcionesCobroActuales = opcionesCobro
      }

      // Monto a pagar según tipo seleccionado
      let montoAPagar = data.monto
      if (tipoPago === 'completo') {
        montoAPagar = ventaActualizada.saldo_pendiente + cargosMoraActuales
      } else if (tipoPago === 'cuota_del_dia' || tipoPago === 'total_al_dia') {
        // Usar monto del formulario (ya viene de opcionesCobro); solo ajustar si mora cambió
        if (cargosMoraActuales !== cargosMoraPendientes && Math.abs(cargosMoraActuales - cargosMoraPendientes) > 0.01) {
          const opcionesActuales = await calcularOpcionesCobro(ventaActualizada.id)
          montoAPagar = tipoPago === 'total_al_dia' ? opcionesActuales.totalParaPonerseAlDia : opcionesActuales.cuotaDelDia
        }
      }

      console.log('💰 [PagoForm] Monto a pagar:', {
        tipoPago,
        montoFormulario: data.monto,
        montoAPagar,
        saldoPendiente: ventaActualizada.saldo_pendiente,
        cargosMora: cargosMoraActuales,
        cargosMoraPendientes: cargosMoraPendientes
      })

      // El monto puede ser mayor que el saldo pendiente si incluye cargos por mora
      const montoMaximoPermitido = ventaActualizada.saldo_pendiente + cargosMoraActuales
      if (montoAPagar > montoMaximoPermitido) {
        alert(`El monto excede el máximo permitido de $${montoMaximoPermitido.toLocaleString('es-DO')} (saldo pendiente + cargos por mora)`)
        return
      }

      if (montoAPagar <= 0) {
        alert('El monto debe ser mayor a 0')
        return
      }

      // Crear fecha con hora local actual para evitar problemas de zona horaria
      // Parsear la fecha como fecha local (no UTC) para evitar que cambie el día
      const [year, month, day] = data.fecha_pago.split('-').map(Number)
      const fechaPago = new Date(year, month - 1, day) // month - 1 porque Date usa 0-11 para meses
      
      // Agregar la hora actual local
      const ahora = new Date()
      fechaPago.setHours(ahora.getHours(), ahora.getMinutes(), ahora.getSeconds(), ahora.getMilliseconds())
      
      // Calcular cuántas cuotas se están pagando
      const cuotasPagadasSet = new Set(
        pagosExistentes
          .map(p => p.numero_cuota)
          .filter((n): n is number => n !== null && n !== undefined)
      )
      const cuotasPagadas = cuotasPagadasSet.size
      const cuotasPendientesOrdenadas = cuotasDetalladas
        .filter((cuota: any) => !cuotasPagadasSet.has(cuota.numero_cuota))
        .sort((a: any, b: any) => (a.numero_cuota || 0) - (b.numero_cuota || 0))
      const numeroCuotasPendientes = cuotasPendientesOrdenadas.length > 0
        ? cuotasPendientesOrdenadas.length
        : ventaSeleccionada.saldo_pendiente <= 0 
          ? 0 
          : Math.max(0, ventaSeleccionada.cantidad_cuotas - cuotasPagadas)
      const valorCuotaActual = cuotasPendientesOrdenadas.length > 0
        ? Number(cuotasPendientesOrdenadas[0].cuota_fija || 0)
        : numeroCuotasPendientes > 0 
          ? Math.round((ventaSeleccionada.saldo_pendiente / numeroCuotasPendientes) * 100) / 100
          : ventaSeleccionada.saldo_pendiente

      // Pagos parciales permitidos: cualquier monto entre 0.01 y (saldo+mora) se acepta sin autorización.

      // Si es pago completo, crear un solo pago que salda todo
      if (tipoPago === 'completo') {
        const pagoData = {
          venta_id: data.venta_id,
          monto: montoAPagar, // Usar el monto calculado (saldo pendiente actualizado)
          numero_cuota: undefined, // No especificar número de cuota - el servicio asignará automáticamente
          fecha_pago: fechaPago.toISOString(),
          latitud_cobro: coords?.lat ?? null,
          longitud_cobro: coords?.lng ?? null,
        }

        console.log('💰 [PagoForm] Registrando pago completo:', {
          ...pagoData,
          saldoPendienteVenta: ventaActualizada.saldo_pendiente,
          montoFormulario: data.monto,
          montoAPagar
        })

        try {
          const pagoCreado = await executeWithOfflineFallback(
            () => {
              console.log('🚀 [PagoForm] Llamando a pagosService.create...')
              return pagosService.create(pagoData)
            },
            {
              type: 'create',
              entity: 'pago',
              data: pagoData,
            }
          )
          
          console.log('✅ [PagoForm] Pago completo creado exitosamente:', pagoCreado)
          
          // Si llegamos aquí, la operación fue exitosa (online o guardada offline)
          if (isOnline()) {
            console.log('✅ [PagoForm] Pago completo registrado exitosamente. Abriendo recibo para imprimir...')
            enviarReciboEmail(pagoCreado.id)
            let waResult: { ok: boolean; error?: string; sql_vincular?: string; sql_activar?: string; sql_todo?: string } = { ok: false }
            try {
              waResult = await enviarReciboWhatsApp(pagoCreado.id)
            } catch (waErr) {
              console.warn('WhatsApp recibo:', waErr)
              waResult = { ok: false, error: waErr instanceof Error ? waErr.message : 'Error' }
            }
            
            // Cerrar el modal primero
            onSuccess()
            
            // Mostrar mensaje de éxito
            setTimeout(() => {
              const msgWa = waResult.ok
                ? '\n\n📱 Recibo enviado por WhatsApp al cliente.'
                : `\n\n⚠️ Recibo WhatsApp no enviado: ${waResult.error || 'Error desconocido'}`
              alert(`✅ Pago completo registrado exitosamente.\n\nTotal pagado: $${montoAPagar.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nPréstamo saldado completamente.${msgWa}`)
            }, 100)
            
            // Abrir el recibo inmediatamente en una nueva pestaña para imprimir
            if (pagoCreado?.id) {
              setTimeout(() => {
                try {
                  const reciboUrl = `/pagos/${pagoCreado.id}/recibo`
                  console.log('📄 [PagoForm] Abriendo recibo en nueva pestaña:', reciboUrl)
                  window.open(reciboUrl, '_blank')
                } catch (error) {
                  console.error('❌ [PagoForm] Error abriendo recibo:', error)
                  window.location.href = `/pagos/${pagoCreado.id}/recibo`
                }
              }, 400)
            }
          } else {
            alert('📴 Sin conexión. El pago se guardó offline y se sincronizará automáticamente cuando regrese el internet.')
            onSuccess()
          }
          return
        } catch (pagoError: any) {
          console.error('❌ [PagoForm] Error específico creando pago completo:', pagoError)
          console.error('❌ [PagoForm] Error detalles:', {
            message: pagoError?.message,
            code: pagoError?.code,
            details: pagoError?.details,
            hint: pagoError?.hint,
            stack: pagoError?.stack
          })
          
          // Si es un error de offline, mostrar mensaje diferente
          if (pagoError?.message?.includes('offline') || pagoError?.message?.includes('Sin conexión')) {
            alert('📴 Sin conexión. El pago se guardó offline y se sincronizará automáticamente cuando regrese el internet.')
            onSuccess()
            return
          }
          
          // Mostrar alerta con más detalles para debugging
          const errorMessage = pagoError?.message || 'Error desconocido al crear el pago'
          const errorCode = pagoError?.code ? ` (Código: ${pagoError.code})` : ''
          const errorHint = pagoError?.hint ? `\n\nSugerencia: ${pagoError.hint}` : ''
          alert(`❌ Error al crear el pago:\n\n${errorMessage}${errorCode}${errorHint}\n\nPor favor, revisa la consola (F12) para más detalles.`)
          
          // Re-lanzar el error para que se capture en el catch general
          throw pagoError
        }
      }
      
      // Si solo es una cuota, crear un solo pago (usar montoAPagar que incluye mora actualizado)
      if (cantidadCuotasPagar === 1) {
        const pagoData = {
          venta_id: data.venta_id,
          monto: montoAPagar,
          numero_cuota: data.numero_cuota || siguienteCuota || undefined,
          fecha_pago: fechaPago.toISOString(),
          latitud_cobro: coords?.lat ?? null,
          longitud_cobro: coords?.lng ?? null,
        }

        try {
          const pagoCreado = await executeWithOfflineFallback(
            () => pagosService.create(pagoData),
            {
              type: 'create',
              entity: 'pago',
              data: pagoData,
            }
          )
          
          // Si llegamos aquí, la operación fue exitosa (online o guardada offline)
          if (isOnline()) {
            console.log('✅ Pago creado exitosamente. Abriendo recibo para imprimir...')
            if (pagoCreado?.id) enviarReciboEmail(pagoCreado.id)
            let waResult: { ok: boolean; error?: string; sql_vincular?: string; sql_activar?: string; sql_todo?: string } = { ok: false }
            try {
              waResult = pagoCreado?.id ? await enviarReciboWhatsApp(pagoCreado.id) : { ok: false }
            } catch (waErr) {
              console.warn('WhatsApp recibo:', waErr)
              waResult = { ok: false, error: waErr instanceof Error ? waErr.message : 'Error' }
            }
            
            // Cerrar el modal primero (el pago ya está guardado)
            onSuccess()
            
            // Mostrar aviso de WhatsApp
            setTimeout(() => {
              if (waResult.ok) {
                alert('📱 Recibo enviado por WhatsApp al cliente.')
              } else if (waResult.error) {
                let msg = `⚠️ Pago registrado correctamente.\n\nEl recibo por WhatsApp no se envió: ${waResult.error}`
                if (waResult.sql_todo) msg += `\n\nCopia y ejecuta en Supabase > SQL Editor (tal cual, con comillas y user_id con guión bajo):\n\n${waResult.sql_todo}`
                else {
                  if (waResult.sql_vincular) msg += `\n\n1. Vincular perfil:\n${waResult.sql_vincular}`
                  if (waResult.sql_activar) msg += `\n\n2. Activar WhatsApp:\n${waResult.sql_activar}`
                }
                alert(msg)
              }
            }, 200)
            
            // Abrir el recibo
            if (pagoCreado?.id) {
              setTimeout(() => {
                try {
                  window.open(`/pagos/${pagoCreado.id}/recibo`, '_blank')
                } catch {
                  window.location.href = `/pagos/${pagoCreado.id}/recibo`
                }
              }, 300)
            }
          } else {
            alert('📴 Sin conexión. El pago se guardó offline y se sincronizará automáticamente cuando regrese el internet.')
            onSuccess()
          }
          return
        } catch (pagoError: any) {
          console.error('❌ [PagoForm] Error creando pago de cuota única:', pagoError)
          
          // Si es un error de offline, mostrar mensaje diferente
          if (pagoError?.message?.includes('offline') || pagoError?.message?.includes('Sin conexión')) {
            alert('📴 Sin conexión. El pago se guardó offline y se sincronizará automáticamente cuando regrese el internet.')
            onSuccess()
            return
          }
          
          // Mostrar alerta con más detalles
          const errorMessage = pagoError?.message || 'Error desconocido al crear el pago'
          const errorCode = pagoError?.code ? ` (Código: ${pagoError.code})` : ''
          const errorHint = pagoError?.hint ? `\n\nSugerencia: ${pagoError.hint}` : ''
          alert(`❌ Error al crear el pago:\n\n${errorMessage}${errorCode}${errorHint}\n\nPor favor, revisa la consola (F12) para más detalles.`)
          throw pagoError
        }
      }
      
      // Si son múltiples cuotas, verificar si el monto alcanza para distribuirlo en varias cuotas.
      // Si el monto es parcial (menor al necesario), crear UN solo pago con el monto ingresado.
      const valorCuotaParaMinimo = numeroCuotasPendientes > 0
        ? ventaActualizada.saldo_pendiente / numeroCuotasPendientes
        : valorCuotaActual
      const montoMinimoPrimerPago = cargosMoraActuales > 0
        ? Math.round((valorCuotaParaMinimo + cargosMoraActuales) * 100) / 100
        : valorCuotaActual
      const montoMinimoParaMultiples = montoMinimoPrimerPago + Math.max(0, cantidadCuotasPagar - 1) * valorCuotaActual

      const esPagoParcial = cantidadCuotasPagar > 1 && montoAPagar < montoMinimoParaMultiples - 0.01

      // Si es pago parcial, crear un solo pago (igual que cantidadCuotasPagar === 1)
      if (esPagoParcial) {
        const pagoData = {
          venta_id: data.venta_id,
          monto: montoAPagar,
          numero_cuota: data.numero_cuota || siguienteCuota || undefined,
          fecha_pago: fechaPago.toISOString(),
          latitud_cobro: coords?.lat ?? null,
          longitud_cobro: coords?.lng ?? null,
        }

        try {
          const pagoCreado = await executeWithOfflineFallback(
            () => pagosService.create(pagoData),
            {
              type: 'create',
              entity: 'pago',
              data: pagoData,
            }
          )

          if (isOnline()) {
            console.log('✅ Pago parcial creado exitosamente.')
            if (pagoCreado?.id) enviarReciboEmail(pagoCreado.id)
            let waResult: { ok: boolean; error?: string; sql_vincular?: string; sql_activar?: string; sql_todo?: string } = { ok: false }
            try {
              waResult = pagoCreado?.id ? await enviarReciboWhatsApp(pagoCreado.id) : { ok: false }
            } catch (waErr) {
              console.warn('WhatsApp recibo:', waErr)
              waResult = { ok: false, error: waErr instanceof Error ? waErr.message : 'Error' }
            }

            onSuccess()

            setTimeout(() => {
              if (waResult.ok) {
                alert('📱 Recibo enviado por WhatsApp al cliente.')
              } else if (waResult.error) {
                let msg = `⚠️ Pago registrado correctamente.\n\nEl recibo por WhatsApp no se envió: ${waResult.error}`
                if (waResult.sql_todo) msg += `\n\nCopia y ejecuta en Supabase > SQL Editor (tal cual, con comillas y user_id con guión bajo):\n\n${waResult.sql_todo}`
                else {
                  if (waResult.sql_vincular) msg += `\n\n1. Vincular perfil:\n${waResult.sql_vincular}`
                  if (waResult.sql_activar) msg += `\n\n2. Activar WhatsApp:\n${waResult.sql_activar}`
                }
                alert(msg)
              }
            }, 200)

            if (pagoCreado?.id) {
              setTimeout(() => {
                try {
                  window.open(`/pagos/${pagoCreado.id}/recibo`, '_blank')
                } catch {
                  window.location.href = `/pagos/${pagoCreado.id}/recibo`
                }
              }, 300)
            }
          } else {
            alert('📴 Sin conexión. El pago se guardó offline y se sincronizará automáticamente cuando regrese el internet.')
            onSuccess()
          }
          return
        } catch (pagoError: any) {
          console.error('❌ [PagoForm] Error creando pago parcial:', pagoError)
          if (pagoError?.message?.includes('offline') || pagoError?.message?.includes('Sin conexión')) {
            alert('📴 Sin conexión. El pago se guardó offline y se sincronizará automáticamente cuando regrese el internet.')
            onSuccess()
            return
          }
          const errorMessage = pagoError?.message || 'Error desconocido al crear el pago'
          const errorCode = pagoError?.code ? ` (Código: ${pagoError.code})` : ''
          const errorHint = pagoError?.hint ? `\n\nSugerencia: ${pagoError.hint}` : ''
          alert(`❌ Error al crear el pago:\n\n${errorMessage}${errorCode}${errorHint}\n\nPor favor, revisa la consola (F12) para más detalles.`)
          throw pagoError
        }
      }

      // Si son múltiples cuotas con monto suficiente, crear un pago por cada cuota
      const pagosACrear: Array<{ venta_id: string; monto: number; numero_cuota?: number; fecha_pago: string; latitud_cobro: number | null; longitud_cobro: number | null }> = []
      let siguienteNumeroCuota = siguienteCuota || 1

      // Primer pago: debe cubrir al menos una cuota + mora (pagosService exige eso cuando hay mora)
      const montoPrimerPago = cantidadCuotasPagar === 1
        ? montoAPagar
        : Math.min(
            montoAPagar,
            Math.max(
              montoMinimoPrimerPago,
              Math.round((montoAPagar - (cantidadCuotasPagar - 1) * valorCuotaActual) * 100) / 100
            )
          )
      let montoRestante = Math.round((montoAPagar - montoPrimerPago) * 100) / 100

      for (let i = 0; i < cantidadCuotasPagar; i++) {
        const cuotaDetalle = cuotasPendientesOrdenadas[i]
        const cuotaBase = Number(cuotaDetalle?.cuota_fija || valorCuotaActual)
        const montoPorCuota = i === 0
          ? montoPrimerPago
          : i === cantidadCuotasPagar - 1
            ? montoRestante // Última cuota toma el resto para redondeo
            : cuotaBase

        pagosACrear.push({
          venta_id: data.venta_id,
          monto: montoPorCuota,
          numero_cuota: cuotaDetalle?.numero_cuota ?? (siguienteNumeroCuota + i),
          fecha_pago: fechaPago.toISOString(),
          latitud_cobro: coords?.lat ?? null,
          longitud_cobro: coords?.lng ?? null,
        })
        if (i > 0 && i < cantidadCuotasPagar - 1) montoRestante -= montoPorCuota
      }
      
      // Crear todos los pagos
      const pagosCreados = []
      for (const pagoData of pagosACrear) {
        try {
          const pagoCreado = await executeWithOfflineFallback(
            () => pagosService.create(pagoData),
            {
              type: 'create',
              entity: 'pago',
              data: pagoData,
            }
          )
          pagosCreados.push(pagoCreado)
        } catch (pagoError: any) {
          console.error('❌ [PagoForm] Error creando pago múltiple:', pagoError)
          
          // Si es un error de offline, mostrar mensaje diferente
          if (pagoError?.message?.includes('offline') || pagoError?.message?.includes('Sin conexión')) {
            alert('📴 Sin conexión. El pago se guardó offline y se sincronizará automáticamente cuando regrese el internet.')
            onSuccess()
            return
          }
          
          // Mostrar alerta con más detalles
          const errorMessage = pagoError?.message || 'Error desconocido al crear el pago'
          const errorCode = pagoError?.code ? ` (Código: ${pagoError.code})` : ''
          const errorHint = pagoError?.hint ? `\n\nSugerencia: ${pagoError.hint}` : ''
          alert(`❌ Error al crear el pago (${pagosCreados.length + 1} de ${pagosACrear.length}):\n\n${errorMessage}${errorCode}${errorHint}\n\nPor favor, revisa la consola (F12) para más detalles.`)
          throw pagoError
        }
      }
      
      const primerPago = pagosCreados[0]
      
      // Si llegamos aquí, la operación fue exitosa (online o guardada offline)
      if (isOnline()) {
        console.log(`✅ ${pagosCreados.length} pago(s) creado(s) exitosamente.`)
        const ultimoPago = pagosCreados[pagosCreados.length - 1]
        if (ultimoPago?.id) enviarReciboEmail(ultimoPago.id)
        let waResult: { ok: boolean; error?: string; sql_vincular?: string; sql_activar?: string; sql_todo?: string } = { ok: false }
        try {
          waResult = ultimoPago?.id ? await enviarReciboWhatsApp(ultimoPago.id) : { ok: false }
        } catch (waErr) {
          console.warn('WhatsApp recibo:', waErr)
          waResult = { ok: false, error: waErr instanceof Error ? waErr.message : 'Error' }
        }
        
        // Cerrar el modal primero
        onSuccess()
        
        // Si se pagaron múltiples cuotas, mostrar mensaje
        if (cantidadCuotasPagar > 1) {
          setTimeout(() => {
            const msgWa = waResult.ok
              ? '\n\n📱 Recibo enviado por WhatsApp al cliente.'
              : waResult.error ? `\n\n⚠️ Recibo WhatsApp no enviado: ${waResult.error}` : ''
            alert(`✅ Se registraron ${cantidadCuotasPagar} pago(s) exitosamente.\n\nTotal pagado: $${montoAPagar.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nSe pagaron ${cantidadCuotasPagar} cuotas.${msgWa}`)
          }, 300)
        } else {
          // Abrir el recibo solo si es un solo pago
          if (waResult.ok) {
            setTimeout(() => alert('📱 Recibo enviado por WhatsApp al cliente.'), 250)
          } else if (waResult.error) {
            let msg = `⚠️ Recibo WhatsApp no enviado: ${waResult.error}`
            if (waResult.sql_todo) msg += `\n\nCopia y ejecuta en Supabase > SQL Editor (tal cual, con comillas y user_id con guión bajo):\n\n${waResult.sql_todo}`
            else {
              if (waResult.sql_vincular) msg += `\n\n1. Vincular perfil:\n${waResult.sql_vincular}`
              if (waResult.sql_activar) msg += `\n\n2. Activar WhatsApp:\n${waResult.sql_activar}`
            }
            setTimeout(() => alert(msg), 250)
          }
          if (primerPago?.id) {
            setTimeout(() => {
              try {
                const reciboUrl = `/pagos/${primerPago.id}/recibo`
                console.log('📄 Abriendo recibo en nueva pestaña:', reciboUrl)
                window.open(reciboUrl, '_blank')
              } catch (error) {
                console.error('Error abriendo recibo:', error)
                // Si falla, intentar navegar en la misma ventana
                window.location.href = `/pagos/${primerPago.id}/recibo`
              }
            }, 300)
          }
        }
      } else {
        alert('📴 Sin conexión. El pago se guardó offline y se sincronizará automáticamente cuando regrese el internet.')
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error creando pago:', error)
      
      // Si el error es de guardado offline, ya se mostró el mensaje
      if (error?.message?.includes('offline') || error?.message?.includes('Sin conexión')) {
        onSuccess() // Cerrar el formulario aunque se guardó offline
        return
      }
      
      alert(error.message || 'Error al crear el pago')
    } finally {
      setSubmitting(false)
    }
  }

  // Bloqueo: verificar permiso de ubicación antes de mostrar formulario
  if (gpsPermission === 'checking') {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500">Verificando permisos de ubicación...</p>
      </div>
    )
  }

  if (gpsPermission === 'denied' || gpsPermission === 'unsupported' || !isSecureContext()) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-6">
          <p className="text-amber-900 font-semibold mb-2">
            Para registrar un cobro, JASIPRESTAMOS necesita acceder a tu ubicación.
          </p>
          <p className="text-amber-800 text-sm mb-4">
            {!isSecureContext()
              ? 'La app no está en un entorno seguro (HTTPS). El GPS solo funciona con conexión segura.'
              : gpsPermission === 'denied'
                ? 'Rechazaste el permiso de ubicación. Para habilitarlo:'
                : 'La geolocalización no está disponible en este dispositivo.'}
          </p>
          {(gpsPermission === 'denied' || !isSecureContext()) && (
            <div className="text-left text-sm text-amber-900 bg-amber-100/50 rounded p-4 space-y-2">
              <p className="font-medium">Cómo activar la ubicación:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Chrome en Android:</strong> Configuración → Privacidad → Configuración del sitio → Ubicación → Permitir para este sitio</li>
                <li><strong>PWA instalada:</strong> Configuración de la app → Permisos → Ubicación → Permitir</li>
                <li><strong>Navegador:</strong> Toca el icono de candado/info en la barra de direcciones → Permisos → Ubicación</li>
              </ul>
              <p className="mt-2 text-xs">Después de activarlo, cierra y vuelve a abrir el formulario de cobro.</p>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        </div>
      </div>
    )
  }

  if (gpsPermission === 'prompt') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
          <p className="text-blue-900 font-semibold mb-2">
            Para registrar un cobro, JASIPRESTAMOS necesita acceder a tu ubicación.
          </p>
          <p className="text-blue-800 text-sm mb-4">
            Esto permite registrar dónde se realizó cada cobro para el mapa de rutas y reportes.
          </p>
          <Button
            onClick={handleSolicitarUbicacion}
            disabled={gpsRequesting}
          >
            {gpsRequesting ? 'Obteniendo ubicación...' : 'Permitir ubicación'}
          </Button>
        </div>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Campo oculto para el formulario */}
      <input type="hidden" {...register('venta_id')} />
      
      {/* Buscador de Clientes */}
      <div className="relative buscador-ventas">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Buscar Cliente / Venta
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setMostrarResultados(true)
              if (!e.target.value) {
                setValue('venta_id', '')
                setVentaSeleccionada(null)
              }
            }}
            onFocus={() => setMostrarResultados(true)}
            placeholder="Buscar por nombre, cédula, marca, número de producto o número de producto del cliente..."
            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
          {busqueda && (
            <button
              type="button"
              onClick={handleLimpiarBusqueda}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        
        {/* Resultados de búsqueda */}
        {mostrarResultados && busqueda.trim() && ventasFiltradas.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {ventasFiltradas.map((venta) => (
              <button
                key={venta.id}
                type="button"
                onClick={() => handleSeleccionarVenta(venta)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {venta.cliente?.nombre_completo || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {venta.motor?.marca} {venta.motor?.modelo ? '- ' + venta.motor.modelo : ''} ({venta.motor?.numero_chasis})
                      {venta.cliente?.numero_prestamo_cliente && (
                        <span className="ml-2">| Cliente: {venta.cliente.numero_prestamo_cliente}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-semibold text-gray-900">
                      ${venta.saldo_pendiente.toLocaleString('es-DO')}
                    </p>
                    <p className="text-xs text-gray-500">
                      Saldo pendiente
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        
        {mostrarResultados && busqueda.trim() && ventasFiltradas.length === 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg p-4">
            <p className="text-sm text-gray-500 text-center">
              No se encontraron préstamos emitidos con ese criterio de búsqueda
            </p>
          </div>
        )}
        
        {errors.venta_id && (
          <p className="mt-1 text-sm text-red-600">{errors.venta_id.message}</p>
        )}
      </div>

      {ventaSeleccionada && (
        <PagoFormVentaInfo
          venta={ventaSeleccionada}
          pagosExistentes={pagosExistentes}
          cuotasDetalladas={cuotasDetalladas}
          tipoPago={tipoPago}
          cantidadCuotasPagar={cantidadCuotasPagar}
          monto={monto || 0}
          cargosMoraPendientes={cargosMoraPendientes}
          opcionesCobro={opcionesCobro}
          proximoVencimiento={proximoVencimiento}
          proximoDespuesDePagar={proximoDespuesDePagar}
          cargandoPagos={cargandoPagos}
        />
      )}

      {ventaSeleccionada && ventaSeleccionada.saldo_pendiente > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Tipo de cobro</p>
          <div className="space-y-2">
            <label className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-gray-50 ${tipoPago === 'cuota_del_dia' ? 'border-primary-500 bg-primary-50/50' : 'border-gray-200'}`}>
              <input
                type="radio"
                name="tipoPago"
                checked={tipoPago === 'cuota_del_dia'}
                onChange={() => setTipoPago('cuota_del_dia')}
                className="text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <span className="font-medium text-gray-900">Cuota del día</span>
                <p className="text-xs text-gray-500">
                  {opcionesCobro
                    ? `1 cuota + mora = $${opcionesCobro.cuotaDelDia.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
                    : `Aprox. $${(ventaSeleccionada.saldo_pendiente / Math.max(1, ventaSeleccionada.cantidad_cuotas || 1) + cargosMoraPendientes).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
                </p>
              </div>
            </label>
            <label className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-gray-50 ${tipoPago === 'total_al_dia' ? 'border-primary-500 bg-primary-50/50' : 'border-gray-200'}`}>
              <input
                type="radio"
                name="tipoPago"
                checked={tipoPago === 'total_al_dia'}
                onChange={() => setTipoPago('total_al_dia')}
                className="text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <span className="font-medium text-gray-900">Total para ponerse al día</span>
                <p className="text-xs text-gray-500">
                  {opcionesCobro
                    ? `${opcionesCobro.cuotasVencidas} cuota(s) vencida(s) + mora = $${opcionesCobro.totalParaPonerseAlDia.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
                    : `Cuotas atrasadas + mora`}
                </p>
              </div>
            </label>
            <label className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-gray-50 ${tipoPago === 'completo' ? 'border-primary-500 bg-primary-50/50' : 'border-gray-200'}`}>
              <input
                type="radio"
                name="tipoPago"
                checked={tipoPago === 'completo'}
                onChange={() => setTipoPago('completo')}
                className="text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <span className="font-medium text-gray-900">Saldar todo / Pago completo</span>
                <p className="text-xs text-gray-500">
                  Saldo pendiente + mora = ${(ventaSeleccionada.saldo_pendiente + cargosMoraPendientes).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      <Input
        label="Monto del Pago"
        type="number"
        step="0.01"
        min="0.01"
        max={ventaSeleccionada ? ventaSeleccionada.saldo_pendiente + cargosMoraPendientes : undefined}
        {...register('monto', { valueAsNumber: true })}
        error={errors.monto?.message}
        disabled={tipoPago === 'completo' && ventaSeleccionada !== null}
      />

      <Input
        label={`Número de Cuota${siguienteCuota ? ` (Sugerida: ${siguienteCuota})` : ''}`}
        type="number"
        min="1"
        {...register('numero_cuota', { valueAsNumber: true, setValueAs: (v) => v === '' ? undefined : Number(v) })}
        error={errors.numero_cuota?.message}
        placeholder={siguienteCuota ? siguienteCuota.toString() : 'Se asignará automáticamente'}
      />
      {siguienteCuota && (
        <p className="text-sm text-gray-500">
          Si no especifica un número, se asignará automáticamente la cuota {siguienteCuota}
        </p>
      )}

      <Input
        label="Fecha de Pago"
        type="date"
        {...register('fecha_pago')}
        error={errors.fecha_pago?.message}
      />

      {ventaSeleccionada && monto && monto > 0 && (
        <div className="bg-primary-50 p-4 rounded-md">
          <p className="text-sm text-primary-900">
            <strong>Nuevo Saldo Pendiente:</strong> {'$' + (ventaSeleccionada.saldo_pendiente - monto).toLocaleString('es-DO')}
          </p>
        </div>
      )}

      <div className="btn-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting || isSubmitting || !ventaSeleccionada}>
          {(submitting || isSubmitting) ? 'Guardando...' : 'Registrar Pago'}
        </Button>
      </div>

    </form>
  )
}


