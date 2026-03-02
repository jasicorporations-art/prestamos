import { supabase } from '../supabase'
import imageCompression from 'browser-image-compression'
import { getCompaniaActualOrFromPerfil } from '../utils/compania'

/**
 * Servicio para subir documentos a Supabase Storage
 * Estructura: /{empresa_id}/{cliente_id}/{tipo_documento}_{timestamp}.webp
 * (Aislamiento por empresa para políticas RLS seguras)
 */
export const documentosService = {
  /**
   * Comprimir imagen a webp y reducir tamaño a máximo 300KB
   */
  async comprimirImagen(file: File): Promise<File> {
    const options = {
      maxSizeMB: 0.3, // 300KB
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: 0.8,
    }

    try {
      const compressedFile = await imageCompression(file, options)
      return compressedFile
    } catch (error) {
      console.error('Error comprimiendo imagen:', error)
      throw new Error('Error al comprimir la imagen')
    }
  },

  /**
   * Subir un documento a Supabase Storage
   * @param file - Archivo a subir (imagen, PDF o Word)
   * @param clienteId - ID del cliente (UUID o cédula)
   * @param tipoDocumento - Tipo de documento (identificacion_frontal, identificacion_trasera, contrato_firmado, otros)
   * @returns Ruta del archivo subido (para guardar en BD)
   */
  async uploadDocumento(
    file: File,
    clienteId: string,
    tipoDocumento: 'identificacion_frontal' | 'identificacion_trasera' | 'contrato_firmado' | 'otros'
  ): Promise<string> {
    try {
      let fileToUpload: File
      let fileExtension: string

      // Si es una imagen, comprimirla a webp
      if (file.type.startsWith('image/')) {
        fileToUpload = await this.comprimirImagen(file)
        fileExtension = 'webp'
      } else {
        // Si es PDF o Word, subir sin comprimir
        fileToUpload = file
        // Obtener extensión original del archivo
        const originalExtension = file.name.split('.').pop()?.toLowerCase() || 'pdf'
        fileExtension = originalExtension
      }

      // Crear nombre único: {tipo_documento}_{timestamp}.{extension}
      const timestamp = Date.now()
      const fileName = `${tipoDocumento}_${timestamp}.${fileExtension}`

      // Ruta: {empresa_id}/{cliente_id}/{archivo} (requerido por políticas Storage)
      const empresaId = await getCompaniaActualOrFromPerfil()
      if (!empresaId) {
        throw new Error('No se pudo obtener la empresa. Inicia sesión nuevamente.')
      }
      const filePath = `${empresaId}/${clienteId}/${fileName}`

      // Subir el archivo a Supabase Storage en el bucket 'documentos-dealers'
      const { data, error } = await supabase.storage
        .from('documentos-dealers')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        console.error('Error subiendo archivo:', error)
        throw new Error(`Error al subir el documento: ${error.message}`)
      }

      // Retornar la ruta relativa (no la URL pública) para guardar en BD
      // Formato: {empresa_id}/{cliente_id}/{tipo_documento}_{timestamp}.{extension}
      return filePath
    } catch (error) {
      console.error('Error en uploadDocumento:', error)
      throw error
    }
  },

  /**
   * Obtener URL pública de un documento
   * @param filePath - Ruta del archivo (formato: {cliente_id}/{tipo_documento}_{timestamp}.webp)
   * @returns URL pública del documento
   */
  getPublicUrl(filePath: string): string {
    const { data } = supabase.storage
      .from('documentos-dealers')
      .getPublicUrl(filePath)

    return data.publicUrl
  },

  /**
   * Eliminar un documento de Supabase Storage
   * @param filePath - Ruta del archivo (formato: {cliente_id}/{tipo_documento}_{timestamp}.webp)
   */
  async deleteDocumento(filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from('documentos-dealers')
        .remove([filePath])

      if (error) {
        console.error('Error eliminando archivo:', error)
        throw new Error('Error al eliminar el documento')
      }
    } catch (error) {
      console.error('Error en deleteDocumento:', error)
      throw error
    }
  },

  /**
   * Listar todos los documentos de un cliente
   * @param clienteId - ID del cliente
   * @returns Lista de rutas de documentos del cliente
   */
  async listDocumentosCliente(clienteId: string): Promise<string[]> {
    try {
      const empresaId = await getCompaniaActualOrFromPerfil()
      if (!empresaId) return []
      const folderPath = `${empresaId}/${clienteId}`
      const { data, error } = await supabase.storage
        .from('documentos-dealers')
        .list(folderPath, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        })

      if (error) {
        console.error('Error listando documentos:', error)
        throw new Error('Error al listar los documentos')
      }

      return data?.map(file => `${folderPath}/${file.name}`) || []
    } catch (error) {
      console.error('Error en listDocumentosCliente:', error)
      throw error
    }
  },
}
