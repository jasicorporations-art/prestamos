import { authService } from '@/lib/services/auth'

export type UploadFotosProductoParams = {
  motorId: string
  /** Si existe, la ruta en Storage es empresa_id/venta_id/ (préstamo emitido) */
  ventaId?: string | null
  files: File[]
}

/**
 * Sube fotos del producto vía API (Storage + actualización de motores.urls_fotos).
 * Requiere sesión (cookies o Bearer).
 */
export async function uploadFotosProductoCliente(params: UploadFotosProductoParams): Promise<string[]> {
  const { motorId, ventaId, files } = params
  const slice = files.slice(0, 3)
  if (slice.length === 0) return []

  await fetch('/api/storage/ensure-fotos-productos-bucket', { method: 'POST' }).catch(() => {})

  const form = new FormData()
  form.append('motor_id', motorId)
  if (ventaId) form.append('venta_id', ventaId)
  for (const f of slice) {
    form.append('files', f)
  }

  const session = await authService.getSession()
  const headers: HeadersInit = {}
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const res = await fetch('/api/storage/fotos-productos', {
    method: 'POST',
    body: form,
    credentials: 'include',
    headers,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Error ${res.status}`)
  }
  return Array.isArray(data.urls) ? data.urls : []
}
