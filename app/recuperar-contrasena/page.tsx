'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { authService } from '@/lib/services/auth'

export default function RecuperarContrasenaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico')
      return
    }

    if (!email.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido')
      return
    }

    try {
      setLoading(true)
      setError('')
      await authService.recuperarContrasena(email.trim())
      setEnviado(true)
    } catch (error: any) {
      console.error('Error enviando correo de recuperación:', error)
      setError(error.message || 'Error al enviar el correo de recuperación. Verifica tu correo electrónico.')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Correo Enviado
            </h1>
            <p className="text-green-700 font-medium mb-2">
              Enlace enviado con éxito. Revisa tu bandeja de entrada.
            </p>
            <p className="text-gray-600 mb-4">
              Hemos enviado un enlace de recuperación a:
            </p>
            <p className="text-primary-600 font-medium mb-6">
              {email}
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md text-left mb-6">
              <p className="text-sm text-blue-700">
                <strong>Instrucciones:</strong>
              </p>
              <ol className="text-sm text-blue-700 mt-2 list-decimal list-inside space-y-1">
                <li>Revisa tu bandeja de entrada</li>
                <li>Haz clic en el enlace de recuperación</li>
                <li>Sigue las instrucciones para crear una nueva contraseña</li>
              </ol>
              <p className="text-sm text-blue-700 mt-3">
                <strong>Nota:</strong> Si no recibes el correo, revisa tu carpeta de spam o correo no deseado.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setEnviado(false)
                  setEmail('')
                }}
                className="flex-1"
              >
                Enviar a Otro Correo
              </Button>
              <Link href="/login" className="flex-1">
                <Button className="w-full">
                  Volver al Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/login">
            <Button
              variant="secondary"
              className="mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2 inline" />
              Volver al Login
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Recuperar Contraseña
          </h1>
          <p className="text-gray-600">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
              <p className="text-sm text-blue-700">
                Te enviaremos un correo electrónico con un enlace para restablecer tu contraseña.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo Electrónico <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                  placeholder="tu@correo.com"
                  required
                  className={error ? 'border-red-500' : ''}
                />
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
            </Button>

            <div className="text-center pt-4">
              <Link href="/login" className="text-sm text-primary-600 hover:text-primary-700">
                ¿Recordaste tu contraseña? Inicia sesión
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

