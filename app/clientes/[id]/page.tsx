'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, DollarSign, Package, MapPin, Trash2, Navigation, Save } from 'lucide-react'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { clientesService } from '@/lib/services/clientes'
import { ventasService } from '@/lib/services/ventas'
import { getPerfilPagoCliente, type PerfilPagoResult } from '@/lib/services/perfilPago'
import { PerfilPagoStars } from '@/components/PerfilPagoStars'
import { perfilesService } from '@/lib/services/perfiles'
import { authService } from '@/lib/services/auth'
import type { Cliente, Venta, Sucursal } from '@/types'

export default function ClienteProfilePage() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.id as string
  
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [creditos, setCreditos] = useState<Venta[]>([])
  const [sucursales, setSucursales] = useState<Record<string, Sucursal>>({})
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [clienteData, creditosData] = await Promise.all([
        clientesService.getById(clienteId),
        ventasService.getByCliente(clienteId), // Obtiene TODOS los créditos (multi-sucursal)
      ])

      if (!clienteData) {
        alert('Cliente no encontrado')
        router.push('/clientes')
        return
      }

      setCliente(clienteData)
      setCreditos(creditosData || [])

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
      alert('Error al cargar los datos del cliente')
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
        const esAdmin = await perfilesService.esAdmin()
        setIsAdmin(esAdmin)
      } catch (error) {
        console.error('Error verificando si es admin:', error)
        setIsAdmin(false)
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

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  function getNombreSucursal(sucursalId: string | undefined): string {
    if (!sucursalId) return 'N/A'
    return sucursales[sucursalId]?.nombre || `Sucursal ${sucursalId.slice(0, 8)}`
  }

  function handleVerCredito(creditoId: string) {
    router.push(`/ventas/${creditoId}/factura`)
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
      alert('Por favor, ingresa tu contraseña de administrador para confirmar la eliminación')
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
      alert('Préstamo eliminado correctamente')
    } catch (error: any) {
      console.error('Error eliminando préstamo:', error)
      alert(`Error: ${error.message || 'Error al eliminar el préstamo'}`)
    } finally {
      setDeleting(false)
      setAdminPassword('')
    }
  }

  async function handleGuardarUbicacion() {
    if (!cliente) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      alert('Tu dispositivo no soporta geolocalización.')
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
        alert('No se pudo obtener la ubicación (timeout o permiso denegado).')
        return
      }
      await clientesService.update(cliente.id, {
        latitud_negocio: coords.lat,
        longitud_negocio: coords.lng,
      })
      setCliente((c) => (c ? { ...c, latitud_negocio: coords!.lat, longitud_negocio: coords!.lng } : null))
      alert('Ubicación del negocio guardada correctamente.')
    } catch (e: any) {
      alert(e?.message || 'Error al guardar la ubicación.')
    } finally {
      setGuardandoUbicacion(false)
    }
  }

  function handleComoLlegar() {
    const lat = cliente?.latitud_negocio
    const lng = cliente?.longitud_negocio
    if (lat == null || lng == null) {
      alert('Primero guarda la ubicación del negocio.')
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

  async function handleConfirmDeleteCliente() {
    if (!cliente) {
      return
    }

    if (!adminPasswordCliente.trim()) {
      alert('Por favor, ingresa tu contraseña de administrador para confirmar la eliminación')
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
      alert('Cliente eliminado correctamente. Serás redirigido a la lista de clientes.')
      router.push('/clientes')
    } catch (error: any) {
      console.error('Error eliminando cliente:', error)
      alert(`Error: ${error.message || 'Error al eliminar el cliente'}`)
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
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            {cliente.nombre_completo}
          </h1>
          {isAdmin && (
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

      {/* Créditos Activos */}
      {creditosActivos.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6 p-6">
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
                    {isAdmin && (
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
        <div className="bg-white rounded-lg shadow p-6">
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
                    {isAdmin && (
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
        <div className="bg-white rounded-lg shadow p-6 text-center">
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
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
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
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
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
