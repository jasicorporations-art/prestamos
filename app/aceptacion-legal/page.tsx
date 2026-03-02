'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { authService } from '@/lib/services/auth'
import { perfilesService, invalidatePerfilCache } from '@/lib/services/perfiles'
import { evaluarAceptacionLegal, registrarAceptacionLegal } from '@/lib/services/legal'
import { LEGAL_URLS, LEGAL_VERSIONS } from '@/lib/config/legal'

export default function AceptacionLegalPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    const init = async () => {
      const session = await authService.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const perfil = await perfilesService.getPerfilActual()
      if (!perfil) {
        await authService.signOut()
        router.push('/login')
        return
      }

      const estado = evaluarAceptacionLegal(perfil)
      if (estado.actualizado) {
        router.push('/dashboard')
        return
      }

      setLoading(false)
    }

    init()
  }, [router])

  const obtenerIp = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data?.ip || null
    } catch {
      return null
    }
  }

  const onSubmit = async () => {
    if (!accepted) {
      setError('Debes aceptar los términos de servicio y la política de privacidad para continuar.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      const user = await authService.getCurrentUser()
      if (!user?.id) {
        throw new Error('No se pudo verificar la sesión.')
      }

      const ipAddress = await obtenerIp()
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null

      await registrarAceptacionLegal({
        userId: user.id,
        ipAddress,
        userAgent,
      })

      // Invalidar caché del perfil para que AuthGuard obtenga datos actualizados (terminos_aceptados, privacidad_aceptada)
      invalidatePerfilCache()
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'No se pudo registrar la aceptación legal.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-600">Cargando requisitos legales...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Aceptación legal requerida</h1>
        <p className="mt-2 text-sm text-gray-600">
          Para continuar debes aceptar los documentos legales vigentes.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Versión de términos: {LEGAL_VERSIONS.terminos} · Versión de privacidad: {LEGAL_VERSIONS.privacidad}
        </p>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <label className="mt-6 flex items-start gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span>
            He leído y acepto los{' '}
            <Link href={LEGAL_URLS.terminos} className="text-primary-600 hover:text-primary-700 underline">
              Términos de Servicio
            </Link>{' '}
            y la{' '}
            <Link href={LEGAL_URLS.privacidad} className="text-primary-600 hover:text-primary-700 underline">
              Política de Privacidad
            </Link>
            .
          </span>
        </label>

        <Button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !accepted}
          className="mt-6 w-full"
        >
          {submitting ? 'Registrando aceptación...' : 'Aceptar y continuar'}
        </Button>
      </div>
    </div>
  )
}
