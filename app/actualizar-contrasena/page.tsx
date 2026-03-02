import { Suspense } from 'react'
import { ActualizarContrasenaClient } from '@/components/ActualizarContrasenaClient'

export default function ActualizarContrasenaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ActualizarContrasenaClient />
    </Suspense>
  )
}
