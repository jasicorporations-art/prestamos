'use client'

import { useEffect, useState, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Select } from '@/components/Select'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { motoresService } from '@/lib/services/motores'
import { clientesService } from '@/lib/services/clientes'
import { ventasService } from '@/lib/services/ventas'
import { authService } from '@/lib/services/auth'
import { calcularMontoConInteres, calcularFinanciamientoFrances, convertirPlazoAMesesEquivalentes, formatearPlazo } from '@/lib/services/interes'
import { executeWithOfflineFallback, isOnline } from '@/lib/utils/offlineHelper'
import { subscriptionService } from '@/lib/services/subscription'
import { LimitReachedModal } from '@/components/LimitReachedModal'

function round2(value: number) {
  return Math.round(value * 100) / 100
}

// Función auxiliar para formatear el plazo según el tipo
function formatearPlazoPersonalizado(tipo: 'diario' | 'semanal' | 'quincenal' | 'mensual', cantidad: number): string {
  if (tipo === 'diario') {
    if (cantidad === 1) return '1 día'
    if (cantidad < 7) return `${cantidad} días`
    if (cantidad < 30) {
      const semanas = Math.floor(cantidad / 7)
      const dias = cantidad % 7
      if (dias === 0) return `${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`
      return `${semanas} ${semanas === 1 ? 'semana' : 'semanas'} y ${dias} ${dias === 1 ? 'día' : 'días'}`
    }
    const meses = Math.floor(cantidad / 30)
    const dias = cantidad % 30
    if (dias === 0) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`
    return `${meses} ${meses === 1 ? 'mes' : 'meses'} y ${dias} ${dias === 1 ? 'día' : 'días'}`
  }
  if (tipo === 'semanal') {
    if (cantidad === 1) return '1 semana'
    if (cantidad < 52) return `${cantidad} semanas`
    const años = Math.floor(cantidad / 52)
    const semanas = cantidad % 52
    if (semanas === 0) return `${años} ${años === 1 ? 'año' : 'años'}`
    return `${años} ${años === 1 ? 'año' : 'años'} y ${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`
  }
  if (tipo === 'quincenal') {
    if (cantidad === 1) return '1 quincena'
    if (cantidad < 24) return `${cantidad} quincenas`
    const años = Math.floor(cantidad / 24)
    const quincenas = cantidad % 24
    if (quincenas === 0) return `${años} ${años === 1 ? 'año' : 'años'}`
    return `${años} ${años === 1 ? 'año' : 'años'} y ${quincenas} ${quincenas === 1 ? 'quincena' : 'quincenas'}`
  }
  // Mensual
  return formatearPlazo(cantidad)
}
import type { Motor, Cliente, Venta } from '@/types'
import { TIPOS_GARANTIA } from '@/types'

const ventaSchema = z.object({
  motor_id: z.string().min(1, 'Debe seleccionar un motor'),
  cliente_id: z.string().min(1, 'Debe seleccionar un cliente'),
  numero_chasis: z.string().optional(), // Número de chasis editable
  tipo_pago: z.enum(['financiamiento', 'contado']),
  cantidad_cuotas: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return undefined
      const num = typeof val === 'string' ? Number(val) : (typeof val === 'number' ? val : Number(val))
      return (typeof num === 'number' && !isNaN(num)) ? num : undefined
    },
    z.number().min(1, 'La cantidad de cuotas debe ser mayor a 0')
  ),
  tipo_plazo: z.enum(['diario', 'semanal', 'quincenal', 'mensual']),
  cantidad_plazo: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return undefined
      const num = typeof val === 'string' ? Number(val) : (typeof val === 'number' ? val : Number(val))
      return (typeof num === 'number' && !isNaN(num)) ? num : undefined
    },
    z.number().min(1, 'La cantidad debe ser mayor a 0').optional()
  ),
  dia_pago_semanal: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return undefined
      const num = typeof val === 'string' ? Number(val) : (typeof val === 'number' ? val : Number(val))
      return (typeof num === 'number' && !isNaN(num)) ? num : undefined
    },
    z.number().min(0).max(6).optional()
  ),
  fecha_inicio_quincenal: z.string().optional(),
  dia_pago_mensual: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return undefined
      const num = typeof val === 'string' ? Number(val) : (typeof val === 'number' ? val : Number(val))
      return (typeof num === 'number' && !isNaN(num)) ? num : undefined
    },
    z.number().min(1).max(31).optional()
  ),
  metodo_interes: z.enum(['sobre_saldo', 'fijo']).optional(),
  interes_prestamo: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return undefined
      const num = typeof val === 'string' ? Number(val) : (typeof val === 'number' ? val : Number(val))
      return (typeof num === 'number' && !isNaN(num)) ? num : undefined
    },
    z.number().min(0, 'El interés no puede ser negativo').max(100, 'El interés no puede ser mayor a 100%').optional()
  ),
  descuento_contado: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return undefined
      const num = typeof val === 'string' ? Number(val) : (typeof val === 'number' ? val : Number(val))
      return (typeof num === 'number' && !isNaN(num)) ? num : undefined
    },
    z.number().min(0, 'El descuento no puede ser negativo').max(100, 'El descuento no puede ser mayor a 100%').optional()
  ),
  tipo_garantia: z.string().optional(),
  descripcion_garantia: z.string().optional(),
  valor_estimado: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return undefined
      const num = typeof val === 'string' ? Number(val) : (typeof val === 'number' ? val : Number(val))
      return (typeof num === 'number' && !isNaN(num)) ? num : undefined
    },
    z.number().min(0, 'El valor no puede ser negativo').optional()
  ),
}).superRefine((data, ctx) => {
  if (data.tipo_pago === 'contado') {
    return
  }
  // Si no es mensual, cantidad_plazo es requerido
  if (data.tipo_plazo !== 'mensual' && (!data.cantidad_plazo || data.cantidad_plazo <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La cantidad de plazo es requerida',
      path: ['cantidad_plazo'],
    })
  }
  // Si es diario, no requiere validaciones adicionales (solo cantidad de días)
  // Si es semanal, dia_pago_semanal es requerido
  if (data.tipo_plazo === 'semanal') {
    if (data.dia_pago_semanal === undefined || data.dia_pago_semanal === null || isNaN(data.dia_pago_semanal)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe seleccionar el día de pago semanal',
        path: ['dia_pago_semanal'],
      })
    }
  }
  // Si es quincenal, fecha_inicio_quincenal es requerido
  if (data.tipo_plazo === 'quincenal' && (!data.fecha_inicio_quincenal || data.fecha_inicio_quincenal === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Debe seleccionar la fecha de inicio para pagos quincenales',
      path: ['fecha_inicio_quincenal'],
    })
  }
  // Si es mensual, dia_pago_mensual es requerido
  if (data.tipo_plazo === 'mensual' && (data.dia_pago_mensual === undefined || data.dia_pago_mensual === null || isNaN(data.dia_pago_mensual))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Debe seleccionar el día del mes para pagos mensuales',
      path: ['dia_pago_mensual'],
    })
  }
  // Si se selecciona garantía (distinto de Ninguna), descripción es obligatoria
  const tipoGarantia = data.tipo_garantia as string | undefined
  if (tipoGarantia && tipoGarantia !== 'Ninguna' && tipoGarantia !== '') {
    const desc = (data.descripcion_garantia || '').trim()
    if (!desc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La descripción de la garantía es obligatoria',
        path: ['descripcion_garantia'],
      })
    }
  }
})

type VentaFormData = z.infer<typeof ventaSchema>

interface VentaFormProps {
  venta?: Venta | null
  onSuccess: () => void
  onCancel: () => void
}

export function VentaForm({ venta: ventaProp, onSuccess, onCancel }: VentaFormProps) {
  const [motores, setMotores] = useState<Motor[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [motorSeleccionado, setMotorSeleccionado] = useState<Motor | null>(null)
  const [montoTotal, setMontoTotal] = useState(0)
  const [detallesInteres, setDetallesInteres] = useState<{
    montoTotal: number
    interesAplicado: number
    porcentajeInteres: number
    tipoInteres: 'descuento' | 'interes'
    precioBase: number
    cargoManejo?: number
  } | null>(null)
  const [creditoActivo, setCreditoActivo] = useState<{
    tieneCredito: boolean
    montoSaldo: number
    creditos: any[]
  } | null>(null)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [limitData, setLimitData] = useState<{
    planType: string | null
    currentUsage: number
    limit: number | 'ilimitado'
  } | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<VentaFormData>({
    resolver: zodResolver(ventaSchema),
    defaultValues: {
      tipo_pago: 'financiamiento',
      tipo_plazo: 'mensual',
      cantidad_plazo: 12, // Plazo por defecto: 12 meses
      metodo_interes: 'fijo', // Interés fijo (lineal) por defecto; el cliente puede cambiar
      interes_prestamo: 0.2, // Tasa por período (ej: 0.2% mensual); el cliente puede cambiar
      descuento_contado: 0,
      tipo_garantia: 'Ninguna',
    },
  })

  const motorId = watch('motor_id')
  const clienteId = watch('cliente_id')
  const tipoPago = watch('tipo_pago')
  const cantidadCuotas = watch('cantidad_cuotas')
  const tipoPlazo = watch('tipo_plazo')
  const cantidadPlazo = watch('cantidad_plazo')
  const diaPagoSemanal = watch('dia_pago_semanal')
  const fechaInicioQuincenal = watch('fecha_inicio_quincenal')
  const diaPagoMensual = watch('dia_pago_mensual')
  const metodoInteres = watch('metodo_interes') || 'fijo'
  const interesPrestamo = watch('interes_prestamo') ?? 0.2
  const descuentoContado = watch('descuento_contado') || 0
  const tipoGarantia = watch('tipo_garantia') || 'Ninguna'

  // Función para calcular fechas de pago diario
  function calcularFechasPagoDiario(cantidadDias: number, fechaInicio?: string): Date[] {
    const fechas: Date[] = []
    const fechaInicial = fechaInicio ? new Date(fechaInicio) : new Date()
    
    // Asegurar que la fecha inicial sea hoy o en el futuro
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    if (fechaInicial < hoy) {
      fechaInicial.setTime(hoy.getTime())
    }
    fechaInicial.setHours(0, 0, 0, 0)
    
    // Calcular todas las fechas diarias
    for (let i = 0; i < cantidadDias; i++) {
      const fecha = new Date(fechaInicial)
      fecha.setDate(fechaInicial.getDate() + i)
      fechas.push(fecha)
    }
    
    return fechas
  }

  // Función para calcular fechas de pago semanal
  function calcularFechasPagoSemanal(diaSemana: number, cantidadSemanas: number): Date[] {
    const fechas: Date[] = []
    const hoy = new Date()
    const diaActual = hoy.getDay() // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    
    // Calcular días hasta el próximo día de pago
    let diasHastaProximoPago = diaSemana - diaActual
    if (diasHastaProximoPago <= 0) {
      diasHastaProximoPago += 7 // Si ya pasó este día, ir al de la próxima semana
    }
    
    // Primera fecha de pago
    const primeraFecha = new Date(hoy)
    primeraFecha.setDate(hoy.getDate() + diasHastaProximoPago)
    
    // Calcular todas las fechas
    for (let i = 0; i < cantidadSemanas; i++) {
      const fecha = new Date(primeraFecha)
      fecha.setDate(primeraFecha.getDate() + (i * 7))
      fechas.push(fecha)
    }
    
    return fechas
  }

  // Función para calcular fechas de pago quincenal (cada 15 días)
  function calcularFechasPagoQuincenal(fechaInicio: string, cantidadQuincenas: number): Date[] {
    const fechas: Date[] = []
    const fechaInicial = new Date(fechaInicio)
    
    // Calcular todas las fechas (cada 15 días)
    for (let i = 0; i < cantidadQuincenas; i++) {
      const fecha = new Date(fechaInicial)
      fecha.setDate(fechaInicial.getDate() + (i * 15))
      fechas.push(fecha)
    }
    
    return fechas
  }

  // Función para calcular fechas de pago mensual
  function calcularFechasPagoMensual(diaMes: number, cantidadMeses: number): Date[] {
    const fechas: Date[] = []
    const hoy = new Date()
    
    // Obtener el mes y año actual
    let mesActual = hoy.getMonth() // 0 = Enero, 11 = Diciembre
    let añoActual = hoy.getFullYear()
    
    // Si el día seleccionado ya pasó este mes, empezar el próximo mes
    if (hoy.getDate() >= diaMes) {
      mesActual += 1
      // Si pasamos de diciembre, ir a enero del próximo año
      if (mesActual > 11) {
        mesActual = 0
        añoActual += 1
      }
    }
    
    // Calcular todas las fechas mensuales
    for (let i = 0; i < cantidadMeses; i++) {
      const mes = (mesActual + i) % 12
      const año = añoActual + Math.floor((mesActual + i) / 12)
      
      // Obtener el último día del mes para validar
      const ultimoDiaDelMes = new Date(año, mes + 1, 0).getDate()
      const diaPago = Math.min(diaMes, ultimoDiaDelMes) // Si el mes tiene menos días, usar el último día
      
      const fecha = new Date(año, mes, diaPago)
      fechas.push(fecha)
    }
    
    return fechas
  }

  // Obtener fechas de pago si es diario
  const fechasPagoDiario = tipoPlazo === 'diario' && cantidadPlazo 
    ? calcularFechasPagoDiario(cantidadPlazo)
    : []

  // Obtener fechas de pago si es semanal
  const fechasPagoSemanal = tipoPlazo === 'semanal' && diaPagoSemanal !== undefined && cantidadPlazo 
    ? calcularFechasPagoSemanal(diaPagoSemanal, cantidadPlazo)
    : []

  // Obtener fechas de pago si es quincenal
  const fechasPagoQuincenal = tipoPlazo === 'quincenal' && fechaInicioQuincenal && cantidadPlazo 
    ? calcularFechasPagoQuincenal(fechaInicioQuincenal, cantidadPlazo)
    : []

  // Obtener fechas de pago si es mensual
  const fechasPagoMensual = tipoPlazo === 'mensual' && diaPagoMensual !== undefined && cantidadCuotas 
    ? calcularFechasPagoMensual(diaPagoMensual, cantidadCuotas)
    : []

  // Nombres de los días de la semana
  const nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

  // Convertir el plazo a meses para el cálculo de interés
  // Si es mensual, usar la cantidad de cuotas como cantidad de meses
  const cantidadPlazoCalculada = tipoPlazo === 'mensual' 
    ? (cantidadCuotas || 0) 
    : (cantidadPlazo || 0)
  
  // plazoMeses se usa SOLO para el cálculo de interés (debe convertirse a meses)
  // Para el número de cuotas, se usa cantidad_cuotas directamente (ver línea 573-575)
  const plazoMeses = tipoPlazo === 'diario'
    ? cantidadPlazoCalculada / 30 // Aproximadamente 30 días por mes (solo para interés)
    : tipoPlazo === 'semanal' 
    ? cantidadPlazoCalculada / 4.33 // Aproximadamente 4.33 semanas por mes (solo para interés)
    : tipoPlazo === 'quincenal'
    ? cantidadPlazoCalculada / 2 // 2 quincenas por mes (solo para interés)
    : cantidadPlazoCalculada // Mensual: usar cantidad de cuotas

  useEffect(() => {
    loadData()
  }, [])

  // Verificar créditos activos cuando cambia el cliente seleccionado
  useEffect(() => {
    async function verificarCreditosActivos() {
      if (!clienteId) {
        setCreditoActivo(null)
        return
      }

      try {
        const creditos = await ventasService.getCreditosActivosByCliente(clienteId)
        const totalSaldo = creditos.reduce((sum, credito) => sum + credito.saldo_pendiente, 0)
        
        if (creditos.length > 0) {
          setCreditoActivo({
            tieneCredito: true,
            montoSaldo: totalSaldo,
            creditos,
          })
        } else {
          setCreditoActivo({
            tieneCredito: false,
            montoSaldo: 0,
            creditos: [],
          })
        }
      } catch (error) {
        console.error('Error verificando créditos activos:', error)
        setCreditoActivo(null)
      }
    }

    verificarCreditosActivos()
  }, [clienteId])

  // Al cambiar de mensual a quincenal/semanal/diario: convertir meses al equivalente en la nueva unidad
  // Ej: 15 meses → 30 quincenas (evita que se muestre "15 quincenas" = ~7.5 meses)
  const tipoPlazoAnteriorRef = useRef<string | null>(null)
  useEffect(() => {
    const anterior = tipoPlazoAnteriorRef.current
    tipoPlazoAnteriorRef.current = tipoPlazo || null

    if (anterior === 'mensual' && (tipoPlazo === 'quincenal' || tipoPlazo === 'semanal' || tipoPlazo === 'diario')) {
      const meses = cantidadCuotas || cantidadPlazo || 0
      if (meses > 0) {
        const equivalente =
          tipoPlazo === 'quincenal' ? Math.round(meses * 2) // 15 meses = 30 quincenas
          : tipoPlazo === 'semanal' ? Math.round(meses * 4.33) // 15 meses ≈ 65 semanas
          : Math.round(meses * 30) // 15 meses ≈ 450 días
        // Usar setTimeout para que los setValue se apliquen después de los otros useEffects de sync
        const id = setTimeout(() => {
          setValue('cantidad_plazo', equivalente, { shouldValidate: true })
          setValue('cantidad_cuotas', equivalente, { shouldValidate: true })
        }, 0)
        return () => clearTimeout(id)
      }
    }
  }, [tipoPlazo, cantidadCuotas, cantidadPlazo, setValue])

  // Sincronizar SOLO cantidad_plazo → cantidad_cuotas (nunca al revés)
  // La sincronización inversa (cantidadCuotas → cantidad_plazo) causaba que 14 meses
  // sobrescribiera 120 semanas cuando el usuario cambiaba de mensual a semanal
  useEffect(() => {
    if (tipoPlazo === 'diario' || tipoPlazo === 'semanal' || tipoPlazo === 'quincenal') {
      if (cantidadPlazo && cantidadPlazo > 0) {
        setValue('cantidad_cuotas', cantidadPlazo, { shouldValidate: true })
      }
    }
  }, [cantidadPlazo, tipoPlazo, setValue])

  const [chasisPrellenado, setChasisPrellenado] = useState(false)
  const [ultimoMotorId, setUltimoMotorId] = useState<string | null>(null)

  useEffect(() => {
    if (tipoPago === 'contado') {
      setValue('cantidad_cuotas', 1)
      setValue('tipo_plazo', 'mensual')
      setValue('cantidad_plazo', 1)
      setValue('interes_prestamo', 0)
      setValue('dia_pago_semanal', undefined)
      setValue('dia_pago_mensual', undefined)
      setValue('fecha_inicio_quincenal', undefined)
    }
  }, [tipoPago, setValue])
  
  useEffect(() => {
    if (motorId) {
      const motor = motores.find((m) => m.id === motorId)
      setMotorSeleccionado(motor || null)
      if (motor) {
        // Prellenar el número de chasis solo si cambió el motor o si es la primera vez
        if (ultimoMotorId !== motorId) {
          setValue('numero_chasis', motor.numero_chasis || '')
          setChasisPrellenado(true)
          setUltimoMotorId(motorId)
        }
        const precioBase = motor.precio_venta || 0

        const esContado = tipoPago === 'contado'
        const descuentoAplicado = esContado ? (precioBase * Math.min(Math.max(descuentoContado, 0), 100)) / 100 : 0

        if (esContado) {
          const montoContado = round2(precioBase - descuentoAplicado)
          setMontoTotal(montoContado)
          setDetallesInteres({
            montoTotal: montoContado,
            interesAplicado: descuentoAplicado,
            porcentajeInteres: Math.min(Math.max(descuentoContado, 0), 100),
            tipoInteres: 'descuento',
            precioBase,
          })
          return
        }

        // Financiamiento: usar Amortización Francesa
        const numCuotas = cantidadPlazoCalculada || cantidadCuotas || 0
        if (numCuotas <= 0) {
          setMontoTotal(precioBase)
          setDetallesInteres({
            montoTotal: precioBase,
            interesAplicado: 0,
            porcentajeInteres: interesPrestamo || 0,
            tipoInteres: 'interes',
            precioBase,
            cargoManejo: 0,
          })
          return
        }

        const { cuotaFija, interesesTotales, montoTotal: total, cargoManejo } = calcularFinanciamientoFrances({
          montoBase: precioBase,
          tasaAnual: interesPrestamo || 0,
          numeroCuotas: numCuotas,
          tipoPlazo: tipoPlazo || 'mensual',
          metodoInteres: metodoInteres || 'fijo',
        })

        setMontoTotal(total)
        setDetallesInteres({
          montoTotal: total,
          interesAplicado: interesesTotales,
          porcentajeInteres: interesPrestamo || 0,
          tipoInteres: 'interes',
          precioBase,
          cargoManejo,
        })
      } else {
        setMontoTotal(0)
        setDetallesInteres(null)
        setChasisPrellenado(false)
        setUltimoMotorId(null)
      }
    } else {
      setMontoTotal(0)
      setDetallesInteres(null)
      setChasisPrellenado(false)
      setUltimoMotorId(null)
    }
  }, [motorId, motores, plazoMeses, cantidadPlazoCalculada, tipoPlazo, interesPrestamo, cantidadCuotas, setValue, ultimoMotorId, tipoPago, descuentoContado, metodoInteres])

  async function loadData() {
    try {
      const [motoresData, clientesData] = await Promise.all([
        motoresService.getDisponibles(),
        clientesService.getAll(),
      ])
      setMotores(motoresData)
      setClientes(clientesData)
    } catch (error) {
      console.error('Error cargando datos:', error)
      alert('Error al cargar los datos')
    }
  }

  async function onSubmit(data: VentaFormData) {
    try {
      console.log('📝 Datos del formulario recibidos:', data)

      const planType = await subscriptionService.getCurrentPlan()
      if (planType === 'TRIAL') {
        const creados = await subscriptionService.getTrialFinanciamientosCreados()
        if (creados >= subscriptionService.TRIAL_MAX_FINANCIAMIENTOS) {
          alert(`Plan de prueba: solo puedes emitir ${subscriptionService.TRIAL_MAX_FINANCIAMIENTOS} financiamientos en total. Ya utilizaste tu cupo. Aunque borres uno, no podrás emitir más hasta que contrates un plan (Plata, Oro o Infinito).`)
          return
        }
      } else if (data.tipo_pago !== 'contado') {
        const validation = await subscriptionService.canCreatePrestamo()
        if (!validation.allowed && validation.usage && validation.limits) {
          setLimitData({
            planType: planType || 'INICIAL',
            currentUsage: validation.usage.prestamos || 0,
            limit: validation.limits.prestamos,
          })
          setShowLimitModal(true)
          return
        }
      }
      
      if (!motorSeleccionado) {
        alert('Debe seleccionar un préstamo')
        return
      }

      // Validar que hay préstamos disponibles
      if ((motorSeleccionado.cantidad || 0) <= 0) {
        alert('No hay préstamos disponibles para este préstamo')
        return
      }

      // Validaciones adicionales antes de enviar (solo financiamiento)
      if (data.tipo_pago !== 'contado' && data.tipo_plazo === 'diario') {
        if (!data.cantidad_plazo || data.cantidad_plazo <= 0) {
          alert('⚠️ Debe ingresar la cantidad de días')
          return
        }
      }

      if (data.tipo_pago !== 'contado' && data.tipo_plazo === 'semanal') {
        const diaSemanal = typeof data.dia_pago_semanal === 'string' 
          ? Number(data.dia_pago_semanal) 
          : data.dia_pago_semanal
        if (diaSemanal === undefined || diaSemanal === null) {
          alert('⚠️ Debe seleccionar el día de pago semanal')
          return
        }
        if (!data.cantidad_plazo || data.cantidad_plazo <= 0) {
          alert('⚠️ Debe ingresar la cantidad de semanas')
          return
        }
      }

      if (data.tipo_pago !== 'contado' && data.tipo_plazo === 'quincenal') {
        if (!data.fecha_inicio_quincenal || data.fecha_inicio_quincenal === '') {
          alert('⚠️ Debe seleccionar la fecha de inicio para pagos quincenales')
          return
        }
        if (!data.cantidad_plazo || data.cantidad_plazo <= 0) {
          alert('⚠️ Debe ingresar la cantidad de quincenas')
          return
        }
      }

      if (data.tipo_pago !== 'contado' && data.tipo_plazo === 'mensual') {
        if (data.dia_pago_mensual === undefined || data.dia_pago_mensual === null) {
          alert('⚠️ Debe seleccionar el día del mes para pagos mensuales')
          return
        }
      }

      const esContado = data.tipo_pago === 'contado'
      const pagoInicialValue = 0 // Pago inicial siempre es 0 (no se usa)
      
      // El saldo pendiente es el monto total
      const saldoPendiente = esContado ? 0 : montoTotal
      const descuentoAplicado = esContado
        ? ((motorSeleccionado?.precio_venta || 0) * Math.min(Math.max(data.descuento_contado || 0, 0), 100)) / 100
        : 0

      // Determinar cantidad de cuotas según el tipo de plazo
      const cantidadCuotasFinal = esContado ? 1 : (
        data.tipo_plazo === 'quincenal' || data.tipo_plazo === 'diario' || data.tipo_plazo === 'semanal'
          ? (data.cantidad_plazo || data.cantidad_cuotas || 0) // Para quincenal/diario/semanal usar cantidad_plazo
          : (data.cantidad_cuotas || 0) // Para mensual usar cantidad_cuotas
      )

      // Determinar plazo_meses (debe ser igual a cantidad_cuotas para todos los tipos)
      const plazoMesesFinal = esContado ? null : cantidadCuotasFinal

      console.log('📊 [VentaForm] Datos antes de guardar:', {
        tipo_plazo: data.tipo_plazo,
        cantidad_plazo: data.cantidad_plazo,
        cantidad_cuotas: data.cantidad_cuotas,
        cantidadCuotasFinal,
        plazoMesesFinal
      })

      const ventaData: any = {
        motor_id: data.motor_id,
        cliente_id: data.cliente_id,
        monto_total: montoTotal, // Ya incluye interés + gastos de cierre
        cantidad_cuotas: cantidadCuotasFinal,
        saldo_pendiente: saldoPendiente, // El saldo pendiente es el monto total
        fecha_venta: new Date().toISOString(),
        // plazo_meses debe ser igual a cantidad_cuotas para todos los tipos (no convertir)
        plazo_meses: plazoMesesFinal,
        porcentaje_interes: esContado ? 0 : (detallesInteres?.porcentajeInteres || 0),
        metodo_interes: esContado ? undefined : (data.metodo_interes || 'fijo'),
        tipo_interes: esContado ? 'descuento' : (detallesInteres?.tipoInteres || 'interes'),
        tipo_pago: esContado ? 'contado' : 'financiamiento',
        descuento_contado: descuentoAplicado,
        // Garantía
        tipo_garantia: (data.tipo_garantia === 'Ninguna' || !data.tipo_garantia) ? null : data.tipo_garantia,
        descripcion_garantia: (data.tipo_garantia === 'Ninguna' || !data.tipo_garantia) ? null : (data.descripcion_garantia?.trim() || null),
        valor_estimado: (data.tipo_garantia === 'Ninguna' || !data.tipo_garantia) ? null : (data.valor_estimado ?? null),
      }

      // El número de préstamo se genera en el servicio para asegurar aleatoriedad al guardar

      // Configurar tipo de plazo y campos específicos
      if (!esContado && data.tipo_plazo === 'diario') {
        ventaData.tipo_plazo = 'diario'
        // Para pagos diarios, no se requiere configuración adicional
      } else if (!esContado && data.tipo_plazo === 'semanal') {
        ventaData.tipo_plazo = 'semanal'
        // Convertir a número si viene como string
        const diaSemanal = typeof data.dia_pago_semanal === 'string' 
          ? Number(data.dia_pago_semanal) 
          : data.dia_pago_semanal
        if (diaSemanal !== undefined && diaSemanal !== null) {
          ventaData.dia_pago_semanal = diaSemanal
        }
      } else if (!esContado && data.tipo_plazo === 'quincenal') {
        ventaData.tipo_plazo = 'quincenal'
        // Guardar la fecha de inicio para pagos quincenales
        if (data.fecha_inicio_quincenal) {
          ventaData.fecha_inicio_quincenal = data.fecha_inicio_quincenal
        }
      } else if (!esContado && data.tipo_plazo === 'mensual') {
        ventaData.tipo_plazo = 'mensual'
        // Guardar el día del mes para pagos mensuales
        if (data.dia_pago_mensual !== undefined && data.dia_pago_mensual !== null) {
          ventaData.dia_pago_mensual = data.dia_pago_mensual
        }
      }

      console.log('💾 Datos a guardar en la base de datos:', ventaData)

      // Intentar crear la venta con fallback offline, incluyendo el pago inicial si existe
      console.log('🚀 Intentando crear venta...')
      const ventaCreada = await executeWithOfflineFallback(
        () => ventasService.create(ventaData, pagoInicialValue), // Pasar pago inicial como segundo parámetro
        {
          type: 'create',
          entity: 'venta',
          data: ventaData,
        }
      )

      console.log('✅ Venta creada exitosamente:', ventaCreada)

      if (planType === 'TRIAL') {
        await subscriptionService.incrementTrialFinanciamientoCreado()
      }

      // Enviar notificaciones de amortización por correo y WhatsApp (fire-and-forget, con sesión para evitar 401)
      if (isOnline() && ventaCreada?.id && data.tipo_pago !== 'contado') {
        const ventaId = ventaCreada.id
        ;(async () => {
          try {
            const session = await authService.getSession()
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
            const body = JSON.stringify({ venta_id: ventaId })
            // Pequeña espera para que cuotas_detalladas esté poblada antes de enviar el email
            await new Promise((r) => setTimeout(r, 800))
            const [emailRes, waRes] = await Promise.all([
              fetch('/api/enviar-amortizacion-email', { method: 'POST', headers, body, credentials: 'include' }),
              fetch('/api/enviar-amortizacion-whatsapp', { method: 'POST', headers, body, credentials: 'include' }),
            ])
            if (!emailRes.ok) console.warn('[Amortización email] No enviado:', emailRes.status, await emailRes.text().catch(() => ''))
            if (!waRes.ok) console.warn('[Amortización WhatsApp] No enviado:', waRes.status, await waRes.text().catch(() => ''))
          } catch (e) {
            console.warn('Amortización notificaciones:', e)
          }
        })()
      }

      // Cerrar el formulario primero para mejor UX
      onSuccess()

      // Abrir la página de amortización solo si está aprobado (status active)
      // Los vendedores crean con status 'pending', la amortización solo se muestra tras aprobación
      if (isOnline() && ventaCreada?.id && data.tipo_pago !== 'contado') {
        setTimeout(() => {
          if ((ventaCreada as any)?.status === 'active') {
            try {
              const amortizacionUrl = `/ventas/${ventaCreada.id}/amortizacion`
              console.log('📄 Abriendo amortización en nueva pestaña:', amortizacionUrl)
              window.open(amortizacionUrl, '_blank')
            } catch (error) {
              console.error('Error abriendo amortización:', error)
              window.location.href = `/ventas/${ventaCreada.id}/amortizacion`
            }
          } else {
            alert('✅ Préstamo emitido exitosamente.\n\nLa amortización estará disponible cuando el administrador apruebe el financiamiento.')
          }
        }, 300)
      } else {
        setTimeout(() => {
          if (isOnline()) {
            alert('✅ Préstamo emitido exitosamente')
          } else {
            alert('📴 Sin conexión. El préstamo se guardó offline y se sincronizará automáticamente cuando regrese el internet.')
          }
        }, 100)
      }
    } catch (error: any) {
      console.error('❌ Error emitiendo préstamo:', error)
      console.error('Error completo:', JSON.stringify(error, null, 2))
      
      // Si el error es de guardado offline, ya se mostró el mensaje
      if (error?.message?.includes('offline') || error?.message?.includes('Sin conexión')) {
        onSuccess() // Cerrar el formulario aunque se guardó offline
        return
      }
      
      // Mostrar mensaje de error más detallado
      const mensajeError = error?.message || error?.error?.message || 'Error al emitir el préstamo'
      alert(`❌ Error: ${mensajeError}\n\nPor favor, verifica que todos los campos estén completos y que las columnas existan en la base de datos.`)
    }
  }

  // Estado para modo edición (hooks deben estar al inicio)
  const [editNumeroPrestamo, setEditNumeroPrestamo] = useState('')
  const [editFechaVenta, setEditFechaVenta] = useState('')
  const [editTipoPlazo, setEditTipoPlazo] = useState<'diario' | 'semanal' | 'quincenal' | 'mensual'>('mensual')
  const [editDiaPagoMensual, setEditDiaPagoMensual] = useState<number>(1)
  const [editDiaPagoSemanal, setEditDiaPagoSemanal] = useState<number>(0)
  const [editFechaInicioQuincenal, setEditFechaInicioQuincenal] = useState('')
  const [editRutaId, setEditRutaId] = useState<string>('')
  const [rutas, setRutas] = useState<{ id: string; nombre: string }[]>([])
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    if (ventaProp) {
      setEditNumeroPrestamo(ventaProp.numero_prestamo || '')
      setEditFechaVenta(
        ventaProp.fecha_venta ? new Date(ventaProp.fecha_venta).toISOString().split('T')[0] : ''
      )
      setEditTipoPlazo((ventaProp.tipo_plazo as 'diario' | 'semanal' | 'quincenal' | 'mensual') || 'mensual')
      setEditDiaPagoMensual(ventaProp.dia_pago_mensual ?? 1)
      setEditDiaPagoSemanal(ventaProp.dia_pago_semanal ?? 0)
      setEditFechaInicioQuincenal(
        ventaProp.fecha_inicio_quincenal ? new Date(ventaProp.fecha_inicio_quincenal).toISOString().split('T')[0] : ''
      )
      setEditRutaId(ventaProp.ruta_id || '')
    }
  }, [ventaProp])

  useEffect(() => {
    if (ventaProp?.sucursal_id) {
      import('@/lib/services/rutas').then(({ rutasService }) => {
        rutasService.getRutasBySucursal(ventaProp!.sucursal_id!).then((r) => {
          setRutas(r.map((x) => ({ id: x.id, nombre: x.nombre || 'Sin nombre' })))
        }).catch(() => setRutas([]))
      })
    }
  }, [ventaProp])

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ventaProp?.id) return
    try {
      setEditSaving(true)
      const updateData: Record<string, unknown> = {
        numero_prestamo: editNumeroPrestamo.trim() || undefined,
        fecha_venta: editFechaVenta ? new Date(editFechaVenta).toISOString() : undefined,
        tipo_plazo: editTipoPlazo,
        ruta_id: editRutaId ? editRutaId : null,
      }
      if (editTipoPlazo === 'mensual') updateData.dia_pago_mensual = editDiaPagoMensual
      if (editTipoPlazo === 'semanal') updateData.dia_pago_semanal = editDiaPagoSemanal
      if (editTipoPlazo === 'quincenal' && editFechaInicioQuincenal) updateData.fecha_inicio_quincenal = editFechaInicioQuincenal
      await ventasService.update(ventaProp.id, updateData as Parameters<typeof ventasService.update>[1])
      onSuccess()
    } catch (error: any) {
      alert(error?.message || 'Error al actualizar')
    } finally {
      setEditSaving(false)
    }
  }

  // Modo edición: formulario expandido para admin
  if (ventaProp) {
    const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    return (
      <form onSubmit={handleEditSubmit} className="space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          Como administrador puedes corregir datos del financiamiento. Para cambiar monto total o cantidad de cuotas (si ya hay pagos), elimina y crea uno nuevo.
        </p>
        <Input
          label="Número de préstamo"
          value={editNumeroPrestamo}
          onChange={(e) => setEditNumeroPrestamo(e.target.value)}
          placeholder="Ej: ABC12345-001"
        />
        <Input
          label="Fecha de venta"
          type="date"
          value={editFechaVenta}
          onChange={(e) => setEditFechaVenta(e.target.value)}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia de pago</label>
          <select
            value={editTipoPlazo}
            onChange={(e) => setEditTipoPlazo(e.target.value as 'diario' | 'semanal' | 'quincenal' | 'mensual')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="diario">Diario</option>
            <option value="semanal">Semanal</option>
            <option value="quincenal">Quincenal</option>
            <option value="mensual">Mensual</option>
          </select>
        </div>
        {editTipoPlazo === 'mensual' && (
          <Input
            label="Día del mes para pago"
            type="number"
            min={1}
            max={31}
            value={editDiaPagoMensual}
            onChange={(e) => setEditDiaPagoMensual(Number(e.target.value) || 1)}
          />
        )}
        {editTipoPlazo === 'semanal' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Día de la semana</label>
            <select
              value={editDiaPagoSemanal}
              onChange={(e) => setEditDiaPagoSemanal(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
            >
              {NOMBRES_DIAS.map((nombre, i) => (
                <option key={i} value={i}>{nombre}</option>
              ))}
            </select>
          </div>
        )}
        {editTipoPlazo === 'quincenal' && (
          <Input
            label="Fecha de inicio quincenal"
            type="date"
            value={editFechaInicioQuincenal}
            onChange={(e) => setEditFechaInicioQuincenal(e.target.value)}
          />
        )}
        {rutas.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ruta de cobro</label>
            <select
              value={editRutaId}
              onChange={(e) => setEditRutaId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Sin ruta</option>
              {rutas.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>
        )}
        <div className="btn-actions">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={editSaving}>{editSaving ? 'Guardando...' : 'Guardar cambios'}</Button>
        </div>
      </form>
    )
  }

  return (
    <>
    <form 
      onSubmit={handleSubmit(
        (data) => {
          console.log('✅ Formulario válido, datos:', data)
          return onSubmit(data)
        },
        (errors) => {
          console.error('❌ Errores de validación del formulario:', errors)
          console.error('Errores detallados:', JSON.stringify(errors, null, 2))
          const errorMessages = Object.values(errors)
            .map(e => e?.message)
            .filter(Boolean)
            .join('\n')
          if (errorMessages) {
            alert(`⚠️ Por favor corrige los siguientes errores:\n\n${errorMessages}`)
          }
        }
      )} 
      className="space-y-4"
    >
      <Select
        label="Producto"
        {...register('motor_id')}
        error={errors.motor_id?.message}
        options={motores.map((motor) => {
          const nombreProducto = [motor.marca, motor.modelo].filter(Boolean).join(' ') || motor.numero_chasis || 'Producto'
          const precio = (motor.precio_venta || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          return {
            value: motor.id,
            label: `${nombreProducto} - $${precio}`,
          }
        })}
      />

      {motorSeleccionado && (
        <div className="space-y-3">
          <div className="bg-gray-50 p-4 rounded-md space-y-2">
            <p className="text-sm font-semibold text-gray-800">
              <strong>Producto:</strong> {[motorSeleccionado.marca, motorSeleccionado.modelo].filter(Boolean).join(' ') || motorSeleccionado.numero_chasis || '—'}
            </p>
            <p className="text-sm font-semibold text-gray-800">
              <strong>Precio:</strong> ${(motorSeleccionado.precio_venta || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-sm ${
              (motorSeleccionado.cantidad || 0) === 0
                ? 'text-red-600 font-medium'
                : (motorSeleccionado.cantidad || 0) < 10
                ? 'text-yellow-600'
                : 'text-green-600'
            }`}>
              <strong>Stock:</strong> {motorSeleccionado.cantidad || 0}
            </p>
            {(motorSeleccionado.cantidad || 0) === 0 && (
              <p className="text-sm text-red-600 font-medium">
                ⚠️ No hay stock disponible para este artículo
              </p>
            )}
          </div>
        </div>
      )}

      <Select
        label="Cliente"
        {...register('cliente_id')}
        error={errors.cliente_id?.message}
        options={clientes.map((cliente) => ({
          value: cliente.id,
          label: `${cliente.nombre_completo} (Cédula: ${cliente.cedula})`,
        }))}
      />

      {/* Tipo de Pago oculto - siempre financiamiento */}
      <input type="hidden" {...register('tipo_pago')} />

      {/* Alerta de crédito activo */}
      {creditoActivo?.tieneCredito && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-bold text-red-800">
                ATENCIÓN: Este cliente ya tiene un crédito activo con un saldo de ${creditoActivo.montoSaldo.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {creditoActivo.creditos.length > 1 && (
                <p className="mt-1 text-sm text-red-700">
                  Total de créditos activos: {creditoActivo.creditos.length}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {tipoPago !== 'contado' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo de Plazo"
              {...register('tipo_plazo')}
              error={errors.tipo_plazo?.message}
              options={[
                { value: 'diario', label: 'Diario' },
                { value: 'semanal', label: 'Semanal' },
                { value: 'quincenal', label: 'Quincenal' },
                { value: 'mensual', label: 'Mensual' },
              ]}
            />
            {tipoPlazo !== 'mensual' && (
              <Input
                label={
                  tipoPlazo === 'diario' ? 'Cantidad de Días' :
                  tipoPlazo === 'semanal' ? 'Cantidad de Semanas' : 
                  'Cantidad de Quincenas'
                }
                type="number"
                min="1"
                max={
                  tipoPlazo === 'diario' ? 365 :
                  tipoPlazo === 'semanal' ? 260 : 96
                }
                placeholder={
                  tipoPlazo === 'diario' ? 'Ej: 30 (1 mes)' :
                  tipoPlazo === 'semanal' ? 'Ej: 52 (1 año)' : 
                  'Ej: 24 (1 año)'
                }
                {...register('cantidad_plazo', { 
                  setValueAs: (v) => {
                    if (v === '' || v === undefined || v === null) return undefined
                    const num = Number(v)
                    return isNaN(num) ? undefined : num
                  }
                })}
                error={errors.cantidad_plazo?.message}
              />
            )}
          </div>

          {tipoPlazo === 'semanal' && (
            <Select
              label="Día de Pago Semanal"
              {...register('dia_pago_semanal', { 
                setValueAs: (v) => {
                  if (v === '' || v === undefined || v === null) return undefined
                  const num = Number(v)
                  return isNaN(num) ? undefined : num
                }
              })}
              error={errors.dia_pago_semanal?.message}
              options={[
                { value: '0', label: 'Domingo' },
                { value: '1', label: 'Lunes' },
                { value: '2', label: 'Martes' },
                { value: '3', label: 'Miércoles' },
                { value: '4', label: 'Jueves' },
                { value: '5', label: 'Viernes' },
                { value: '6', label: 'Sábado' },
              ]}
            />
          )}

          {tipoPlazo === 'quincenal' && (
            <Input
              label="Fecha de Inicio de Pagos Quincenales"
              type="date"
              {...register('fecha_inicio_quincenal')}
              error={errors.fecha_inicio_quincenal?.message}
              min={new Date().toISOString().split('T')[0]}
            />
          )}

          {tipoPlazo === 'mensual' && (
            <Input
              label="Día del Mes para Pagos Mensuales"
              type="number"
              min="1"
              max="31"
              placeholder="Ej: 5 (pagará el día 5 de cada mes)"
              {...register('dia_pago_mensual', { 
                setValueAs: (v) => {
                  if (v === '' || v === undefined || v === null) return undefined
                  const num = Number(v)
                  return isNaN(num) ? undefined : num
                }
              })}
              error={errors.dia_pago_mensual?.message}
            />
          )}
        </>
      )}

      {tipoPago === 'contado' && (
        <Input
          label="Descuento por Contado (%)"
          type="number"
          step="0.1"
          min="0"
          max="100"
          placeholder="Ej: 5"
          {...register('descuento_contado', { 
            setValueAs: (v) => {
              if (v === '' || v === undefined || v === null) return 0
              const num = Number(v)
              return isNaN(num) ? 0 : num
            }
          })}
          error={errors.descuento_contado?.message}
        />
      )}

      {tipoPago !== 'contado' && (
        <>
          {/* Solo mostrar "Cantidad de Cuotas" si es mensual */}
          {tipoPlazo === 'mensual' && (
            <Input
              label="Cantidad de Cuotas"
              type="number"
              min="1"
              {...register('cantidad_cuotas', { 
                setValueAs: (v) => {
                  if (v === '' || v === undefined || v === null) return undefined
                  const num = Number(v)
                  return isNaN(num) ? undefined : num
                }
              })}
              error={errors.cantidad_cuotas?.message}
            />
          )}

          <Select
            label="Método de Interés"
            {...register('metodo_interes')}
            options={[
              { value: 'fijo', label: 'Interés fijo (lineal)' },
              { value: 'sobre_saldo', label: 'Sobre saldo (compuesto)' },
            ]}
          />
          <Input
            label="Tasa de Interés por Período (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="Ej: 0.2 (0.2% por mes/día/semana según plazo)"
            {...register('interes_prestamo', { 
              setValueAs: (v) => {
                if (v === '' || v === undefined || v === null) return 0.2
                const num = Number(v)
                return isNaN(num) ? 0.2 : num
              }
            })}
            error={errors.interes_prestamo?.message}
          />
        </>
      )}

      {/* Información de Garantía */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Información de Garantía</h3>
        <Select
          label="Tipo de Garantía"
          {...register('tipo_garantia')}
          options={TIPOS_GARANTIA.map((t) => ({ value: t, label: t }))}
        />
        {tipoGarantia && tipoGarantia !== 'Ninguna' && (
          <div className="mt-3 space-y-3">
            <Input
              label="Descripción de la Garantía"
              placeholder="Ej: Toyota Corolla 2020, placa ABC-1234"
              {...register('descripcion_garantia')}
              error={errors.descripcion_garantia?.message}
              required
            />
            <Input
              label="Valor Estimado (opcional)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 500000"
              {...register('valor_estimado', {
                setValueAs: (v) => {
                  if (v === '' || v === undefined || v === null) return undefined
                  const num = Number(v)
                  return isNaN(num) ? undefined : num
                },
              })}
              error={errors.valor_estimado?.message}
            />
          </div>
        )}
      </div>

      {motorSeleccionado && (
        <div className="bg-blue-50 p-4 rounded-md space-y-2 border-l-4 border-blue-500">
          <p className="text-sm font-semibold text-blue-900">
            {tipoPago === 'contado' ? 'Cálculo de Pago al Contado' : 'Cálculo de Financiamiento'}
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Precio del Producto:</span>
              <span className="ml-2 font-medium">${(motorSeleccionado.precio_venta || 0).toLocaleString('es-DO', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</span>
            </div>
            {tipoPago !== 'contado' && plazoMeses && plazoMeses > 0 && cantidadPlazoCalculada && cantidadPlazoCalculada > 0 && (
              <div>
                <span className="text-gray-600">Plazo:</span>
                <span className="ml-2 font-medium">{formatearPlazoPersonalizado(tipoPlazo || 'mensual', cantidadPlazoCalculada)}</span>
              </div>
            )}
            {tipoPago !== 'contado' && detallesInteres && (
              <div className="col-span-2">
                <span className="text-gray-600">
                  Interés Total ({metodoInteres === 'fijo' ? 'lineal' : 'sobre saldo'}):
                </span>
                <span className="ml-2 font-medium text-orange-600">
                  {detallesInteres.porcentajeInteres}% por período × {cantidadPlazoCalculada || cantidadCuotas || 0} cuotas = 
                  ${detallesInteres.interesAplicado.toLocaleString('es-DO', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            {tipoPago === 'contado' && (
              <div className="col-span-2">
                <span className="text-gray-600">Ahorro por pago al contado:</span>
                <span className="ml-2 font-medium text-green-700">
                  -${(((motorSeleccionado.precio_venta || 0) * Math.min(Math.max(descuentoContado, 0), 100)) / 100).toLocaleString('es-DO', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            {tipoPago !== 'contado' && (
              <div className="col-span-2">
                <span className="text-gray-600">Cargo por Manejo:</span>
                <span className="ml-2 font-medium text-purple-600">
                  4.5% 
                  (${((motorSeleccionado.precio_venta || 0) * 4.5 / 100).toLocaleString('es-DO', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {montoTotal > 0 && (tipoPago === 'contado' || (cantidadCuotas && cantidadCuotas > 0)) && (
        <div className="bg-primary-50 p-4 rounded-md space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-primary-900">
              <strong>Monto Total:</strong>
            </span>
            <span className="text-sm font-bold text-primary-900">
              ${montoTotal.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          {(() => {
            const montoFinanciado = montoTotal
            const n = cantidadCuotas || 0
            const valorPorCuota = montoFinanciado <= 0 || n <= 0 ? 0 : montoFinanciado / n
            const descuentoAplicado = ((motorSeleccionado?.precio_venta || 0) * Math.min(Math.max(descuentoContado, 0), 100)) / 100
            
            return (
              <>
                {tipoPago === 'contado' && (
                  <div className="flex justify-between items-center border-t border-primary-200 pt-2">
                    <span className="text-sm text-primary-900">
                      <strong>Ahorro por pago al contado:</strong>
                    </span>
                    <span className="text-sm font-bold text-green-700">
                      - ${descuentoAplicado.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {tipoPago !== 'contado' && (
                  <div className="flex justify-between items-center border-t border-primary-200 pt-2">
                    <span className="text-sm text-primary-900">
                      <strong>Valor por Cuota:</strong>
                    </span>
                    <span className="text-sm font-semibold text-primary-900">
                      ${valorPorCuota.toLocaleString('es-DO', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </span>
                  </div>
                )}
                {tipoPago === 'contado' && (
                  <div className="flex justify-between items-center border-t border-primary-200 pt-2">
                    <span className="text-sm text-primary-900">
                      <strong>Pago Único de Liquidación:</strong>
                    </span>
                    <span className="text-lg font-bold text-green-700">
                      ${montoTotal.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {tipoPago !== 'contado' && tipoPlazo === 'diario' && fechasPagoDiario.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-md space-y-2 border-l-4 border-yellow-500">
          <p className="text-sm font-semibold text-yellow-900">📅 Días de Pago Diario</p>
          <p className="text-xs text-yellow-700 mb-2">
            El cliente pagará <strong>diariamente</strong> durante {cantidadPlazo} días
          </p>
          <div className="max-h-60 overflow-y-auto">
            <div className="space-y-1">
              {fechasPagoDiario.slice(0, 30).map((fecha, index) => (
                <div key={index} className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-gray-700">
                    Día {index + 1}:
                  </span>
                  <span className="font-medium text-gray-900">
                    {fecha.toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
              {fechasPagoDiario.length > 30 && (
                <p className="text-xs text-yellow-600 text-center mt-2">
                  ... y {fechasPagoDiario.length - 30} días más
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-yellow-600 mt-2">
            Total: {fechasPagoDiario.length} pagos diarios
          </p>
        </div>
      )}

      {tipoPago !== 'contado' && tipoPlazo === 'semanal' && fechasPagoSemanal.length > 0 && (
        <div className="bg-green-50 p-4 rounded-md space-y-2 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-green-900">📅 Días de Pago Semanal</p>
          <p className="text-xs text-green-700 mb-2">
            El cliente pagará cada <strong>{nombresDias[diaPagoSemanal || 0]}</strong>
          </p>
          <div className="max-h-48 overflow-y-auto">
            <div className="grid grid-cols-1 gap-1 text-xs">
              {fechasPagoSemanal.slice(0, 12).map((fecha, index) => (
                <div key={index} className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-gray-700">
                    Cuota {index + 1}:
                  </span>
                  <span className="font-medium text-gray-900">
                    {fecha.toLocaleDateString('es-DO', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              ))}
              {fechasPagoSemanal.length > 12 && (
                <p className="text-xs text-green-600 text-center mt-2">
                  ... y {fechasPagoSemanal.length - 12} fechas más
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2">
            Total: {fechasPagoSemanal.length} pagos semanales
          </p>
        </div>
      )}

      {tipoPago !== 'contado' && tipoPlazo === 'quincenal' && fechasPagoQuincenal.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-md space-y-2 border-l-4 border-blue-500">
          <p className="text-sm font-semibold text-blue-900">📅 Días de Pago Quincenal</p>
          <p className="text-xs text-blue-700 mb-2">
            El cliente pagará <strong>cada 15 días</strong> a partir de la fecha de inicio
          </p>
          <div className="max-h-48 overflow-y-auto">
            <div className="grid grid-cols-1 gap-1 text-xs">
              {fechasPagoQuincenal.slice(0, 12).map((fecha, index) => (
                <div key={index} className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-gray-700">
                    Cuota {index + 1}:
                  </span>
                  <span className="font-medium text-gray-900">
                    {fecha.toLocaleDateString('es-DO', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              ))}
              {fechasPagoQuincenal.length > 12 && (
                <p className="text-xs text-blue-600 text-center mt-2">
                  ... y {fechasPagoQuincenal.length - 12} fechas más
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Total: {fechasPagoQuincenal.length} pagos quincenales (cada 15 días)
          </p>
        </div>
      )}

      {tipoPago !== 'contado' && tipoPlazo === 'mensual' && fechasPagoMensual.length > 0 && (
        <div className="bg-purple-50 p-4 rounded-md space-y-2 border-l-4 border-purple-500">
          <p className="text-sm font-semibold text-purple-900">📅 Días de Pago Mensual</p>
          <p className="text-xs text-purple-700 mb-2">
            El cliente pagará el día <strong>{diaPagoMensual}</strong> de cada mes
          </p>
          <div className="max-h-48 overflow-y-auto">
            <div className="grid grid-cols-1 gap-1 text-xs">
              {fechasPagoMensual.slice(0, 12).map((fecha, index) => (
                <div key={index} className="flex justify-between items-center py-1 px-2 bg-white rounded">
                  <span className="text-gray-700">
                    Cuota {index + 1}:
                  </span>
                  <span className="font-medium text-gray-900">
                    {fecha.toLocaleDateString('es-DO', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              ))}
              {fechasPagoMensual.length > 12 && (
                <p className="text-xs text-purple-600 text-center mt-2">
                  ... y {fechasPagoMensual.length - 12} fechas más
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-purple-600 mt-2">
            Total: {fechasPagoMensual.length} pagos mensuales (día {diaPagoMensual} de cada mes)
          </p>
        </div>
      )}

      <div className="btn-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || !motorSeleccionado}>
          {isSubmitting ? 'Guardando...' : 'Emitir Financiamiento'}
        </Button>
      </div>
    </form>

    {limitData && (
      <LimitReachedModal
        isOpen={showLimitModal}
        onClose={() => { setShowLimitModal(false); setLimitData(null) }}
        planType={limitData.planType as any}
        resourceType="prestamos"
        currentUsage={limitData.currentUsage}
        limit={limitData.limit}
      />
    )}
    </>
  )
}


