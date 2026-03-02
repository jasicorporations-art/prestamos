import { Suspense } from 'react'
import { PreciosClient } from '@/components/PreciosClient'

export default function PreciosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <PreciosClient />
    </Suspense>
  )
}
