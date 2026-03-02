'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { supabase } from '@/lib/supabase'

export function ActualizarContrasenaClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [verificando, setVerificando] = useState(true)
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)
  const [exitoso, setExitoso] = useState(false)

  const [formData, setFormData] = useState({
    nuevaContrasena: '',
    confirmarContrasena: '',
  })

  const [errores, setErrores] = useState<Record<string, string>>({})

  useEffect(() => {
    async function verificarSesion() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          alert('El enlace de recuperación ha expirado o no es válido. Por favor, solicita uno nuevo.')
          router.push('/recuperar-contrasena')
          return
        }
        setVerificando(false)
      } catch (error) {
        console.error('Error verificando sesión:', error)
        alert('Error al verificar el enlace de recuperación')
        router.push('/recuperar-contrasena')
      }
    }

    verificarSesion()
  }, [router])

  function validarFormulario(): boolean {
    const nuevosErrores: Record<string, string> = {}

    if (!formData.nuevaContrasena.trim()) {
      nuevosErrores.nuevaContrasena = 'La nueva contraseña es requerida'
    } else if (formData.nuevaContrasena.length < 6) {
      nuevosErrores.nuevaContrasena = 'La contraseña debe tener al menos 6 caracteres'
    }

    if (!formData.confirmarContrasena.trim()) {
      nuevosErrores.confirmarContrasena = 'Debe confirmar la nueva contraseña'
    } else if (formData.nuevaContrasena !== formData.confirmarContrasena) {
      nuevosErrores.confirmarContrasena = 'Las contraseñas no coinciden'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validarFormulario()) {
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.updateUser({
        password: formData.nuevaContrasena,
      })

      if (error) throw error
      setExitoso(true)
    } catch (error: any) {
      console.error('Error actualizando contraseña:', error)
      alert(`Error: ${error.message || 'Error al actualizar la contraseña'}`)
    } finally {
      setLoading(false)
    }
  }

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
        <div className="text-center">
          <p className="text-gray-600">Verificando enlace de recuperación...</p>
        </div>
      </div>
    )
  }

  if (exitoso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Contraseña Actualizada</h1>
          <p className="text-gray-600 mb-6">Tu contraseña ha sido actualizada exitosamente.</p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Ir al Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Actualizar Contraseña</h1>
          <p className="text-gray-600">Ingresa tu nueva contraseña</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
            <p className="text-sm text-blue-700">
              Tu nueva contraseña debe tener al menos 6 caracteres.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type={mostrarContrasena ? 'text' : 'password'}
                value={formData.nuevaContrasena}
                onChange={(e) => {
                  setFormData({ ...formData, nuevaContrasena: e.target.value })
                  if (errores.nuevaContrasena) {
                    setErrores({ ...errores, nuevaContrasena: '' })
                  }
                }}
                placeholder="Mínimo 6 caracteres"
                required
                className={errores.nuevaContrasena ? 'border-red-500' : ''}
              />
              <button
                type="button"
                onClick={() => setMostrarContrasena(!mostrarContrasena)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {mostrarContrasena ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errores.nuevaContrasena && (
              <p className="mt-1 text-sm text-red-600">{errores.nuevaContrasena}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Nueva Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type={mostrarConfirmar ? 'text' : 'password'}
                value={formData.confirmarContrasena}
                onChange={(e) => {
                  setFormData({ ...formData, confirmarContrasena: e.target.value })
                  if (errores.confirmarContrasena) {
                    setErrores({ ...errores, confirmarContrasena: '' })
                  }
                }}
                placeholder="Confirma tu nueva contraseña"
                required
                className={errores.confirmarContrasena ? 'border-red-500' : ''}
              />
              <button
                type="button"
                onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {mostrarConfirmar ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errores.confirmarContrasena && (
              <p className="mt-1 text-sm text-red-600">{errores.confirmarContrasena}</p>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Guardando...' : 'Actualizar Contraseña'}
          </Button>
        </form>
      </div>
    </div>
  )
}
