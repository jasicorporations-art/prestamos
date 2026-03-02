'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { authService } from '@/lib/services/auth'
import { useCompania } from '@/lib/contexts/CompaniaContext'
import { perfilesService } from '@/lib/services/perfiles'
import { evaluarAceptacionLegal } from '@/lib/services/legal'
import { limpiarSesionParaReintentarLogin } from '@/lib/utils/swCleanup'
import { registrarSesionActiva, forzarCierreOtrasSesiones } from '@/lib/services/sesiones'
import { supabase } from '@/lib/supabase'
import { getAppId } from '@/lib/utils/appId'
import { authTraceReset, authTraceStart, authTraceEnd } from '@/lib/utils/authInstrumentation'
import { isValidUUID } from '@/lib/utils/compania'
import { Lock, User } from 'lucide-react'

const LOGIN_TIMEOUT_MS = 15000

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { setCompania } = useCompania()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    // Verificar si ya está autenticado
    authService.getSession().then(async (session) => {
      if (session) {
        const perfil = await perfilesService.getPerfilActual()
        if (perfil?.rol === 'super_admin') {
          router.push('/super-admin')
        } else {
          router.push('/dashboard')
        }
      }
    })
  }, [router])

  async function onSubmit(data: LoginFormData) {
    authTraceReset()
    authTraceStart('clickLogin')
    const timeoutId = setTimeout(() => {
      setError('El inicio de sesión está tardando más de lo normal. Verifica tu conexión o intenta de nuevo.')
      setLoading(false)
    }, LOGIN_TIMEOUT_MS)
    try {
      setLoading(true)
      setError('')

      authTraceStart('signInRequest')
      const authData = await authService.signIn(data.email, data.password)
      authTraceStart('signInResolved')

      const user = authData.user
      let perfil = await perfilesService.getPerfilActual()
      authTraceStart('perfilFetched')

      if (!perfil) {
        // Intentar crear perfil automáticamente (base compartida, primer usuario = Admin)
        try {
          const res = await fetch('/api/crear-perfil', { method: 'POST', credentials: 'include' })
          const data = await res.json().catch(() => ({}))
          if (data?.ok) {
            perfil = await perfilesService.getPerfilActual()
          }
        } catch (crearErr) {
          console.warn('No se pudo crear perfil automático:', crearErr)
        }
      }

      if (!perfil) {
        await supabase.auth.signOut()
        throw new Error('Tu cuenta no tiene un perfil asignado. Por favor, contacta al administrador.')
      }

      const appId = getAppId()
      // super_admin y perfiles sin app_id (creados manualmente) tienen acceso
      const appIdValido = !appId || perfil.rol === 'super_admin' || !perfil.app_id || perfil.app_id === appId
      if (!appIdValido) {
        await supabase.auth.signOut()
        throw new Error('Acceso denegado para esta plataforma')
      }

      if (!perfil.activo) {
        // Cerrar sesión si el perfil está inactivo
        await supabase.auth.signOut()
        throw new Error('Tu cuenta está desactivada. Por favor, contacta al administrador.')
      }

      // Obtener empresa_id del perfil (UUID) o user_metadata.compania solo si es UUID válido
      const metaCompania = user?.user_metadata?.compania
      const empresaId = perfil.empresa_id || (metaCompania && isValidUUID(metaCompania) ? metaCompania : null)

      // Modo mantenimiento: si la empresa está inactiva, rechazar login (solo para no super_admin)
      if (empresaId && perfil.rol !== 'super_admin') {
        try {
          const { data: empresa } = await supabase.from('empresas').select('status').eq('id', empresaId).single() as { data: { status?: string } | null }
          if (empresa?.status === 'inactive') {
            await supabase.auth.signOut()
            throw new Error('Mantenimiento: tu empresa está en mantenimiento. Contacta al administrador.')
          }
        } catch (e: any) {
          if (e?.message?.includes('Mantenimiento')) throw e
          // Si falla (ej. columna status inexistente), ignorar y continuar
        }
      }

      if (!empresaId && perfil.rol !== 'super_admin') {
        await supabase.auth.signOut()
        throw new Error('Tu cuenta no tiene una empresa asignada. Por favor, contacta al administrador.')
      }

      // Guardar la empresa del usuario en el contexto (super_admin puede no tener empresa)
      setCompania(empresaId || '')
      
      // Registrar sesión activa y cerrar otras sesiones simultáneas
      if (user?.id) {
        const nuevaSessionId = await registrarSesionActiva(user.id)
        forzarCierreOtrasSesiones(user.id, nuevaSessionId)
        console.log('✅ [login] Sesión registrada. Otras sesiones cerradas.')
      }
      
      const estadoLegal = evaluarAceptacionLegal(perfil)
      if (!estadoLegal.actualizado) {
        router.push('/aceptacion-legal')
        return
      }

      authTraceStart('uiRedirect')
      if (perfil.rol === 'super_admin') {
        router.push('/super-admin')
      } else {
        router.push('/dashboard')
      }
      authTraceEnd()
      router.refresh()
    } catch (error: any) {
      authTraceEnd()
      console.error('Error de autenticación:', error)
      setError(error.message || 'Usuario o contraseña incorrectos')
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            JASICORPORATIONS
          </h1>
          <p className="text-gray-600">Iniciar Sesión</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm space-y-2">
              <p>{error}</p>
              {error.includes('tardando más') && (
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="text-primary-600 hover:underline font-medium"
                >
                  Reintentar
                </button>
              )}
            </div>
          )}

          <div>
            <Input
              label="Usuario (Email)"
              type="email"
              placeholder="usuario@ejemplo.com"
              {...register('email')}
              error={errors.email?.message}
              autoComplete="email"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <Link
                href="/recuperar-contrasena"
                className="text-xs text-primary-600 hover:text-primary-800 font-medium underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">Sistema de Gestión de Préstamos</p>
          <Link href="/register" className="text-sm text-primary-600 hover:text-primary-800 font-medium">
            ¿No tienes cuenta? Crear una cuenta
          </Link>
          <p className="pt-2">
            <button
              type="button"
              onClick={limpiarSesionParaReintentarLogin}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              ¿Problemas al iniciar sesión? Limpiar datos y reintentar
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}




