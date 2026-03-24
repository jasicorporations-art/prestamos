'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Edit, UserCheck, UserX, Users as UsersIcon, Plus, Trash2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/Button'
import { LimitReachedModal } from '@/components/LimitReachedModal'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { perfilesService } from '@/lib/services/perfiles'
import { usuariosService, type UsuarioConPerfil } from '@/lib/services/usuarios'
import { rutasService } from '@/lib/services/rutas'
import type { Ruta } from '@/types'
import { authService } from '@/lib/services/auth'
import { actividadService } from '@/lib/services/actividad'
import { subscriptionService } from '@/lib/services/subscription'
import type { Sucursal } from '@/types'
import type { PlanType } from '@/lib/config/planes'

const LIMITES_POR_PLAN: Record<string, { admin: number; vendedor: number }> = {
  TRIAL: { admin: 0, vendedor: 1 },
  BRONCE: { admin: 1, vendedor: 3 },
  PLATA: { admin: 1, vendedor: 2 },
  ORO: { admin: 3, vendedor: 8 },
  INFINITO: { admin: 5, vendedor: 15 },
}

interface UsuarioFormData {
  nombre_completo: string
  rol: 'Admin' | 'Vendedor' | 'Cobrador'
  sucursal_id: string
  ruta_id: string
}

export default function UsuariosPage() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<UsuarioConPerfil[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<UsuarioConPerfil | null>(null)
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<UsuarioConPerfil | null>(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [creatingUsuario, setCreatingUsuario] = useState(false)
  const [formData, setFormData] = useState<UsuarioFormData>({
    nombre_completo: '',
    rol: 'Vendedor',
    sucursal_id: '',
    ruta_id: '',
  })
  const [createFormData, setCreateFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nombre_completo: '',
    rol: 'Vendedor' as 'Admin' | 'Vendedor' | 'Cobrador',
    sucursal_id: '',
    ruta_id: '',
  })
  const [planType, setPlanType] = useState<PlanType | null>(null)
  const [trialUsuarioCreado, setTrialUsuarioCreado] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)

  const verificarPermisos = useCallback(async () => {
    try {
      const esAdmin = await perfilesService.esAdmin()
      console.log('🔐 Verificando permisos en Usuarios - Es Admin:', esAdmin)
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [usuariosData, sucursalesData] = await Promise.all([
        usuariosService.getAll(),
        perfilesService.getSucursales(),
      ])
      console.log('📊 Usuarios cargados:', usuariosData.length)
      console.log('🏢 Sucursales cargadas:', sucursalesData.length, sucursalesData)
      setUsuarios(usuariosData)
      setSucursales(sucursalesData)
    } catch (error) {
      console.error('Error cargando datos:', error)
      const msg = error instanceof Error ? error.message : String(error)
      toast.error('Error al cargar los datos: ' + msg)
      setUsuarios([])
      setSucursales([])
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
      loadData()
    }
  }, [isAdmin, loadData])

  useEffect(() => {
    subscriptionService.getCurrentPlan().then(setPlanType)
  }, [])

  useEffect(() => {
    if (planType === 'TRIAL') {
      subscriptionService.getTrialUsuarioCreado().then(setTrialUsuarioCreado)
    } else {
      setTrialUsuarioCreado(false)
    }
  }, [planType])

  const countAdmin = usuarios.filter((u) => (u.rol ?? '').toLowerCase() === 'admin').length
  const countVendedor = usuarios.filter((u) => (u.rol ?? '').toLowerCase() === 'vendedor').length
  const limites = planType ? LIMITES_POR_PLAN[planType] : null
  const maxAdmin = limites?.admin ?? 999
  const maxVendedor = limites?.vendedor ?? 999
  const isPlanConLimite = limites != null
  const isTrial = planType === 'TRIAL'
  const trialCupoUsado = isTrial && trialUsuarioCreado
  const puedeCrearAdmin = !isTrial && planType !== 'BRONCE' && countAdmin < maxAdmin
  const puedeCrearVendedor = countVendedor < maxVendedor && !trialCupoUsado

  async function handleEdit(usuario: UsuarioConPerfil) {
    setEditingUsuario(usuario)
    setFormData({
      nombre_completo: usuario.nombre_completo || '',
      rol: usuario.rol,
      sucursal_id: usuario.sucursal_id || '',
      ruta_id: usuario.ruta_id || '',
    })
    if (usuario.sucursal_id) {
      const rutasData = await rutasService.getRutasBySucursal(usuario.sucursal_id)
      setRutas(rutasData)
    } else {
      setRutas([])
    }
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    setIsModalOpen(false)
    setEditingUsuario(null)
    setFormData({
      nombre_completo: '',
      rol: 'Vendedor',
      sucursal_id: '',
      ruta_id: '',
    })
  }

  function handleCreate() {
    setCreateFormData({
      email: '',
      password: '',
      confirmPassword: '',
      nombre_completo: '',
      rol: 'Vendedor',
      sucursal_id: '',
      ruta_id: '',
    })
    setRutas([])
    setIsCreateModalOpen(true)
  }

  async function handleSucursalChangeCreate(sucursalId: string) {
    setCreateFormData((prev) => ({ ...prev, sucursal_id: sucursalId, ruta_id: '' }))
    if (sucursalId) {
      const rutasData = await rutasService.getRutasBySucursal(sucursalId)
      setRutas(rutasData)
      setCreateFormData((prev) => ({
        ...prev,
        ruta_id: rutasData.length > 0 ? rutasData[0].id : '',
      }))
    } else {
      setRutas([])
    }
  }

  async function handleSucursalChangeEdit(sucursalId: string) {
    setFormData((prev) => ({ ...prev, sucursal_id: sucursalId, ruta_id: '' }))
    if (sucursalId) {
      const rutasData = await rutasService.getRutasBySucursal(sucursalId)
      setRutas(rutasData)
    } else {
      setRutas([])
    }
  }

  function handleCloseCreateModal() {
    setIsCreateModalOpen(false)
    setCreateFormData({
      email: '',
      password: '',
      confirmPassword: '',
      nombre_completo: '',
      rol: 'Vendedor',
      sucursal_id: '',
      ruta_id: '',
    })
  }

  async function handleCreateUsuario() {
    if (!createFormData.email.trim()) {
      toast.error('El email es requerido')
      return
    }

    if (!createFormData.password || createFormData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (createFormData.password !== createFormData.confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    if (isTrial) {
      if (trialUsuarioCreado) {
        toast.warning('En plan de prueba solo puedes crear un usuario (vendedor). Ya utilizaste tu cupo.')
        return
      }
      if (createFormData.rol !== 'Vendedor') {
        createFormData.rol = 'Vendedor'
      }
    } else if (planType === 'BRONCE' && createFormData.rol === 'Admin') {
      toast.warning('Plan Bronce: solo puedes crear vendedores. No está permitido crear administradores.')
      return
    } else if (isPlanConLimite) {
      if (createFormData.rol === 'Admin' && countAdmin >= maxAdmin) {
        toast.warning(`Plan ${planType}: máximo ${maxAdmin} administradores. Ya tienes ${countAdmin}.`)
        return
      }
      if (createFormData.rol === 'Vendedor' && countVendedor >= maxVendedor) {
        if (planType === 'BRONCE') {
          setShowLimitModal(true)
          return
        }
        toast.warning(`Plan ${planType}: máximo ${maxVendedor} vendedores. Ya tienes ${countVendedor}.`)
        return
      }
    }

    setCreatingUsuario(true)
    try {
      const sucursalSeleccionada = createFormData.sucursal_id
        ? sucursales.find((s) => s.id === createFormData.sucursal_id)
        : null

      const { user, perfil } = await usuariosService.crearUsuario({
        email: createFormData.email.trim(),
        password: createFormData.password,
        nombre_completo: createFormData.nombre_completo.trim() || undefined,
        rol: createFormData.rol,
        sucursal_id: createFormData.sucursal_id || undefined,
        ruta_id: createFormData.ruta_id || undefined,
        empresa_id: sucursalSeleccionada?.empresa_id || undefined,
      })

      await actividadService.registrarActividad(
        'Creó un usuario',
        `Email: ${createFormData.email.trim()}, Rol: ${createFormData.rol}${createFormData.nombre_completo?.trim() ? `, Nombre: ${createFormData.nombre_completo.trim()}` : ''}`,
        'usuario',
        user?.id || perfil?.id
      )

      if (isTrial) {
        await subscriptionService.setTrialUsuarioCreadoUsed()
        setTrialUsuarioCreado(true)
      }
      handleCloseCreateModal()
      loadData()
      toast.success('Usuario creado exitosamente')
    } catch (error: any) {
      console.error('Error creando usuario:', error)
      toast.error(`Error: ${error.message || 'Error al crear el usuario'}`)
    } finally {
      setCreatingUsuario(false)
    }
  }

  async function handleSubmit() {
    try {
      if (!editingUsuario) {
        toast.error('Debe seleccionar un usuario para editar')
        return
      }

      if (planType === 'BRONCE' && formData.rol === 'Admin' && (editingUsuario.rol ?? '').toLowerCase() !== 'admin') {
        toast.warning('Plan Bronce: no está permitido promover usuarios a administrador.')
        return
      }
      if (isPlanConLimite) {
        const countAdminSinEste = (editingUsuario.rol ?? '').toLowerCase() === 'admin' ? countAdmin - 1 : countAdmin
        const countVendedorSinEste = (editingUsuario.rol ?? '').toLowerCase() === 'vendedor' ? countVendedor - 1 : countVendedor
        if (formData.rol === 'Admin' && countAdminSinEste >= maxAdmin) {
          toast.warning(`Plan ${planType}: máximo ${maxAdmin} administradores. No puedes cambiar este usuario a Admin.`)
          return
        }
        if (formData.rol === 'Vendedor' && countVendedorSinEste >= maxVendedor) {
          if (planType === 'BRONCE') {
            setShowLimitModal(true)
            return
          }
          toast.warning(`Plan ${planType}: máximo ${maxVendedor} vendedores. No puedes cambiar este usuario a Vendedor.`)
          return
        }
      }

      // Al asignar sucursal, sincronizar empresa_id (necesario para abrir caja y operar)
      const sucursalSeleccionada = formData.sucursal_id
        ? sucursales.find((s) => s.id === formData.sucursal_id)
        : null

      await usuariosService.updatePerfil(editingUsuario.id, {
        nombre_completo: formData.nombre_completo.trim() || undefined,
        rol: formData.rol,
        sucursal_id: formData.sucursal_id || undefined,
        ruta_id: formData.ruta_id || undefined,
        empresa_id: sucursalSeleccionada?.empresa_id ?? undefined,
      })

      await actividadService.registrarActividad(
        'Editó un usuario',
        `Email: ${editingUsuario.email}, Rol: ${formData.rol}${formData.nombre_completo?.trim() ? `, Nombre: ${formData.nombre_completo.trim()}` : ''}`,
        'usuario',
        editingUsuario.user_id
      )

      handleCloseModal()
      loadData()
      toast.success('Usuario actualizado correctamente')
    } catch (error: any) {
      console.error('Error actualizando usuario:', error)
      toast.error(`Error: ${error.message || 'Error al actualizar el usuario'}`)
    }
  }

  async function handleToggleActivo(usuario: UsuarioConPerfil) {
    const nuevaActivo = !usuario.activo
    const confirmacion = nuevaActivo
      ? '¿Estás seguro de que deseas activar este usuario?'
      : '¿Estás seguro de que deseas desactivar este usuario?'

    if (!confirm(confirmacion)) {
      return
    }

    try {
      await usuariosService.updatePerfil(usuario.id, {
        activo: nuevaActivo,
      })
      await actividadService.registrarActividad(
        nuevaActivo ? 'Activó un usuario' : 'Desactivó un usuario',
        `Email: ${usuario.email}`,
        'usuario',
        usuario.user_id
      )
      loadData()
      toast.success(`Usuario ${nuevaActivo ? 'activado' : 'desactivado'} correctamente`)
    } catch (error: any) {
      console.error('Error cambiando estado del usuario:', error)
      toast.error(`Error: ${error.message || 'Error al cambiar el estado del usuario'}`)
    }
  }

  function handleDelete(usuario: UsuarioConPerfil) {
    setUsuarioAEliminar(usuario)
    setAdminPassword('')
    setIsDeleteModalOpen(true)
  }

  function handleCloseDeleteModal() {
    setIsDeleteModalOpen(false)
    setUsuarioAEliminar(null)
    setAdminPassword('')
  }

  async function handleConfirmDelete() {
    if (!usuarioAEliminar) {
      return
    }

    if (!adminPassword.trim()) {
      toast.warning('Por favor, ingresa tu contraseña de administrador para confirmar la eliminación')
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
      // Si el sign in es exitoso, la contraseña es correcta
      try {
        await authService.signIn(user.email, adminPassword)
        // Si llegamos aquí, la contraseña es correcta y la sesión sigue activa
      } catch (signInError: any) {
        // Si falla el sign in, la contraseña es incorrecta
        if (signInError.message?.includes('Invalid login credentials') || 
            signInError.message?.includes('Email not confirmed') ||
            signInError.message?.includes('contraseña') ||
            signInError.message?.includes('password')) {
          throw new Error('Contraseña incorrecta. No se puede eliminar el usuario.')
        }
        throw new Error(`Error al verificar la contraseña: ${signInError.message || 'Error desconocido'}`)
      }

      // Registrar en historial antes de eliminar (para tener el dato del usuario)
      await actividadService.registrarActividad(
        'Eliminó un usuario',
        `Email: ${usuarioAEliminar.email}, Rol: ${usuarioAEliminar.rol}`,
        'usuario',
        usuarioAEliminar.user_id
      )

      // Si la contraseña es correcta, eliminar el usuario
      await usuariosService.eliminarUsuario(usuarioAEliminar.id, usuarioAEliminar.user_id)

      handleCloseDeleteModal()
      loadData()
      toast.success('Usuario eliminado correctamente')
    } catch (error: any) {
      console.error('Error eliminando usuario:', error)
      toast.error(`Error: ${error.message || 'Error al eliminar el usuario'}`)
    } finally {
      setDeleting(false)
      setAdminPassword('')
    }
  }

  function getNombreSucursal(sucursalId: string | undefined): string {
    if (!sucursalId) return 'Sin sucursal'
    const sucursal = sucursales.find(s => s.id === sucursalId)
    return sucursal?.nombre || 'Sucursal no encontrada'
  }

  function getNombreRuta(usuario: UsuarioConPerfil): string {
    if (usuario.ruta?.nombre) return usuario.ruta.nombre
    if (usuario.ruta_id) return 'Ruta asignada (no visible por filtro o vínculo roto)'
    return '—'
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-80" />
          </div>
          <div className="flex gap-4">
            <div className="h-9 w-24 bg-gray-200 rounded-md" />
            <div className="h-9 w-36 bg-gray-200 rounded-md" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
              <div className="h-9 w-9 bg-gray-200 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-40" />
                <div className="h-3 bg-gray-100 rounded w-56" />
              </div>
              <div className="h-5 w-16 bg-gray-100 rounded-full" />
              <div className="h-4 bg-gray-100 rounded w-24" />
              <div className="h-5 w-14 bg-gray-100 rounded-full" />
              <div className="flex gap-2">
                <div className="h-7 w-7 bg-gray-100 rounded" />
                <div className="h-7 w-7 bg-gray-100 rounded" />
                <div className="h-7 w-7 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
              <h3 className="text-lg font-medium text-amber-900">
                Configuración Requerida
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p className="mb-2">
                  Para gestionar usuarios, necesitas tener un perfil con rol &apos;Admin&apos; en la tabla &apos;perfiles&apos; de Supabase.
                </p>
                <p className="mb-2 font-semibold">Pasos para configurar:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Ve a Supabase Dashboard → SQL Editor</li>
                  <li>Obtén tu user_id desde Authentication → Users (busca tu email)</li>
                  <li>Abre el archivo <code className="bg-amber-100 px-1 rounded">supabase/crear-perfil-admin.sql</code></li>
                  <li>Reemplaza los valores marcados con ⚠️ y ejecuta el script</li>
                </ol>
                <div className="mt-3 p-3 bg-amber-100 rounded-lg">
                  <p className="text-xs font-semibold mb-2">Script SQL rápido:</p>
                  <pre className="text-xs overflow-x-auto">
{`-- Reemplaza estos valores:
-- v_user_id: Tu UUID de auth.users
-- v_empresa_id: Tu empresa (ej: 'JASICORPORATION')
-- v_nombre_completo: Tu nombre

-- Ve a: supabase/crear-perfil-admin.sql para el script completo`}
                  </pre>
                </div>
                <p className="mt-2 text-xs text-amber-600">
                  <strong>Nota:</strong> Si ya ejecutaste el SQL pero aún ves este mensaje, verifica en F12 (Consola) si hay errores 406.
                  Puede ser un problema de permisos RLS en Supabase.
                </p>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {isPlanConLimite && (
        <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
          <p className="text-sm text-indigo-800 font-medium">
            Plan {planType}: máximo {maxAdmin} Admin y {maxVendedor} Vendedores.
          </p>
          <p className="text-sm text-indigo-700 mt-0.5">
            Actual: {countAdmin} Admin, {countVendedor} Vendedores.
          </p>
        </div>
      )}

      {trialCupoUsado && (
        <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800 font-medium">
            Plan de prueba: solo puedes crear un usuario (vendedor). Ya utilizaste tu cupo.
          </p>
          <p className="text-sm text-amber-700 mt-0.5">
            Aunque borres ese usuario, no podrás crear más hasta que contrates un plan (Plata, Oro o Infinito).
          </p>
        </div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestión de Usuarios y Roles
          </h1>
          <p className="text-gray-600">
            Administra los usuarios del sistema, sus roles y sucursales asignadas
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5 mr-2 inline" />
            Volver
          </Button>
          <Button
            onClick={handleCreate}
            disabled={trialCupoUsado}
            title={trialCupoUsado ? 'En plan de prueba solo puedes crear un usuario (vendedor). Ya utilizaste tu cupo.' : undefined}
          >
            <Plus className="w-5 h-5 mr-2 inline" />
            Crear Usuario
          </Button>
        </div>
      </div>

      {usuarios.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2 font-medium">No hay usuarios registrados</p>
          <p className="text-sm text-gray-400">
            Crea tu primer usuario con el botón &ldquo;Crear Usuario&rdquo; arriba.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {usuarios.map((usuario) => (
              <div key={usuario.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {usuario.nombre_completo || 'Sin nombre'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{usuario.email}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {getNombreSucursal(usuario.sucursal_id)} · {getNombreRuta(usuario)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      (usuario.rol ?? '').toLowerCase() === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {(usuario.rol || '').charAt(0).toUpperCase() + (usuario.rol || '').slice(1).toLowerCase()}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      usuario.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleEdit(usuario)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => handleToggleActivo(usuario)}
                    className={`flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      usuario.activo ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' : 'text-green-600 bg-green-50 hover:bg-green-100'
                    }`}
                  >
                    {usuario.activo ? <><UserX className="w-3.5 h-3.5" /> Desactivar</> : <><UserCheck className="w-3.5 h-3.5" /> Activar</>}
                  </button>
                  <button
                    onClick={() => handleDelete(usuario)}
                    className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ruta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-indigo-700">
                            {(usuario.nombre_completo || usuario.email || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {usuario.nombre_completo || 'Sin nombre'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{usuario.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        (usuario.rol ?? '').toLowerCase() === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {(usuario.rol || '').charAt(0).toUpperCase() + (usuario.rol || '').slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{getNombreSucursal(usuario.sucursal_id)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getNombreRuta(usuario)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        usuario.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(usuario)}
                        className="text-primary-600 hover:text-primary-900 mr-3 p-1 hover:bg-primary-50 rounded transition-colors"
                        title="Editar Usuario"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActivo(usuario)}
                        className={`mr-3 p-1 rounded transition-colors ${usuario.activo ? 'text-orange-600 hover:text-orange-900 hover:bg-orange-50' : 'text-green-600 hover:text-green-900 hover:bg-green-50'}`}
                        title={usuario.activo ? 'Desactivar Usuario' : 'Activar Usuario'}
                      >
                        {usuario.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(usuario)}
                        className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar Usuario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para editar usuario */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingUsuario ? `Editar Usuario: ${editingUsuario.email}` : 'Editar Usuario'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo
            </label>
            <Input
              type="text"
              value={formData.nombre_completo}
              onChange={(e) =>
                setFormData({ ...formData, nombre_completo: e.target.value })
              }
              placeholder="Nombre del usuario"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol <span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.rol}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  rol: e.target.value as 'Admin' | 'Vendedor' | 'Cobrador',
                })
              }
              options={
                planType === 'BRONCE' && (editingUsuario?.rol ?? '').toLowerCase() === 'vendedor'
                  ? [{ value: 'Vendedor', label: 'Vendedor - Acceso estándar' }]
                  : [
                      { value: 'Admin', label: 'Admin - Acceso completo' },
                      { value: 'Vendedor', label: 'Vendedor - Acceso estándar' },
                      { value: 'Cobrador', label: 'Cobrador - Solo ruta, clientes (lectura) y registrar cobros' },
                    ]
              }
            />
            <p className="mt-1 text-xs text-gray-500">
              {planType === 'BRONCE' && (editingUsuario?.rol ?? '').toLowerCase() === 'vendedor'
                ? 'Plan Bronce: no puedes promover vendedores a administrador.'
                : planType === 'BRONCE'
                ? 'Puedes degradar un Admin a Vendedor, pero no promover a Admin.'
                : 'Admin puede gestionar usuarios, sucursales y ver historial. Vendedor tiene acceso estándar.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sucursal
            </label>
            <Select
              value={formData.sucursal_id}
              onChange={(e) => handleSucursalChangeEdit(e.target.value)}
              options={[
                { value: '', label: 'Sin sucursal asignada' },
                ...sucursales.map((sucursal) => ({
                  value: sucursal.id,
                  label: sucursal.nombre || 'Sucursal sin nombre',
                })),
              ]}
            />
            {sucursales.length === 0 && (
              <p className="mt-1 text-xs text-yellow-600">
                ⚠️ No hay sucursales disponibles. Crea sucursales primero en la página &quot;Sucursales&quot;.
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Asigna una sucursal al usuario. Los usuarios pueden ver datos de todas las sucursales, pero sus acciones se registran con la sucursal asignada.
            </p>
          </div>

          {formData.sucursal_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ruta de cobro (Mi Ruta de Hoy)
              </label>
              <Select
                value={formData.ruta_id}
                onChange={(e) => setFormData({ ...formData, ruta_id: e.target.value })}
                options={[
                  { value: '', label: 'Sin ruta asignada' },
                  ...rutas.map((ruta) => ({
                    value: ruta.id,
                    label: ruta.nombre || 'Ruta sin nombre',
                  })),
                ]}
              />
              <p className="mt-1 text-xs text-gray-500">
                Si asignas una ruta, cuando el empleado entre a &quot;Mi Ruta de Hoy&quot; solo verá los préstamos de esta ruta.
              </p>
            </div>
          )}

          {editingUsuario && (
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-xs text-gray-600">
                <strong>Email:</strong> {editingUsuario.email}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                <strong>Estado actual:</strong>{' '}
                {editingUsuario.activo ? 'Activo' : 'Inactivo'}
              </p>
            </div>
          )}

          <div className="btn-actions">
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              Guardar Cambios
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal para crear nuevo usuario */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title="Crear Nuevo Usuario"
      >
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
            <p className="text-sm text-indigo-700">
              El nuevo usuario podrá iniciar sesión con el email y contraseña que proporciones.
            </p>
            <p className="text-sm text-indigo-700 mt-1">
              Entrará a la misma compañía y tipo de negocio que la actual (Dealer, Préstamos, Electro, etc.).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              value={createFormData.email}
              onChange={(e) =>
                setCreateFormData({ ...createFormData, email: e.target.value })
              }
              placeholder="usuario@ejemplo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              value={createFormData.password}
              onChange={(e) =>
                setCreateFormData({ ...createFormData, password: e.target.value })
              }
              placeholder="Mínimo 6 caracteres"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Mínimo 6 caracteres
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Contraseña <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              value={createFormData.confirmPassword}
              onChange={(e) =>
                setCreateFormData({ ...createFormData, confirmPassword: e.target.value })
              }
              placeholder="Repite la contraseña"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo
            </label>
            <Input
              type="text"
              value={createFormData.nombre_completo}
              onChange={(e) =>
                setCreateFormData({ ...createFormData, nombre_completo: e.target.value })
              }
              placeholder="Nombre del usuario"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol <span className="text-red-500">*</span>
            </label>
            <Select
              value={createFormData.rol}
              onChange={(e) =>
                setCreateFormData({
                  ...createFormData,
                  rol: e.target.value as 'Admin' | 'Vendedor' | 'Cobrador',
                })
              }
              options={
                isTrial
                  ? [{ value: 'Vendedor', label: 'Vendedor - En plan de prueba solo puedes crear vendedores' }]
                  : planType === 'BRONCE'
                  ? [{ value: 'Vendedor', label: isPlanConLimite ? `Vendedor (${countVendedor}/${maxVendedor})` : 'Vendedor - Acceso estándar' }, { value: 'Cobrador', label: 'Cobrador - Solo ruta, clientes (lectura) y registrar cobros' }]
                  : [
                      { value: 'Admin', label: isPlanConLimite ? `Admin (${countAdmin}/${maxAdmin})` : 'Admin - Acceso completo' },
                      { value: 'Vendedor', label: isPlanConLimite ? `Vendedor (${countVendedor}/${maxVendedor})` : 'Vendedor - Acceso estándar' },
                      { value: 'Cobrador', label: 'Cobrador - Solo ruta, clientes (lectura) y registrar cobros' },
                    ]
              }
            />
            {trialCupoUsado && (
              <p className="mt-1 text-xs text-amber-600 font-medium">
                En plan de prueba solo puedes crear un usuario (vendedor). Ya utilizaste tu cupo; aunque lo borres no podrás crear más hasta que contrates un plan.
              </p>
            )}
            {isPlanConLimite && !isTrial && !puedeCrearAdmin && !puedeCrearVendedor && (
              <p className="mt-1 text-xs text-amber-600 font-medium">
                Has alcanzado el límite de usuarios del Plan {planType} ({maxAdmin} Admin + {maxVendedor} Vendedores).
              </p>
            )}
            {!isTrial && (
              <p className="mt-1 text-xs text-gray-500">
                Admin puede gestionar usuarios, sucursales y ver historial. Vendedor tiene acceso estándar.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sucursal
            </label>
            <Select
              value={createFormData.sucursal_id}
              onChange={(e) => handleSucursalChangeCreate(e.target.value)}
              options={[
                { value: '', label: 'Sin sucursal asignada' },
                ...sucursales.map((sucursal) => ({
                  value: sucursal.id,
                  label: sucursal.nombre || 'Sucursal sin nombre',
                })),
              ]}
            />
            {sucursales.length === 0 && (
              <p className="mt-1 text-xs text-yellow-600">
                ⚠️ No hay sucursales disponibles. Crea sucursales primero en la página &quot;Sucursales&quot;.
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Asigna una sucursal al usuario. Sus acciones se registrarán con esta sucursal.
            </p>
          </div>

          {createFormData.sucursal_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ruta de cobro (Mi Ruta de Hoy)
              </label>
              <Select
                value={createFormData.ruta_id}
                onChange={(e) => setCreateFormData({ ...createFormData, ruta_id: e.target.value })}
                options={[
                  { value: '', label: 'Sin ruta asignada' },
                  ...rutas.map((ruta) => ({
                    value: ruta.id,
                    label: ruta.nombre || 'Ruta sin nombre',
                  })),
                ]}
              />
              <p className="mt-1 text-xs text-gray-500">
                Si asignas una ruta, cuando el empleado entre a &quot;Mi Ruta de Hoy&quot; solo verá los préstamos de esta ruta.
              </p>
            </div>
          )}

          <div className="btn-actions">
            <Button variant="secondary" onClick={handleCloseCreateModal} disabled={creatingUsuario}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateUsuario}
              disabled={creatingUsuario || trialCupoUsado || (isPlanConLimite && !puedeCrearAdmin && !puedeCrearVendedor)}
            >
              {creatingUsuario ? 'Creando usuario…' : 'Crear Usuario'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal para confirmar eliminación de usuario */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title={`Eliminar Usuario: ${usuarioAEliminar?.email || ''}`}
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
            <p className="text-sm text-red-700 font-semibold mb-2">
              Esta acción no se puede deshacer
            </p>
            <p className="text-sm text-red-700">
              El usuario será eliminado permanentemente del sistema. Todos sus datos asociados se perderán.
            </p>
          </div>

          {usuarioAEliminar && (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Usuario a eliminar:</strong>
              </p>
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {usuarioAEliminar.email}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Nombre:</strong> {usuarioAEliminar.nombre_completo || 'Sin nombre'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Rol:</strong> {usuarioAEliminar.rol}
              </p>
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
              {deleting ? 'Eliminando...' : 'Eliminar Usuario'}
            </Button>
          </div>
        </div>
      </Modal>

      <LimitReachedModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        planType={planType}
        resourceType="vendedores"
        currentUsage={countVendedor}
        limit={maxVendedor}
      />
    </div>
  )
}

