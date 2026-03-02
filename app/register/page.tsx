'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { TerminosModal } from '@/components/TerminosModal'
import { authService } from '@/lib/services/auth'
import { empresasService } from '@/lib/services/empresas'
import { Lock, User, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const registerSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  direccion: z.string().min(1, 'La dirección es requerida'),
  compania: z.string().min(1, 'La compañía es requerida'),
  rnc: z.string().min(1, 'El RNC es requerido'),
  telefono: z.string().min(1, 'El teléfono es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Debe confirmar la contraseña'),
  terminosAceptados: z.boolean().refine((val) => val === true, {
    message: 'Debe aceptar los términos y condiciones para continuar',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState(false)
  const [terminosModalOpen, setTerminosModalOpen] = useState(false)
  const [politicaModalOpen, setPoliticaModalOpen] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      terminosAceptados: false,
    },
  })

  const terminosAceptados = watch('terminosAceptados')

  useEffect(() => {
    // Verificar si ya está autenticado
    authService.getSession().then((session) => {
      if (session) {
        router.push('/dashboard')
      }
    })
  }, [router])

  async function onSubmit(data: RegisterFormData) {
    try {
      setLoading(true)
      setError('')
      
      // Validar que el nombre de empresa sea único
      const validacionEmpresa = await empresasService.verificarEmpresaDisponible(data.compania)
      if (!validacionEmpresa.disponible) {
        setError(validacionEmpresa.mensaje || 'Esta empresa ya está registrada. Por favor, usa un nombre diferente.')
        setLoading(false)
        return
      }
      
      const signUpResult = await authService.signUp(data.email, data.password, {
        nombre: data.nombre,
        apellido: data.apellido,
        compania: data.compania,
        rnc: data.rnc,
        telefono: data.telefono,
        direccion: data.direccion,
      })

      if (signUpResult.user) {
        const token = (signUpResult as { session?: { access_token?: string } }).session?.access_token
        await fetch('/api/registro-asegurar-admin', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        setSuccess(true)
        router.push('/dashboard')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error en el registro'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Cuenta Creada Exitosamente!
          </h1>
          <p className="text-gray-600 mb-4">
            Hemos configurado tu Sucursal Principal y tu primera Ruta de cobro (Ruta A) para que puedas empezar de inmediato. Serás redirigido al Dashboard...
          </p>
          <Link href="/dashboard">
            <Button className="w-full">
              Ir al Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            JASICORPORATIONS
          </h1>
          <p className="text-gray-600">Crear Nueva Cuenta</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              placeholder="Juan"
              {...register('nombre')}
              error={errors.nombre?.message}
              required
            />
            <Input
              label="Apellido"
              placeholder="Pérez"
              {...register('apellido')}
              error={errors.apellido?.message}
              required
            />
          </div>

          <Input
            label="Dirección"
            placeholder="Calle Principal #123"
            {...register('direccion')}
            error={errors.direccion?.message}
            required
          />

          <Input
            label="Compañía"
            placeholder="Nombre de la empresa"
            {...register('compania')}
            error={errors.compania?.message}
            required
          />

          <Input
            label="RNC"
            placeholder="123-45678-9"
            {...register('rnc')}
            error={errors.rnc?.message}
            required
            helperText="Este RNC aparecerá en todos los documentos impresos (contratos, cartas de saldo, etc.)"
          />

          <Input
            label="Teléfono"
            type="tel"
            placeholder="(809) 555-1234"
            {...register('telefono')}
            error={errors.telefono?.message}
            required
          />

          <Input
            label="Email"
            type="email"
            placeholder="usuario@ejemplo.com"
            {...register('email')}
            error={errors.email?.message}
            autoComplete="email"
            required
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            error={errors.password?.message}
            autoComplete="new-password"
            required
          />

          <Input
            label="Confirmar Contraseña"
            type="password"
            placeholder="••••••••"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
            autoComplete="new-password"
            required
          />

          {/* Checkbox de Términos y Condiciones */}
          <div className="space-y-2">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('terminosAceptados', {
                  required: 'Debe aceptar los términos de servicio y la política de privacidad para continuar',
                })}
                className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                He leído y acepto los{' '}
                <button
                  type="button"
                  onClick={() => setTerminosModalOpen(true)}
                  className="text-primary-600 hover:text-primary-800 underline font-medium"
                >
                  Términos de Servicio
                </button>
                {' '}y la{' '}
                <button
                  type="button"
                  onClick={() => setPoliticaModalOpen(true)}
                  className="text-primary-600 hover:text-primary-800 underline font-medium"
                >
                  Política de Privacidad
                </button>
                {' '}de JasiCorporations.
              </span>
            </label>
            {errors.terminosAceptados && (
              <p className="text-sm text-red-600 mt-1">
                {errors.terminosAceptados.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !terminosAceptados}
            className="w-full"
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </Button>
        </form>

        {/* Modales de Términos y Política */}
        <TerminosModal
          isOpen={terminosModalOpen}
          onClose={() => setTerminosModalOpen(false)}
          tipo="terminos"
        />
        <TerminosModal
          isOpen={politicaModalOpen}
          onClose={() => setPoliticaModalOpen(false)}
          tipo="politica"
        />

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-primary-600 hover:text-primary-800 flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver al Inicio de Sesión
          </Link>
        </div>
      </div>
    </div>
  )
}

