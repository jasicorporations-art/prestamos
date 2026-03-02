'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Edit, Trash2, MapPin } from 'lucide-react'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { LimitReachedModal } from '@/components/LimitReachedModal'
import { perfilesService } from '@/lib/services/perfiles'
import { subscriptionService } from '@/lib/services/subscription'
import { supabase } from '@/lib/supabase'
import { withAppIdData } from '@/lib/utils/appId'
import { getCompaniaActual, getCompaniaActualOrFromPerfil } from '@/lib/utils/compania'
import type { Sucursal } from '@/types'
import type { PlanType } from '@/lib/config/planes'

const MAX_SUCURSALES_POR_PLAN: Record<string, number> = {
  TRIAL: 1,
  BRONCE: 1,
  PLATA: 3,
  ORO: 2,
}

interface SucursalFormData {
  nombre: string
  direccion: string
  telefono: string
  cobrar_domingos: boolean
}

export default function SucursalesPage() {
  const router = useRouter()
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSucursal, setEditingSucursal] = useState<Sucursal | null>(null)
  const [formData, setFormData] = useState<SucursalFormData>({
    nombre: '',
    direccion: '',
    telefono: '',
    cobrar_domingos: false,
  })
  const [planType, setPlanType] = useState<PlanType | null>(null)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const verificarPermisos = useCallback(async () => {
    try {
      const esAdmin = await perfilesService.esAdmin()
      console.log('🔐 Verificando permisos en Sucursales - Es Admin:', esAdmin)
      setIsAdmin(esAdmin)
      if (!esAdmin) {
        console.warn('⚠️ Usuario no es Admin. Acceso denegado.')
        setLoading(false)
      }
    } catch (error) {
      console.error('Error verificando permisos:', error)
      setIsAdmin(false)
      setLoading(false)
    }
  }, [])

  const loadSucursales = useCallback(async () => {
    try {
      setLoading(true)
      const data = await perfilesService.getSucursales()
      setSucursales(data)
    } catch (error) {
      console.error('Error cargando sucursales:', error)
      alert('Error al cargar las sucursales')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    verificarPermisos()
  }, [verificarPermisos])

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/dashboard')
    }
  }, [loading, isAdmin, router])

  useEffect(() => {
    if (isAdmin) {
      loadSucursales()
    }
  }, [isAdmin, loadSucursales])

  useEffect(() => {
    subscriptionService.getCurrentPlan().then(setPlanType)
  }, [])

  const maxSucursales = planType ? MAX_SUCURSALES_POR_PLAN[planType] : null
  const enLimiteSucursales = maxSucursales != null && sucursales.length >= maxSucursales
  const puedeCrearSucursal = maxSucursales == null || sucursales.length < maxSucursales

  function handleCreate() {
    setEditingSucursal(null)
    setFormData({
      nombre: '',
      direccion: '',
      telefono: '',
      cobrar_domingos: false,
    })
    setIsModalOpen(true)
  }

  function handleEdit(sucursal: Sucursal) {
    setEditingSucursal(sucursal)
    setFormData({
      nombre: sucursal.nombre,
      direccion: sucursal.direccion || '',
      telefono: sucursal.telefono || '',
      cobrar_domingos: sucursal.cobrar_domingos ?? false,
    })
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    setIsModalOpen(false)
    setEditingSucursal(null)
    setFormData({
      nombre: '',
      direccion: '',
      telefono: '',
      cobrar_domingos: false,
    })
  }

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    try {
      if (!formData.nombre.trim()) {
        setSubmitting(false)
        alert('El nombre de la sucursal es requerido')
        return
      }

      let empresa = getCompaniaActual() || await getCompaniaActualOrFromPerfil()
      if (!empresa) {
        setSubmitting(false)
        alert('No hay empresa seleccionada. Asegúrate de tener un perfil con empresa asignada.')
        return
      }
      empresa = String(empresa).trim()
      if (!UUID_REGEX.test(empresa)) {
        setSubmitting(false)
        alert('El ID de empresa no es válido (UUID). Cierra sesión, vuelve a iniciar y prueba de nuevo.')
        return
      }

      if (!editingSucursal && !puedeCrearSucursal) {
        setSubmitting(false)
        if (planType === 'BRONCE' || planType === 'PLATA') {
          setShowLimitModal(true)
          return
        }
        if (planType === 'ORO') {
          alert('Plan Oro: máximo 2 sucursales incluidas. Para crear otra sucursal debe pagar $100 USD adicionales por cada una. Contacte a soporte para agregar sucursales.')
        } else {
          alert(`Plan ${planType}: máximo ${maxSucursales} sucursal(es). Actualiza tu plan para agregar más sucursales.`)
        }
        return
      }

      if (editingSucursal) {
        // Actualizar sucursal existente
        const { error } = await (supabase as any)
          .from('sucursales')
          .update({
            nombre: formData.nombre.trim(),
            direccion: formData.direccion.trim() || null,
            telefono: formData.telefono.trim() || null,
            cobrar_domingos: formData.cobrar_domingos,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingSucursal.id)

        if (error) throw error
      } else {
        // Crear nueva sucursal: tabla sucursales usa empresa_id UUID
        const baseData = {
          nombre: formData.nombre.trim(),
          direccion: formData.direccion.trim() || null,
          telefono: formData.telefono.trim() || null,
          cobrar_domingos: formData.cobrar_domingos,
          empresa_id: empresa,
          activa: true,
        }
        const insertData = withAppIdData(baseData)

        const { error } = await (supabase as any).from('sucursales').insert(insertData)
        if (error) throw error
      }

      handleCloseModal()
      loadSucursales()
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string; details?: string }
      console.error('Error guardando sucursal - código Supabase:', err?.code, '| mensaje:', err?.message, '| detalles:', err?.details, '| error completo:', error)
      alert(err?.message || 'Error al guardar la sucursal. Revisa la consola (F12) para más detalles.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta sucursal?')) {
      return
    }

    try {
      // En lugar de eliminar, desactivar la sucursal
      const { error } = await (supabase as any)
        .from('sucursales')
        .update({
          activa: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error
      loadSucursales()
    } catch (error: any) {
      console.error('Error eliminando sucursal:', error)
      alert(`Error: ${error.message || 'Error al eliminar la sucursal'}`)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-md mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-yellow-800">
                Configuración Requerida
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Necesitas tener un perfil con rol &apos;Admin&apos; para gestionar sucursales.
                  Consulta INSTRUCCIONES_MULTIUSUARIO.md para configurar tu perfil de Admin.
                </p>
              </div>
            </div>
          </div>
        </div>
        <Button variant="secondary" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 mr-2 inline" />
          Volver
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-tour="sucursales">
      {maxSucursales != null && (
        <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
          <p className="text-sm text-indigo-800 font-medium">
            Plan {planType}: máximo {maxSucursales} sucursal(es) incluidas.
          </p>
          <p className="text-sm text-indigo-700 mt-0.5">
            Actual: {sucursales.length} sucursal(es).
            {planType === 'ORO' && enLimiteSucursales && ' Para agregar más: $100 USD por sucursal adicional. Contacte a soporte.'}
          </p>
        </div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestión de Sucursales
          </h1>
          <p className="text-gray-600">
            Administra las sucursales de tu empresa
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5 mr-2 inline" />
            Volver
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!puedeCrearSucursal}
            title={!puedeCrearSucursal ? (planType === 'TRIAL' ? 'Plan Trial: máximo 1 sucursal.' : planType === 'BRONCE' ? 'Plan Bronce: solo 1 sucursal.' : planType === 'PLATA' ? 'Plan Plata: máximo 3 sucursales.' : planType === 'ORO' ? 'Máximo 2 sucursales. Contacte soporte para agregar más ($100/sucursal).' : `Máximo ${maxSucursales} sucursal(es).`) : undefined}
          >
            <Plus className="w-5 h-5 mr-2 inline" />
            Nueva Sucursal
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando sucursales...</p>
        </div>
      ) : sucursales.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No hay sucursales registradas</p>
          <Button onClick={handleCreate} disabled={!puedeCrearSucursal}>
            <Plus className="w-5 h-5 mr-2 inline" />
            Crear Primera Sucursal
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dirección
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sucursales.map((sucursal) => (
                  <tr key={sucursal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sucursal.nombre}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {sucursal.direccion || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {sucursal.telefono || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          sucursal.activa
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {sucursal.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(sucursal)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                        title="Editar Sucursal"
                      >
                        <Edit className="w-5 h-5 inline" />
                      </button>
                      {sucursal.activa && (
                        <button
                          onClick={() => handleDelete(sucursal.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar Sucursal"
                        >
                          <Trash2 className="w-5 h-5 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para crear/editar sucursal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSucursal ? 'Editar Sucursal' : 'Nueva Sucursal'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la Sucursal <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              placeholder="Ej: Sucursal Norte"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <Input
              type="text"
              value={formData.direccion}
              onChange={(e) =>
                setFormData({ ...formData, direccion: e.target.value })
              }
              placeholder="Ej: Calle Principal #123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <Input
              type="text"
              value={formData.telefono}
              onChange={(e) =>
                setFormData({ ...formData, telefono: e.target.value })
              }
              placeholder="Ej: (809) 123-4567"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Cobrar en domingos</p>
              <p className="text-xs text-gray-500">Si está desactivado, las cuotas que caigan en domingo se moverán al lunes</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.cobrar_domingos}
              onClick={() => setFormData({ ...formData, cobrar_domingos: !formData.cobrar_domingos })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                formData.cobrar_domingos ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                  formData.cobrar_domingos ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="btn-actions">
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Guardando...' : editingSucursal ? 'Guardar Cambios' : 'Crear Sucursal'}
            </Button>
          </div>
        </div>
      </Modal>

      <LimitReachedModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        planType={planType}
        resourceType="sucursales"
        currentUsage={sucursales.length}
        limit={maxSucursales ?? 1}
      />
    </div>
  )
}

