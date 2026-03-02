'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { authService } from '@/lib/services/auth'

export default function CambiarContrasenaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mostrarContrasenaActual, setMostrarContrasenaActual] = useState(false)
  const [mostrarNuevaContrasena, setMostrarNuevaContrasena] = useState(false)
  const [mostrarConfirmarContrasena, setMostrarConfirmarContrasena] = useState(false)
  
  const [formData, setFormData] = useState({
    contrasenaActual: '',
    nuevaContrasena: '',
    confirmarContrasena: ''
  })
  
  const [errores, setErrores] = useState<Record<string, string>>({})

  function validarFormulario(): boolean {
    const nuevosErrores: Record<string, string> = {}

    if (!formData.contrasenaActual.trim()) {
      nuevosErrores.contrasenaActual = 'La contraseña actual es requerida'
    }

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

    if (formData.contrasenaActual === formData.nuevaContrasena) {
      nuevosErrores.nuevaContrasena = 'La nueva contraseña debe ser diferente a la actual'
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
      await authService.cambiarContrasena(formData.contrasenaActual, formData.nuevaContrasena)
      
      alert('✅ Contraseña cambiada exitosamente')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error cambiando contraseña:', error)
      alert(`Error: ${error.message || 'Error al cambiar la contraseña'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Button
          variant="secondary"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2 inline" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Cambiar Contraseña
        </h1>
        <p className="text-gray-600">
          Actualiza tu contraseña para mantener tu cuenta segura
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contraseña Actual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña Actual <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type={mostrarContrasenaActual ? 'text' : 'password'}
                value={formData.contrasenaActual}
                onChange={(e) => {
                  setFormData({ ...formData, contrasenaActual: e.target.value })
                  if (errores.contrasenaActual) {
                    setErrores({ ...errores, contrasenaActual: '' })
                  }
                }}
                placeholder="Ingresa tu contraseña actual"
                required
                className={errores.contrasenaActual ? 'border-red-500' : ''}
              />
              <button
                type="button"
                onClick={() => setMostrarContrasenaActual(!mostrarContrasenaActual)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {mostrarContrasenaActual ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errores.contrasenaActual && (
              <p className="mt-1 text-sm text-red-600">{errores.contrasenaActual}</p>
            )}
          </div>

          {/* Nueva Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type={mostrarNuevaContrasena ? 'text' : 'password'}
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
                onClick={() => setMostrarNuevaContrasena(!mostrarNuevaContrasena)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {mostrarNuevaContrasena ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errores.nuevaContrasena && (
              <p className="mt-1 text-sm text-red-600">{errores.nuevaContrasena}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              La contraseña debe tener al menos 6 caracteres
            </p>
          </div>

          {/* Confirmar Nueva Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Nueva Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type={mostrarConfirmarContrasena ? 'text' : 'password'}
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
                onClick={() => setMostrarConfirmarContrasena(!mostrarConfirmarContrasena)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {mostrarConfirmarContrasena ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errores.confirmarContrasena && (
              <p className="mt-1 text-sm text-red-600">{errores.confirmarContrasena}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}


