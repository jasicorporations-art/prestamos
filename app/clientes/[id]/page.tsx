'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, DollarSign, Package, MapPin, Trash2, Navigation, Save, FileText, ScrollText, LayoutList } from 'lucide-react'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { clientesService } from '@/lib/services/clientes'
import { ventasService } from '@/lib/services/ventas'
import { pagosService } from '@/lib/services/pagos'
import { getPerfilPagoCliente, type PerfilPagoResult } from '@/lib/services/perfilPago'
import { getCuotasAtrasadasPorVentas } from '@/lib/services/cuotas'
import { formatCurrency } from '@/lib/utils/currency'
import { generarCartaSaldo } from '@/lib/services/cartaSaldo'
import { PerfilPagoStars } from '@/components/PerfilPagoStars'
import { perfilesService } from '@/lib/services/perfiles'
import { authService } from '@/lib/services/auth'
import type { Cliente, Venta, Sucursal, Pago } from '@/types'
import { toast } from '@/lib/toast'
import {
  type EstadoPagoVerificacion,
  normalizarEstadoPagoVerificacion,
} from '@/lib/estado-pago-verificacion'

type ComprobanteNotificado = {
  id: string
  id_prestamo: string
  monto: number
  foto_comprobante: string
  estado: EstadoPagoVerificacion
  fecha_notificacion: string
  motivo_rechazo?: string | null
}

export default function ClienteProfilePage() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.id as string
  
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [creditos, setCreditos] = useState<Venta[]>([])
  const [sucursales, setSucursales] = useState<Record<string, Sucursal>>({})
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCobrador, setIsCobrador] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleteClienteModalOpen, setIsDeleteClienteModalOpen] = useState(false)
  const [creditoAEliminar, setCreditoAEliminar] = useState<Venta | null>(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminPasswordCliente, setAdminPasswordCliente] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deletingCliente, setDeletingCliente] = useState(false)
  const [guardandoUbicacion, setGuardandoUbicacion] = useState(false)
  const [perfilPago, setPerfilPago] = useState<PerfilPagoResult | null>(null)
  const [perfilPagoLoading, setPerfilPagoLoading] = useState(false)
  const [historialPagos, setHistorialPagos] = useState<Pago[]>([])
  const [comprobantesNotificados, setComprobantesNotificados] = useState<ComprobanteNotificado[]>([])
  const [generandoCartaSaldoId, setGenerandoCartaSaldoId] = useState<string | null>(null)
  const [cuotasAtrasadasPorVenta, setCuotasAtrasadasPorVenta] = useState<Record<string, number>>({})
  const [resetPortalLoading, setResetPortalLoading] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [clienteData, creditosData] = await Promise.all([
        clientesService.getById(clienteId),
        ventasService.getByCliente(clienteId), // Obtiene TODOS los créditos (multi-sucursal)
      ])

      if (!clienteData) {
        toast.error('Cliente no encontrado')
        router.push('/clientes')
        return
      }

      setCliente(clienteData)
      setCreditos(creditosData || [])

      // Historial de pagos del cliente (todos sus créditos)
      if (creditosData && creditosData.length > 0) {
        try {
          const pagosPorVenta = await Promise.all(
            creditosData.map((c) => pagosService.getByVenta(c.id))
          )
          const todos = pagosPorVenta.flat()
          todos.sort((a, b) => {
            const timeA = a.fecha_hora ? new Date(a.fecha_hora).getTime() : (a.created_at ? new Date(a.created_at).getTime() : new Date(a.fecha_pago).getTime())
            const timeB = b.fecha_hora ? new Date(b.fecha_hora).getTime() : (b.created_at ? new Date(b.created_at).getTime() : new Date(b.fecha_pago).getTime())
            return timeB - timeA
          })
          setHistorialPagos(todos)
        } catch (e) {
          console.warn('Error cargando historial de pagos:', e)
          setHistorialPagos([])
        }
      } else {
        setHistorialPagos([])
      }

      // Archivo de comprobantes enviados por el cliente desde "Notificar pago"
      try {
        const { supabase } = await import('@/lib/supabase')
        const sel =
          'id,id_prestamo,monto,foto_comprobante,estado,fecha_notificacion,motivo_rechazo'
        let notifData: ComprobanteNotificado[] | null = null
        let notifErr = null as { message?: string } | null
        const q1 = await supabase
          .from('pagos_pendientes_verificacion')
          .select(sel)
          .eq('id_cliente', clienteId)
          .order('fecha_notificacion', { ascending: false })
        notifData = (q1.data || []) as ComprobanteNotificado[]
        notifErr = q1.error
        const colMissing = (msg: string) => {
          const m = (msg || '').toLowerCase()
          return (
            m.includes('42703') ||
            (m.includes('column') &&
              (m.includes('does not exist') || m.includes('not exist')))
          )
        }
        // Fallback temporal si la BD aún tiene `cliente_id` (ejecutar pagos-pendientes-verificacion.sql)
        if (notifErr?.message && colMissing(notifErr.message)) {
          const q2 = await supabase
            .from('pagos_pendientes_verificacion')
            .select(sel)
            .eq('cliente_id', clienteId)
            .order('fecha_notificacion', { ascending: false })
          notifData = (q2.data || []) as ComprobanteNotificado[]
          notifErr = q2.error
        }
        if (notifErr) {
          console.warn('Error cargando comprobantes notificados:', notifErr)
          setComprobantesNotificados([])
        } else {
          const lista = notifData || []
          const rawUrls = lista.map((c) => c.foto_comprobante).filter(Boolean)
          if (rawUrls.length > 0) {
            try {
              const session = await authService.getSession()
              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
              }
              if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`
              }
              const signRes = await fetch('/api/admin/sign-comprobante-urls', {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({ urls: rawUrls }),
              })
              if (signRes.ok) {
                const j = (await signRes.json()) as { urls?: string[] }
                const signed = j.urls || []
                let k = 0
                const merged = lista.map((c) => {
                  if (!c.foto_comprobante) return c
                  const next = signed[k]
                  k += 1
                  return { ...c, foto_comprobante: next || c.foto_comprobante }
                })
                setComprobantesNotificados(merged)
              } else {
                setComprobantesNotificados(lista)
              }
            } catch {
              setComprobantesNotificados(lista)
            }
          } else {
            setComprobantesNotificados(lista)
          }
        }
      } catch (e) {
        console.warn('Error cargando archivo de comprobantes:', e)
        setComprobantesNotificados([])
      }

      // Cuotas atrasadas por préstamo activo (para mostrar en la sección de créditos activos)
      try {
        const activosIds = (creditosData || [])
          .filter((c) => (c.saldo_pendiente ?? 0) > 0)
          .map((c) => c.id)
        if (activosIds.length > 0) {
          const atrasos = await getCuotasAtrasadasPorVentas(activosIds)
          setCuotasAtrasadasPorVenta(atrasos)
        } else {
          setCuotasAtrasadasPorVenta({})
        }
      } catch (e) {
        console.warn('Error calculando cuotas atrasadas por préstamo:', e)
        setCuotasAtrasadasPorVenta({})
      }

      // Cargar perfil de pago
      setPerfilPagoLoading(true)
      try {
        const perfil = await getPerfilPagoCliente(clienteId)
        setPerfilPago(perfil)
      } catch (e) {
        console.warn('Error cargando perfil de pago:', e)
        setPerfilPago(null)
      } finally {
        setPerfilPagoLoading(false)
      }

      // Obtener información de sucursales si hay créditos
      if (creditosData && creditosData.length > 0) {
        // Obtener IDs únicos de sucursales de forma compatible con TypeScript
        const sucursalIdsSet = new Set<string>()
        creditosData.forEach(c => {
          if (c.sucursal_id) {
            sucursalIdsSet.add(c.sucursal_id)
          }
        })
        const sucursalIds = Array.from(sucursalIdsSet)
        const sucursalesData: Record<string, Sucursal> = {}
        
        // Intentar obtener nombres de sucursales (si existe la tabla)
        try {
          const { supabase } = await import('@/lib/supabase')
          for (const sucursalId of sucursalIds) {
            if (sucursalId) {
              const { data } = await supabase
                .from('sucursales')
                .select('*')
                .eq('id', sucursalId)
                .single()
              if (data) {
                sucursalesData[sucursalId] = {
                  id: data.id,
                  nombre: data.nombre,
                  direccion: data.direccion ?? undefined,
                  telefono: data.telefono ?? undefined,
                  empresa_id: data.empresa_id,
                  activa: data.activa ?? false,
                  cobrar_domingos: data.cobrar_domingos ?? undefined,
                  created_at: data.created_at ?? undefined,
                  updated_at: data.updated_at ?? undefined,
                }
              }
            }
          }
        } catch (error) {
          console.warn('No se pudieron cargar las sucursales:', error)
        }
        
        setSucursales(sucursalesData)
      }
    } catch (error) {
      console.error('Error cargando datos del cliente:', error)
      toast.error('Error al cargar los datos del cliente')
    } finally {
      setLoading(false)
    }
  }, [clienteId, router])

  useEffect(() => {
    if (clienteId) {
      loadData()
    }
  }, [clienteId, loadData])

  useEffect(() => {
    const verificarAdmin = async () => {
      try {
        const [esAdmin, esCobrador] = await Promise.all([
          perfilesService.esAdmin(),
          perfilesService.esCobrador(),
        ])
        setIsAdmin(esAdmin)
        setIsCobrador(esCobrador)
      } catch (error) {
        console.error('Error verificando rol:', error)
        setIsAdmin(false)
        setIsCobrador(false)
      }
    }
    verificarAdmin()
  }, [])

  function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return 'N/A'
    try {
      const date = new Date(dateStr)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    } catch {
      return dateStr
    }
  }

  function getNombreSucursal(sucursalId: string | undefined): string {
    if (!sucursalId) return 'N/A'
    return sucursales[sucursalId]?.nombre || `Sucursal ${sucursalId.slice(0, 8)}`
  }

  function handleVerCredito(creditoId: string) {
    router.push(`/ventas/${creditoId}/factura`)
  }

  async function handleGenerarCartaSaldo(credito: Venta) {
    setGenerandoCartaSaldoId(credito.id)
    try {
      await generarCartaSaldo(credito)
      toast.success('Carta de Saldo generada correctamente.')
    } catch (error: any) {
      console.error('Error generando carta de saldo:', error)
      toast.error(error?.message || 'No se pudo generar la carta de saldo.')
    } finally {
      setGenerandoCartaSaldoId(null)
    }
  }

  function handleDelete(credito: Venta) {
    setCreditoAEliminar(credito)
    setAdminPassword('')
    setIsDeleteModalOpen(true)
  }

  function handleCloseDeleteModal() {
    setIsDeleteModalOpen(false)
    setCreditoAEliminar(null)
    setAdminPassword('')
  }

  async function handleConfirmDelete() {
    if (!creditoAEliminar) {
      return
    }

    if (!adminPassword.trim()) {
      toast.warning('Ingresa tu contraseña de administrador para confirmar la eliminación')
      return
    }

    try {
      setDeleting(true)

      // Verificar que la contraseña del admin sea correcta
      const user = await authService.getCurrentUser()
      if (!user || !user.email) {
        throw new Error('No se pudo obtener la información del administrador')
      }

      // Verificar contraseña intentando hacer sign in
      try {
        await authService.signIn(user.email, adminPassword)
        // Si llegamos aquí, la contraseña es correcta y la sesión sigue activa
      } catch (signInError: any) {
        // Si falla el sign in, la contraseña es incorrecta
        if (signInError.message?.includes('Invalid login credentials') || 
            signInError.message?.includes('Email not confirmed') ||
            signInError.message?.includes('contraseña') ||
            signInError.message?.includes('password')) {
          throw new Error('Contraseña incorrecta. No se puede eliminar el préstamo.')
        }
        throw new Error(`Error al verificar la contraseña: ${signInError.message || 'Error desconocido'}`)
      }

      // Si la contraseña es correcta, eliminar el préstamo
      await ventasService.eliminar(creditoAEliminar.id)

      handleCloseDeleteModal()
      loadData() // Recargar los datos para actualizar la lista
      toast.success('Préstamo eliminado correctamente')
    } catch (error: any) {
      console.error('Error eliminando préstamo:', error)
      toast.error(error.message || 'Error al eliminar el préstamo')
    } finally {
      setDeleting(false)
      setAdminPassword('')
    }
  }

  async function handleGuardarUbicacion() {
    if (!cliente) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.warning('Tu dispositivo no soporta geolocalización.')
      return
    }
    setGuardandoUbicacion(true)
    try {
      const coords = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        const timeoutId = setTimeout(() => resolve(null), 5000)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId)
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          },
          () => {
            clearTimeout(timeoutId)
            resolve(null)
          }
        )
      })
      if (!coords) {
        toast.error('No se pudo obtener la ubicación (timeout o permiso denegado).')
        return
      }
      await clientesService.update(cliente.id, {
        latitud_negocio: coords.lat,
        longitud_negocio: coords.lng,
      })
      setCliente((c) => (c ? { ...c, latitud_negocio: coords!.lat, longitud_negocio: coords!.lng } : null))
      toast.success('Ubicación del negocio guardada correctamente.')
    } catch (e: any) {
      toast.error(e?.message || 'Error al guardar la ubicación.')
    } finally {
      setGuardandoUbicacion(false)
    }
  }

  function handleComoLlegar() {
    const lat = cliente?.latitud_negocio
    const lng = cliente?.longitud_negocio
    if (lat == null || lng == null) {
      toast.warning('Primero guarda la ubicación del negocio.')
      return
    }
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
  }

  function handleDeleteCliente() {
    setAdminPasswordCliente('')
    setIsDeleteClienteModalOpen(true)
  }

  function handleCloseDeleteClienteModal() {
    setIsDeleteClienteModalOpen(false)
    setAdminPasswordCliente('')
  }

  async function handleResetPortalPassword() {
    if (
      !confirm(
        '¿Restablecer el acceso del portal web para este cliente? Podrá volver a entrar con los últimos 4 dígitos del teléfono o el PIN de solicitud (hasta que defina una nueva contraseña en el portal).'
      )
    ) {
      return
    }
    setResetPortalLoading(true)
    try {
      const session = await authService.getSession()
      const headers: Record<string, string> = {}
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
      const res = await fetch(`/api/admin/clientes/${clienteId}/reset-portal-password`, {
        method: 'POST',
        credentials: 'include',
        headers,
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'No se pudo restablecer')
      toast.success(j?.mensaje || 'Acceso del portal restablecido.')
      await loadData()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setResetPortalLoading(false)
    }
  }

  async function handleConfirmDeleteCliente() {
    if (!cliente) {
      return
    }

    if (!adminPasswordCliente.trim()) {
      toast.warning('Ingresa tu contraseña de administrador para confirmar la eliminación')
      return
    }

    try {
      setDeletingCliente(true)

      // Verificar que la contraseña del admin sea correcta
      const user = await authService.getCurrentUser()
      if (!user || !user.email) {
        throw new Error('No se pudo obtener la información del administrador')
      }

      // Verificar contraseña intentando hacer sign in
      try {
        await authService.signIn(user.email, adminPasswordCliente)
        // Si llegamos aquí, la contraseña es correcta y la sesión sigue activa
      } catch (signInError: any) {
        // Si falla el sign in, la contraseña es incorrecta
        if (signInError.message?.includes('Invalid login credentials') || 
            signInError.message?.includes('Email not confirmed') ||
            signInError.message?.includes('contraseña') ||
            signInError.message?.includes('password')) {
          throw new Error('Contraseña incorrecta. No se puede eliminar el cliente.')
        }
        throw new Error(`Error al verificar la contraseña: ${signInError.message || 'Error desconocido'}`)
      }

      // Si la contraseña es correcta, eliminar el cliente (y todos sus préstamos y pagos)
      await clientesService.eliminar(cliente.id)

      handleCloseDeleteClienteModal()
      toast.success('Cliente eliminado. Redirigiendo…')
      router.push('/clientes')
    } catch (error: any) {
      console.error('Error eliminando cliente:', error)
      toast.error(error.message || 'Error al eliminar el cliente')
    } finally {
      setDeletingCliente(false)
      setAdminPasswordCliente('')
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando información del cliente...</p>
        </div>
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-red-600">Cliente no encontrado</p>
          <Button onClick={() => router.push('/clientes')} className="mt-4">
            Volver a Clientes
          </Button>
        </div>
      </div>
    )
  }

  const creditosActivos = creditos.filter(c => c.saldo_pendiente > 0)
  const creditosFinalizados = creditos.filter(c => c.saldo_pendiente <= 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Button variant="secondary" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 mr-2 inline" />
          Volver
        </Button>
      </div>

      {/* Información del Cliente */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6 p-6">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            {cliente.nombre_completo}
          </h1>
          {isAdmin && !isCobrador && (
            <button
              onClick={handleDeleteCliente}
              className="text-red-600 hover:text-red-900 p-2"
              title="Eliminar Cliente"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Cédula:</p>
            <p className="font-medium text-gray-900">{cliente.cedula}</p>
          </div>
          {cliente.celular && (
            <div>
              <p className="text-sm text-gray-600">Celular:</p>
              <p className="font-medium text-gray-900">{cliente.celular}</p>
            </div>
          )}
          {isAdmin && !isCobrador && (
            <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900">Portal web del cliente</p>
              <p className="text-xs text-gray-600 mt-1">
                {cliente.tiene_contrasena_portal
                  ? 'El cliente inició sesión con una contraseña propia del portal. Si la olvidó, restablezca aquí para volver al acceso con últimos 4 del teléfono o PIN de solicitud.'
                  : 'Acceso al portal con últimos 4 del teléfono o PIN de solicitud. El cliente puede definir una contraseña desde el portal (Ajustes).'}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                disabled={resetPortalLoading}
                onClick={handleResetPortalPassword}
              >
                {resetPortalLoading ? 'Restableciendo...' : 'Restablecer acceso del portal'}
              </Button>
            </div>
          )}
          <div className="md:col-span-2">
            <p className="text-sm text-gray-600">Dirección:</p>
            <p className="font-medium text-gray-900">{cliente.direccion}</p>
            <div className="flex gap-2 mt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGuardarUbicacion}
                disabled={guardandoUbicacion}
              >
                <Save className="w-4 h-4 mr-1 inline" />
                {guardandoUbicacion ? 'Obteniendo...' : 'Guardar Ubicación del Negocio'}
              </Button>
              {cliente.latitud_negocio != null && cliente.longitud_negocio != null && (
                <Button variant="secondary" size="sm" onClick={handleComoLlegar}>
                  <Navigation className="w-4 h-4 mr-1 inline" />
                  Cómo llegar
                </Button>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Garante:</p>
            <p className="font-medium text-gray-900">{cliente.nombre_garante}</p>
          </div>
          {cliente.numero_prestamo_cliente && (
            <div>
              <p className="text-sm text-gray-600">No. de Producto:</p>
              <p className="font-medium text-gray-900">{cliente.numero_prestamo_cliente}</p>
            </div>
          )}
        </div>
      </div>

      {/* Perfil de Pago */}
      <div className="mb-6">
        <PerfilPagoStars perfil={perfilPago} loading={perfilPagoLoading} />
      </div>

      {/* Historial de Pagos del cliente */}
      {historialPagos.length === 0 ? (
        creditos.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Historial de Pagos</h2>
            <p className="text-gray-500 text-sm">No hay pagos registrados para este cliente.</p>
          </div>
        )
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Historial de Pagos ({historialPagos.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cuota
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {historialPagos.map((pago) => {
                  const credito = creditos.find((c) => c.id === pago.venta_id)
                  const producto = credito?.motor
                    ? `${credito.motor.marca || ''} ${credito.motor.modelo || ''}`.trim() || 'N/A'
                    : 'N/A'
                  return (
                    <tr key={pago.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{new Date(pago.fecha_pago).toLocaleDateString('es-DO')}</div>
                        <div className="text-xs text-gray-500">
                          {pago.created_at
                            ? new Date(pago.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })
                            : new Date(pago.fecha_pago).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {producto}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(pago.monto)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pago.numero_cuota !== null && pago.numero_cuota !== undefined
                          ? pago.numero_cuota
                          : <span className="text-blue-600 font-medium">Pago Inicial</span>}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Link
                            href={`/pagos/${pago.id}/recibo`}
                            className="text-primary-600 hover:text-primary-900 inline-flex items-center"
                            target="_blank"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Recibo
                          </Link>
                          {credito && (
                            <>
                              <Link
                                href={`/ventas/${pago.venta_id}/amortizacion`}
                                className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                                target="_blank"
                              >
                                <LayoutList className="w-4 h-4 mr-1" />
                                Amortización
                              </Link>
                              {credito.saldo_pendiente <= 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleGenerarCartaSaldo(credito)}
                                  disabled={generandoCartaSaldoId === credito.id}
                                  className="text-green-600 hover:text-green-900 inline-flex items-center disabled:opacity-50"
                                  title="Generar Carta de Saldo (préstamo saldado)"
                                >
                                  <ScrollText className={`w-4 h-4 mr-1 ${generandoCartaSaldoId === credito.id ? 'animate-pulse' : ''}`} />
                                  {generandoCartaSaldoId === credito.id ? 'Generando...' : 'Carta de saldo'}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Archivo de comprobantes notificados por el cliente */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Archivo de Comprobantes Notificados ({comprobantesNotificados.length})
          </h2>
          <p className="text-sm text-gray-500 mt-1">Evidencias enviadas por el cliente desde el portal de autogestión.</p>
        </div>
        {comprobantesNotificados.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No hay comprobantes notificados por este cliente.</div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comprobantesNotificados.map((c) => (
              <div key={c.id} className="border rounded-lg p-3">
                <a href={c.foto_comprobante} target="_blank" rel="noreferrer" className="block">
                  <img src={c.foto_comprobante} alt="Comprobante notificado" className="w-full h-40 object-cover rounded-md border" />
                </a>
                <div className="mt-2 text-sm space-y-1">
                  <p><strong>Monto:</strong> {formatCurrency(Number(c.monto || 0))}</p>
                  <p><strong>Préstamo:</strong> {String(c.id_prestamo).slice(0, 8)}</p>
                  <p><strong>Fecha:</strong> {new Date(c.fecha_notificacion).toLocaleString('es-DO')}</p>
                  <p>
                    <strong>Estado:</strong>{' '}
                    <span className={c.estado === 'Verificado' ? 'text-emerald-700' : c.estado === 'Rechazado' ? 'text-red-700' : 'text-amber-700'}>
                      {c.estado}
                    </span>
                  </p>
                  {c.estado === 'Rechazado' && c.motivo_rechazo && (
                    <p className="text-red-700"><strong>Motivo:</strong> {c.motivo_rechazo}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Créditos Activos */}
      {creditosActivos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Créditos Activos ({creditosActivos.length})
          </h2>
          <div className="space-y-4">
            {creditosActivos.map((credito) => (
              <div
                key={credito.id}
                className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                  credito.tipo_garantia && credito.tipo_garantia !== 'Ninguna'
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-gray-200'
                }`}
              >
                {credito.tipo_garantia && credito.tipo_garantia !== 'Ninguna' && (
                  <div className="mb-3 rounded-md bg-emerald-100 border border-emerald-300 px-3 py-2">
                    <p className="text-sm font-semibold text-emerald-800">
                      Respaldo: {credito.tipo_garantia}
                      {credito.valor_estimado != null && credito.valor_estimado > 0 && (
                        <span className="font-normal ml-1">
                          (${credito.valor_estimado.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                        </span>
                      )}
                    </p>
                    {credito.descripcion_garantia && (
                      <p className="text-xs text-emerald-700 mt-0.5 truncate" title={credito.descripcion_garantia}>
                        {credito.descripcion_garantia}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {credito.motor?.marca || 'N/A'} {credito.motor?.modelo || ''}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Sucursal: {getNombreSucursal(credito.sucursal_id)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleVerCredito(credito.id)}
                      className="text-sm px-3 py-1"
                    >
                      Ver Detalles
                    </Button>
                    {isAdmin && !isCobrador && (
                      <button
                        onClick={() => handleDelete(credito)}
                        className="text-red-600 hover:text-red-900 p-2"
                        title="Eliminar Préstamo"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-600">Monto Total:</p>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(credito.monto_total)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Saldo Pendiente:</p>
                    <p className="font-medium text-red-600">
                      {formatCurrency(credito.saldo_pendiente)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cuotas:</p>
                    <p className="font-medium text-gray-900">
                      {credito.cantidad_cuotas}
                    </p>
                  </div>
                  <div className="md:col-span-1">
                    <p className="text-sm text-gray-600">Cuotas en atraso:</p>
                    {cuotasAtrasadasPorVenta[credito.id] ? (
                      <p className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                        {cuotasAtrasadasPorVenta[credito.id]} cuota
                        {cuotasAtrasadasPorVenta[credito.id] > 1 ? 's' : ''} atrasada
                      </p>
                    ) : (
                      <p className="font-medium text-emerald-600">Al día</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha:</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(credito.fecha_venta)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Créditos Finalizados */}
      {creditosFinalizados.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Créditos Finalizados ({creditosFinalizados.length})
          </h2>
          <div className="space-y-4">
            {creditosFinalizados.map((credito) => (
              <div
                key={credito.id}
                className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                  credito.tipo_garantia && credito.tipo_garantia !== 'Ninguna'
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                {credito.tipo_garantia && credito.tipo_garantia !== 'Ninguna' && (
                  <div className="mb-3 rounded-md bg-emerald-100/80 border border-emerald-200 px-3 py-2">
                    <p className="text-sm font-semibold text-emerald-800">
                      Respaldo: {credito.tipo_garantia}
                      {credito.valor_estimado != null && credito.valor_estimado > 0 && (
                        <span className="font-normal ml-1">
                          (${credito.valor_estimado.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                        </span>
                      )}
                    </p>
                  </div>
                )}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {credito.motor?.marca || 'N/A'} {credito.motor?.modelo || ''}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Sucursal: {getNombreSucursal(credito.sucursal_id)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleVerCredito(credito.id)}
                      className="text-sm px-3 py-1"
                    >
                      Ver Detalles
                    </Button>
                    {isAdmin && !isCobrador && (
                      <button
                        onClick={() => handleDelete(credito)}
                        className="text-red-600 hover:text-red-900 p-2"
                        title="Eliminar Préstamo"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-600">Monto Total:</p>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(credito.monto_total)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estado:</p>
                    <p className="font-medium text-green-600">
                      Pagado
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cuotas:</p>
                    <p className="font-medium text-gray-900">
                      {credito.cantidad_cuotas}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha:</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(credito.fecha_venta)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {creditos.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
          <p className="text-gray-500">Este cliente no tiene créditos registrados.</p>
        </div>
      )}

      {/* Modal para confirmar eliminación de préstamo */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title={`Eliminar Préstamo`}
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
            <p className="text-sm text-red-700 font-semibold mb-2">
              ⚠️ Esta acción no se puede deshacer
            </p>
            <p className="text-sm text-red-700">
              El préstamo y todos sus pagos asociados serán eliminados permanentemente del sistema.
            </p>
          </div>

          {creditoAEliminar && (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Préstamo a eliminar:</strong>
              </p>
              <p className="text-sm text-gray-600">
                <strong>Cliente:</strong> {cliente?.nombre_completo || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Motor:</strong> {creditoAEliminar.motor?.marca || 'N/A'} {creditoAEliminar.motor?.modelo || ''}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Monto Total:</strong> {formatCurrency(creditoAEliminar.monto_total)}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Saldo Pendiente:</strong> {formatCurrency(creditoAEliminar.saldo_pendiente)}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Cuotas:</strong> {creditoAEliminar.cantidad_cuotas}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Sucursal:</strong> {getNombreSucursal(creditoAEliminar.sucursal_id)}
              </p>
              {creditoAEliminar.saldo_pendiente > 0 && (
                <p className="text-sm text-red-600 font-semibold mt-2">
                  ⚠️ Este préstamo tiene saldo pendiente de {formatCurrency(creditoAEliminar.saldo_pendiente)}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña de Administrador <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Ingresa tu contraseña para confirmar"
              required
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              Por seguridad, debes ingresar tu contraseña de administrador para confirmar la eliminación.
            </p>
          </div>

          <div className="btn-actions">
            <Button 
              variant="secondary" 
              onClick={handleCloseDeleteModal}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmDelete}
              disabled={deleting || !adminPassword.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Eliminando...' : 'Eliminar Préstamo'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal para confirmar eliminación de cliente */}
      <Modal
        isOpen={isDeleteClienteModalOpen}
        onClose={handleCloseDeleteClienteModal}
        title={`Eliminar Cliente`}
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
            <p className="text-sm text-red-700 font-semibold mb-2">
              ⚠️ Esta acción no se puede deshacer
            </p>
            <p className="text-sm text-red-700">
              El cliente, todos sus préstamos y todos los pagos asociados serán eliminados permanentemente del sistema.
            </p>
          </div>

          {cliente && (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Cliente a eliminar:</strong>
              </p>
              <p className="text-sm text-gray-600">
                <strong>Nombre:</strong> {cliente.nombre_completo}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Cédula:</strong> {cliente.cedula}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Celular:</strong> {cliente.celular || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Préstamos asociados:</strong> {creditos.length}
              </p>
              {creditos.length > 0 && (
                <>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Préstamos activos:</strong> {creditosActivos.length}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Préstamos finalizados:</strong> {creditosFinalizados.length}
                  </p>
                  {creditosActivos.length > 0 && (
                    <p className="text-sm text-red-600 font-semibold mt-2">
                      ⚠️ Este cliente tiene {creditosActivos.length} préstamo(s) activo(s) con saldo pendiente
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña de Administrador <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              value={adminPasswordCliente}
              onChange={(e) => setAdminPasswordCliente(e.target.value)}
              placeholder="Ingresa tu contraseña para confirmar"
              required
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              Por seguridad, debes ingresar tu contraseña de administrador para confirmar la eliminación.
            </p>
          </div>

          <div className="btn-actions">
            <Button 
              variant="secondary" 
              onClick={handleCloseDeleteClienteModal}
              disabled={deletingCliente}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmDeleteCliente}
              disabled={deletingCliente || !adminPasswordCliente.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingCliente ? 'Eliminando...' : 'Eliminar Cliente'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
