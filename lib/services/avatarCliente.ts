import { supabase } from '../supabase'
import { getCompaniaActualOrFromPerfil } from '../utils/compania'

const BUCKET = 'avatars_clientes'

/**
 * Sube la foto de perfil de un cliente a Supabase Storage (bucket avatars_clientes).
 * Ruta: {empresa_id}/{cliente_id}/avatar.webp
 * Crea el bucket en Supabase Dashboard > Storage si no existe (público para lectura).
 */
export const avatarClienteService = {
  /**
   * Sube un archivo de imagen (ya comprimido) y devuelve la URL pública.
   */
  async uploadAvatar(file: File, clienteId: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('No se pudo obtener el usuario autenticado.')
    }
    const empresaId = await getCompaniaActualOrFromPerfil()
    if (!empresaId) {
      throw new Error('No se pudo obtener la empresa. Inicia sesión nuevamente.')
    }
    // Ruta única por subida para evitar caché y reutilizar siempre el mismo path
    const fileExt = 'webp'
    const filePath = `${empresaId}/${user.id}/${clienteId}/avatar-${Date.now()}.${fileExt}`

    let result = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    // Si el bucket no existe, crearlo vía API y reintentar una vez
    if (result.error && (result.error.message?.includes('Bucket not found') || result.error.message?.includes('bucket'))) {
      try {
        const res = await fetch('/api/storage/ensure-avatars-bucket', { method: 'POST' })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error || `Error creando bucket: ${res.status}`)
        }
        result = await supabase.storage
          .from(BUCKET)
          .upload(filePath, file, { cacheControl: '3600', upsert: true })
      } catch (ensureErr: unknown) {
        const msg = ensureErr instanceof Error ? ensureErr.message : 'No se pudo crear el bucket de fotos.'
        throw new Error(`Error al subir la foto: ${msg}. Crea el bucket "avatars_clientes" en Supabase Dashboard > Storage (público).`)
      }
    }

    if (result.error) {
      console.error('Error subiendo avatar:', result.error)
      throw new Error(`Error al subir la foto: ${result.error.message}`)
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
    return data.publicUrl
  },

  /**
   * Devuelve la URL pública de un avatar a partir de la ruta guardada o de la URL completa.
   */
  getPublicUrl(fotoUrl: string): string {
    if (!fotoUrl) return ''
    if (fotoUrl.startsWith('http')) return fotoUrl
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(fotoUrl)
    return data.publicUrl
  },
}
