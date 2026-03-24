'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Printer, ArrowLeft, Mail, MessageCircle } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/Button'
import { ventasService } from '@/lib/services/ventas'
import { authService } from '@/lib/services/auth'
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/lib/utils/compania'
import type { Venta } from '@/types'
import { formatDateCustom } from '@/lib/utils/dateFormat'
import { formatCurrency } from '@/lib/utils/currency'

// Función para calcular fechas de pago semanal
function calcularFechasPagoSemanal(diaSemana: number, cantidadSemanas: number, fechaInicio: Date): Date[] {
  const fechas: Date[] = []
  const fechaBase = new Date(fechaInicio)
  
  // Calcular días hasta el próximo día de pago
  const diaActual = fechaBase.getDay()
  let diasHastaProximoPago = diaSemana - diaActual
  if (diasHastaProximoPago <= 0) {
    diasHastaProximoPago += 7
  }
  
  // Primera fecha de pago
  const primeraFecha = new Date(fechaBase)
  primeraFecha.setDate(fechaBase.getDate() + diasHastaProximoPago)
  
  // Calcular todas las fechas
  for (let i = 0; i < cantidadSemanas; i++) {
    const fecha = new Date(primeraFecha)
    fecha.setDate(primeraFecha.getDate() + (i * 7))
    fechas.push(fecha)
  }
  
  return fechas
}

// Función para calcular fechas de pago quincenal
function calcularFechasPagoQuincenal(fechaInicio: string, cantidadQuincenas: number): Date[] {
  const fechas: Date[] = []
  const fechaBase = new Date(fechaInicio)
  
  for (let i = 0; i < cantidadQuincenas; i++) {
    const fecha = new Date(fechaBase)
    fecha.setDate(fechaBase.getDate() + (i * 15))
    fechas.push(fecha)
  }
  
  return fechas
}

// Función para calcular fechas de pago mensual
function calcularFechasPagoMensual(diaMes: number, cantidadMeses: number, fechaInicio: Date): Date[] {
  const fechas: Date[] = []
  const fechaBase = new Date(fechaInicio)
  
  for (let i = 0; i < cantidadMeses; i++) {
    const fecha = new Date(fechaBase)
    fecha.setMonth(fechaBase.getMonth() + i)
    
    // Ajustar el día si el mes tiene menos días
    const ultimoDiaDelMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate()
    const diaPago = Math.min(diaMes, ultimoDiaDelMes)
    fecha.setDate(diaPago)
    
    fechas.push(fecha)
  }
  
  return fechas
}

export default function AmortizacionPage() {
  const params = useParams()
  const router = useRouter()
  const ventaId = params.id as string
  const [venta, setVenta] = useState<Venta | null>(null)
  const [loading, setLoading] = useState(true)
  const [cuotas, setCuotas] = useState<Array<{
    id: string
    numero_cuota: number
    fecha_pago: string
    cuota_fija: number
    interes_mes: number
    abono_capital: number
    saldo_pendiente: number
  }>>([])
  const [userInfo, setUserInfo] = useState<{
    nombre?: string
    apellido?: string
    direccion?: string
    compania?: string
    telefono?: string
    email?: string
  } | null>(null)
  const [nombreEmpresa, setNombreEmpresa] = useState<string | null>(null)
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState(false)

  useEffect(() => {
    if (ventaId) {
      loadData()
      loadUserInfo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventaId])

  async function loadUserInfo() {
    try {
      const user = await authService.getCurrentUser()
      if (user?.user_metadata) {
        setUserInfo({
          nombre: user.user_metadata.nombre,
          apellido: user.user_metadata.apellido,
          direccion: user.user_metadata.direccion,
          compania: user.user_metadata.compania,
          telefono: user.user_metadata.telefono,
          email: user.email,
        })
      }
    } catch (error) {
      console.error('Error cargando información del usuario:', error)
    }
  }

  async function loadData() {
    try {
      setLoading(true)
      const ventaData = await ventasService.getById(ventaId)
      setVenta(ventaData)

      if (ventaData?.id) {
        const { data: cuotasData, error } = await supabase
          .from('cuotas_detalladas')
          .select('*')
          .eq('venta_id', ventaData.id)
          .order('numero_cuota', { ascending: true })
        if (error) {
          console.warn('No se pudieron cargar cuotas detalladas:', error)
          setCuotas([])
        } else {
          setCuotas((cuotasData || []) as any)
        }
      }
      // Nombre de empresa desde BD para impresión (nunca mostrar UUID)
      const empresaId = (ventaData as { empresa_id?: string; compania_id?: string })?.empresa_id ?? (ventaData as { empresa_id?: string; compania_id?: string })?.compania_id
      if (empresaId) {
        try {
          const { data: emp } = await supabase.from('empresas').select('nombre').eq('id', empresaId).single() as { data: { nombre?: string } | null }
          if (emp?.nombre) setNombreEmpresa(emp.nombre)
        } catch (e) {
          console.warn('No se pudo cargar nombre de empresa para amortización:', e)
        }
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar los datos de la amortización')
    } finally {
      setLoading(false)
    }
  }

  function handlePrint(e?: React.MouseEvent<HTMLButtonElement>) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    try {
      if (!venta) {
        toast.error('No se puede imprimir. La amortización no está cargada completamente.')
        return
      }

      if (typeof window === 'undefined' || typeof window.print !== 'function') {
        toast.error('window.print no está disponible en este entorno.')
        return
      }

      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            window.print()
          } catch (error) {
            console.error('Error al llamar window.print():', error)
            toast.error(`Error al abrir el diálogo de impresión: ${error instanceof Error ? error.message : 'Error desconocido'}`)
          }
        }, 200)
      })
    } catch (error) {
      console.error('Error en handlePrint:', error)
      toast.error(`Error al preparar la impresión: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  async function handleEnviarPorCorreo() {
    if (!ventaId || !venta) return
    setEnviandoEmail(true)
    try {
      const session = await authService.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch('/api/enviar-amortizacion-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          venta_id: ventaId,
          cliente_email: (venta as any)?.cliente?.email,
          cliente_nombre: (venta as any)?.cliente?.nombre_completo,
          empresa_id: (venta as any)?.empresa_id ?? (venta as any)?.compania_id ?? null,
        }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.enviado) {
        toast.success('Amortización enviada por correo al cliente correctamente.')
      } else {
        const msg = data.mensaje || data.error || 'No se pudo enviar el correo.'
        toast.error(msg)
      }
    } catch (e) {
      console.error('Error enviando amortización por correo:', e)
      toast.error('Error al enviar el correo. Intenta de nuevo.')
    } finally {
      setEnviandoEmail(false)
    }
  }

  async function handleEnviarPorWhatsApp() {
    if (!ventaId || !venta) return
    setEnviandoWhatsApp(true)
    try {
      const session = await authService.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch('/api/enviar-amortizacion-whatsapp', {
        method: 'POST',
        headers,
        body: JSON.stringify({ venta_id: ventaId }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.enviado) {
        toast.success('Amortización enviada por WhatsApp al cliente correctamente.')
      } else {
        const msg = data.error || data.mensaje || (res.status === 403 ? 'Activa WhatsApp en Conexión WhatsApp para enviar.' : 'No se pudo enviar por WhatsApp.')
        toast.error(msg)
      }
    } catch (e) {
      console.error('Error enviando amortización por WhatsApp:', e)
      toast.error('Error al enviar por WhatsApp. Intenta de nuevo.')
    } finally {
      setEnviandoWhatsApp(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando amortización...</p>
        </div>
      </div>
    )
  }

  if (!venta) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Financiamiento no encontrado</p>
          <Button variant="secondary" onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="w-5 h-5 mr-2 inline" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  // Si está pendiente de aprobación, no mostrar amortización hasta que el admin la apruebe
  if (venta.status === 'pending') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="no-print mb-4">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5 mr-2 inline" />
            Volver
          </Button>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold text-amber-900 mb-2">
            Amortización pendiente de aprobación
          </h2>
          <p className="text-amber-800">
            La amortización estará disponible cuando el administrador apruebe el financiamiento.
          </p>
          <p className="text-amber-700 text-sm mt-4">
            Este préstamo fue emitido y está en espera de aprobación. Una vez aprobado, podrás ver e imprimir el cronograma de pagos desde aquí.
          </p>
        </div>
      </div>
    )
  }

  const cliente = venta.cliente || null
  const motor = venta.motor || null

  const fotosProductoUrls = (() => {
    const raw = (motor as { urls_fotos?: unknown } | null)?.urls_fotos
    if (raw == null) return [] as string[]
    if (Array.isArray(raw)) return raw.filter((u): u is string => typeof u === 'string' && u.length > 0)
    return [] as string[]
  })()

  // Calcular fechas de pago según el tipo de plazo
  let fechasPago: Date[] = []
  const fechaVenta = new Date(venta.fecha_venta)

  if (venta.tipo_plazo === 'semanal' && venta.dia_pago_semanal !== undefined && venta.cantidad_cuotas) {
    fechasPago = calcularFechasPagoSemanal(venta.dia_pago_semanal, venta.cantidad_cuotas, fechaVenta)
  } else if (venta.tipo_plazo === 'quincenal' && venta.fecha_inicio_quincenal && venta.cantidad_cuotas) {
    fechasPago = calcularFechasPagoQuincenal(venta.fecha_inicio_quincenal, venta.cantidad_cuotas)
  } else if (venta.tipo_plazo === 'mensual' && venta.dia_pago_mensual !== undefined && venta.cantidad_cuotas) {
    fechasPago = calcularFechasPagoMensual(venta.dia_pago_mensual, venta.cantidad_cuotas, fechaVenta)
  }

  const totalIntereses = cuotas.reduce((sum, c) => sum + (c.interes_mes || 0), 0)
  const totalCuotas = cuotas.reduce((sum, c) => sum + (c.cuota_fija || 0), 0)
  const montoFinanciado = cuotas.reduce((sum, c) => sum + (c.abono_capital || 0), 0)
  const saldoFinanciar = venta.saldo_pendiente ?? montoFinanciado

  // Monto Base = precio del motor (punto de partida real). Fallback para ventas antiguas.
  const montoBase = venta.motor?.precio_venta ?? (() => {
    const porcentajeCargoManejo = 4.5
    const interesAplicado = venta.porcentaje_interes || 0
    return interesAplicado > 0
      ? venta.monto_total / (1 + (interesAplicado / 100) + (porcentajeCargoManejo / 100))
      : venta.monto_total / (1 + (porcentajeCargoManejo / 100))
  })()
  // Cargo por manejo: 4.5% sobre el monto base inicial (nunca sobre monto inflado)
  const porcentajeCargoManejo = 4.5
  const cargoManejo = (montoBase * porcentajeCargoManejo) / 100
  // Interés total: suma de interes_mes de las cuotas (amortización francesa)
  const montoInteres = totalIntereses
  const interesAplicado = venta.porcentaje_interes || 0

  // Nombres de los días de la semana
  const nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  // Nombre para impresión: solo desde BD o texto que no sea UUID
  const displayNombreEmpresa =
    nombreEmpresa ??
    (userInfo?.compania && !isValidUUID(userInfo.compania) ? userInfo.compania : null) ??
    'JasiCorporations'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="no-print mb-4 flex flex-wrap justify-between items-center gap-2">
        <Button variant="secondary" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 mr-2 inline" />
          Volver
        </Button>
        <div className="flex gap-2">
          <Button
            onClick={handleEnviarPorCorreo}
            type="button"
            disabled={enviandoEmail}
            aria-label="Enviar amortización por correo"
          >
            <Mail className="w-5 h-5 mr-2 inline" />
            {enviandoEmail ? 'Enviando...' : 'Enviar por correo'}
          </Button>
          <Button
            onClick={handleEnviarPorWhatsApp}
            type="button"
            disabled={enviandoWhatsApp}
            aria-label="Enviar amortización por WhatsApp"
          >
            <MessageCircle className="w-5 h-5 mr-2 inline" />
            {enviandoWhatsApp ? 'Enviando...' : 'Enviar por WhatsApp'}
          </Button>
          <Button
            onClick={handlePrint}
            type="button"
            aria-label="Imprimir amortización"
          >
            <Printer className="w-5 h-5 mr-2 inline" />
            Imprimir Amortización
          </Button>
        </div>
      </div>

      <div className="bg-white shadow-lg p-8 print:shadow-none print:p-6">
        {/* Encabezado de la Empresa */}
        <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            JASICORPORATIONS
          </h1>
          {(userInfo || displayNombreEmpresa) && (
            <div className="text-sm text-gray-600 space-y-1 mt-4">
              {displayNombreEmpresa && !/jasicorporation/i.test(displayNombreEmpresa) && (
                <p className="text-3xl font-bold text-gray-900 mb-2">{displayNombreEmpresa}</p>
              )}
              {(userInfo.nombre || userInfo.apellido) && (
                <p>
                  {userInfo.nombre} {userInfo.apellido}
                </p>
              )}
              {userInfo.direccion && (
                <p>{userInfo.direccion}</p>
              )}
              {userInfo.telefono && (
                <p>Teléfono: {userInfo.telefono}</p>
              )}
              {userInfo.email && (
                <p>Email: {userInfo.email}</p>
              )}
            </div>
          )}
        </div>

        {/* Título */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">AMORTIZACIÓN DE FINANCIAMIENTO</h2>
          <p className="text-gray-600 mt-2">Número de Financiamiento: {motor?.numero_chasis || venta.id.slice(0, 8).toUpperCase()}</p>
        </div>

        {/* Garantía - Resaltada si existe */}
        {venta.tipo_garantia && venta.tipo_garantia !== 'Ninguna' && (
          <div className="mb-6 rounded-lg border-2 border-emerald-400 bg-emerald-50 p-4">
            <h3 className="text-lg font-semibold text-emerald-900 mb-2 flex items-center gap-2">
              <span className="inline-block w-2 h-6 bg-emerald-500 rounded" />
              Préstamo Respaldo por Garantía
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-emerald-900">
              <div>
                <p className="text-sm text-emerald-700">Tipo:</p>
                <p className="font-medium">{venta.tipo_garantia}</p>
              </div>
              {venta.valor_estimado != null && venta.valor_estimado > 0 && (
                <div>
                  <p className="text-sm text-emerald-700">Valor Estimado:</p>
                  <p className="font-medium">${formatCurrency(venta.valor_estimado)}</p>
                </div>
              )}
              {venta.descripcion_garantia && (
                <div className="md:col-span-2">
                  <p className="text-sm text-emerald-700">Descripción:</p>
                  <p className="font-medium">{venta.descripcion_garantia}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Información del Cliente */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Datos del Cliente</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Nombre Completo:</p>
              <p className="font-medium">{cliente?.nombre_completo || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cédula:</p>
              <p className="font-medium">{cliente?.cedula || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-600">Dirección:</p>
              <p className="font-medium">{cliente?.direccion || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Cálculo de Financiamiento */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Cálculo de Financiamiento</h3>
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Monto Base:</p>
                <p className="font-semibold text-lg">${formatCurrency(montoBase)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Interés ({interesAplicado}%):</p>
                <p className="font-semibold text-lg">${formatCurrency(montoInteres)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cargo por Manejo del Financiamiento ({porcentajeCargoManejo}%):</p>
                <p className="font-semibold text-lg text-purple-600">${formatCurrency(cargoManejo)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monto Total:</p>
                <p className="font-bold text-xl text-green-600">${formatCurrency(venta.monto_total)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Saldo a Financiar:</p>
                <p className="font-bold text-xl text-blue-600">${formatCurrency(saldoFinanciar)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detalles del Producto */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Detalles del Producto</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Número de Financiamiento:</p>
              <p className="font-medium">{motor?.numero_chasis || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tipo de Plazo:</p>
              <p className="font-medium">
                {venta.tipo_plazo === 'semanal' ? 'Semanal' : 
                 venta.tipo_plazo === 'quincenal' ? 'Quincenal' : 
                 'Mensual'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Día de Pagos:</p>
              <p className="font-medium">
                {venta.tipo_plazo === 'semanal' && venta.dia_pago_semanal !== undefined
                  ? nombresDias[venta.dia_pago_semanal]
                  : venta.tipo_plazo === 'mensual' && venta.dia_pago_mensual !== undefined
                  ? `Día ${venta.dia_pago_mensual} de cada mes`
                  : venta.tipo_plazo === 'quincenal' && venta.fecha_inicio_quincenal
                  ? `Cada 15 días desde ${formatDateCustom(venta.fecha_inicio_quincenal, 'dd/MM/yyyy')}`
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cantidad de Cuotas:</p>
              <p className="font-medium">{venta.cantidad_cuotas}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Monto Financiado:</p>
              <p className="font-semibold text-lg">
                ${formatCurrency(montoFinanciado)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tasa de Interés Anual:</p>
              <p className="font-medium">{venta.porcentaje_interes || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total de Intereses:</p>
              <p className="font-semibold text-lg">
                ${formatCurrency(totalIntereses)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Costo Total:</p>
              <p className="font-semibold text-lg">
                ${formatCurrency(totalCuotas)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Fecha de Emisión:</p>
              <p className="font-medium">{formatDateCustom(venta.fecha_venta, 'dd/MM/yyyy')}</p>
            </div>
          </div>

          {fotosProductoUrls.length > 0 && (
            <div className="no-print mt-4 border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-800 mb-2">Fotos del producto</p>
              <div className="flex flex-wrap gap-2">
                {fotosProductoUrls.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-lg border border-gray-200 shadow-sm hover:opacity-90"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-24 w-24 object-cover sm:h-28 sm:w-28" loading="lazy" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabla de Amortización */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Cronograma de Pagos</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cuota
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interés
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capital
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {cuotas.length > 0 ? (
                  cuotas.map((cuota, index) => (
                    <tr key={cuota.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cuota.numero_cuota}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDateCustom(cuota.fecha_pago, 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                        ${formatCurrency(Number(cuota.cuota_fija))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        ${formatCurrency(Number(cuota.interes_mes))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        ${formatCurrency(Number(cuota.abono_capital))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        ${formatCurrency(Number(cuota.saldo_pendiente))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                      No hay cuotas detalladas registradas. Ejecuta el script SQL y vuelve a emitir el financiamiento.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-sm font-bold text-gray-900">
                    TOTAL
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                    ${formatCurrency(totalCuotas)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Pie de página */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>Gracias por confiar en nosotros</p>
          <p className="mt-2">{displayNombreEmpresa}</p>
          <p className="mt-1">Fecha de impresión: {formatDateCustom(new Date().toISOString(), 'dd/MM/yyyy')}</p>
        </div>
      </div>
    </div>
  )
}

