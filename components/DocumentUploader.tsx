'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, X, CheckCircle2, Loader2, Image as ImageIcon, File } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/Button'
import { documentosService } from '@/lib/services/documentos'

type TipoDocumento = 'identificacion_frontal' | 'identificacion_trasera' | 'contrato_firmado' | 'otros'

interface DocumentUploaderProps {
  clienteId: string
  tipoDocumento: TipoDocumento
  label: string
  urlActual?: string
  onUploadComplete: (filePath: string) => void
  onError?: (error: string) => void
}

export function DocumentUploader({
  clienteId,
  tipoDocumento,
  label,
  urlActual,
  onUploadComplete,
  onError,
}: DocumentUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(urlActual || null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Actualizar previewUrl cuando urlActual cambia
  useEffect(() => {
    if (urlActual) {
      setPreviewUrl(urlActual)
    } else if (!selectedFile) {
      // Si no hay urlActual y no hay archivo seleccionado, limpiar preview
      setPreviewUrl(null)
    }
  }, [urlActual, selectedFile])
  
  // Función auxiliar para detectar si una URL es de imagen
  const isImageUrl = (url: string | null): boolean => {
    if (!url) return false
    // Las URLs de Supabase tienen parámetros, así que usamos includes
    return url.startsWith('data:image/') || 
           url.includes('.webp') || 
           url.includes('.jpg') || 
           url.includes('.jpeg') || 
           url.includes('.png') ||
           url.includes('.gif')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tipo de archivo: imágenes, PDF o Word
      const isImage = file.type.startsWith('image/')
      const isPDF = file.type === 'application/pdf'
      const isWord = file.type === 'application/msword' || 
                     file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      
      if (!isImage && !isPDF && !isWord) {
        onError?.('Por favor, selecciona un archivo de imagen (JPG, PNG, etc.), PDF o Word (DOC, DOCX)')
        return
      }

      setSelectedFile(file)
      setUploaded(false)
      
      // Crear preview solo para imágenes
      if (isImage) {
        const reader = new FileReader()
        reader.onload = (event) => {
          setPreviewUrl(event.target?.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        // Para PDF y Word, no hay preview (se mostrará un icono)
        setPreviewUrl(null)
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !clienteId) {
      onError?.('Por favor, selecciona un archivo primero')
      return
    }

    try {
      setUploading(true)
      setUploaded(false)

      // Subir documento
      const filePath = await documentosService.uploadDocumento(selectedFile, clienteId, tipoDocumento)
      
      // Obtener URL pública para el preview
      const publicUrl = documentosService.getPublicUrl(filePath)
      setPreviewUrl(publicUrl)
      
      setUploaded(true)
      setSelectedFile(null)
      
      // Resetear input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Notificar al componente padre
      onUploadComplete(filePath)
    } catch (error: any) {
      console.error('Error subiendo documento:', error)
      onError?.(error.message || 'Error al subir el documento')
      setUploading(false)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setSelectedFile(null)
    setPreviewUrl(urlActual || null)
    setUploaded(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getTipoDocumentoLabel = (tipo: TipoDocumento): string => {
    const labels = {
      identificacion_frontal: 'Identificación Frontal',
      identificacion_trasera: 'Identificación Trasera',
      contrato_firmado: 'Contrato Firmado',
      otros: 'Otro Documento',
    }
    return labels[tipo]
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      {/* Preview de imagen actual o seleccionada */}
      {previewUrl && isImageUrl(previewUrl) && (
        <div className="relative border border-gray-300 rounded-lg p-2 bg-gray-50">
          <div className="relative w-full h-48">
            <Image
              src={previewUrl}
              alt={getTipoDocumentoLabel(tipoDocumento)}
              fill
              sizes="100vw"
              className="rounded"
              style={{ objectFit: 'contain' }}
              loading="lazy"
              {...(previewUrl?.startsWith('data:') || previewUrl?.startsWith('blob:') ? { unoptimized: true } : {})}
            />
          </div>
          {selectedFile && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {!selectedFile && (
            <div className="absolute top-3 right-3">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
                download
              >
                <File className="w-4 h-4" />
                Ver/Descargar
              </a>
            </div>
          )}
        </div>
      )}

      {/* Preview de documento actual (si existe pero no es imagen) */}
      {previewUrl && !selectedFile && !isImageUrl(previewUrl) && (
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <File className="w-8 h-8 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Documento existente</p>
              <p className="text-xs text-gray-500">Haz clic en &quot;Cambiar Documento&quot; para reemplazarlo</p>
            </div>
            <a
              href={urlActual || previewUrl || ''}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1"
            >
              <File className="w-4 h-4" />
              Ver/Descargar
            </a>
          </div>
        </div>
      )}

      {/* Preview de archivo seleccionado (PDF/Word) */}
      {selectedFile && !previewUrl && (
        <div className="border border-gray-300 rounded-lg p-4 bg-blue-50">
          <div className="flex items-center gap-3">
            <File className="w-8 h-8 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024).toFixed(2)} KB • {selectedFile.type}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Input de archivo */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2"
        >
          <File className="w-4 h-4" />
          {previewUrl || urlActual ? 'Cambiar Documento' : 'Seleccionar Documento'}
        </Button>

        {/* Botón de subida - Solo visible cuando hay un archivo seleccionado */}
        {selectedFile && (
          <Button
            type="button"
            onClick={handleUpload}
            disabled={uploading || uploaded}
            className="flex items-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Subiendo...
              </>
            ) : uploaded ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Subido
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Subir Documento
              </>
            )}
          </Button>
        )}
      </div>

      {selectedFile && (
        <p className="text-xs text-gray-500">
          Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          {selectedFile.type.startsWith('image/') && (
            <>
              <br />
              <span className="text-blue-600">
                💡 Las imágenes se comprimirán automáticamente a formato WebP (máximo 300KB)
              </span>
            </>
          )}
          {(selectedFile.type === 'application/pdf' || 
            selectedFile.type.includes('wordprocessingml') || 
            selectedFile.type === 'application/msword') && (
            <>
              <br />
              <span className="text-green-600">
                📄 Los archivos PDF y Word se subirán sin modificación
              </span>
            </>
          )}
        </p>
      )}
    </div>
  )
}

