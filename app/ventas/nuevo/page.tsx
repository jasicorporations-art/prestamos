'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/Button'
import { VentaForm } from '@/components/forms/VentaForm'

export default function NuevoPrestamoPage() {
  const router = useRouter()

  function handleSuccess() {
    // Redirigir a la página de ventas después de crear exitosamente
    router.push('/ventas')
  }

  function handleCancel() {
    // Volver a la página anterior o al dashboard
    router.back()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="secondary" onClick={handleCancel}>
          <ArrowLeft className="w-5 h-5 mr-2 inline" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Nuevo Préstamo</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <VentaForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}
