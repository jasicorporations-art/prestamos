'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileUp, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/Button'
import { ImportacionClientes } from '@/components/ImportacionClientes'
import { perfilesService } from '@/lib/services/perfiles'

export default function ImportarClientesPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    perfilesService.esAdmin().then(setIsAdmin).catch(() => setIsAdmin(false))
  }, [])

  if (isAdmin === false) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-amber-900 mb-2">Acceso restringido</h2>
          <p className="text-amber-800 mb-6">
            Solo los administradores pueden realizar importación masiva de clientes.
          </p>
          <Button variant="secondary" onClick={() => router.push('/clientes')}>
            <ArrowLeft className="w-5 h-5 mr-2 inline" />
            Volver a Clientes
          </Button>
        </div>
      </div>
    )
  }

  if (isAdmin === null) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12 text-gray-500">Verificando permisos...</div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Button
          variant="secondary"
          onClick={() => router.push('/clientes')}
          className="mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2 inline" />
          Volver a Clientes
        </Button>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-100 rounded-lg">
            <FileUp className="w-8 h-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Importación Masiva de Clientes
            </h1>
            <p className="text-gray-600 mt-1">
              Migra tu cartera de clientes desde un archivo CSV en un solo paso
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <ImportacionClientes
          onSuccess={() => router.push('/clientes')}
          onCancel={() => router.push('/clientes')}
        />
      </div>
    </div>
  )
}
