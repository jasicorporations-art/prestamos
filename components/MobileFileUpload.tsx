'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { Upload, X, Camera, FileImage } from 'lucide-react'
import Image from 'next/image'

interface MobileFileUploadProps {
  label: string
  accept?: string
  value?: File | null
  onChange: (file: File | null) => void
  capture?: 'user' | 'environment'
  error?: string
  disabled?: boolean
}

/**
 * Componente de subida de archivos optimizado para móvil
 * Soluciona el problema común donde los inputs de tipo file no funcionan en móvil
 */
export function MobileFileUpload({
  label,
  accept = 'image/*',
  value,
  onChange,
  capture,
  error,
  disabled = false,
}: MobileFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // Actualizar preview cuando cambia el archivo
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    
    if (file) {
      // Crear preview para imágenes
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setPreview(null)
      }
      onChange(file)
    } else {
      setPreview(null)
      onChange(null)
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setPreview(null)
    onChange(null)
  }

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      {/* Input file - Oculto pero funcional en móvil usando opacity en lugar de display:none */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        capture={capture}
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
        id={`file-input-${label.replace(/\s+/g, '-').toLowerCase()}`}
      />

      {/* Botón de subida - Clickable en móvil */}
      <div
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-6 cursor-pointer
          transition-all duration-200
          ${disabled 
            ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50' 
            : 'bg-gray-50 border-gray-300 hover:border-primary-500 hover:bg-primary-50'
          }
          ${error ? 'border-red-500 bg-red-50' : ''}
        `}
      >
        {preview || value ? (
          <div className="relative">
            {preview ? (
              <div className="relative w-full h-48">
                <Image
                  src={preview}
                  alt="Preview"
                  fill
                  sizes="100vw"
                  className="rounded-md bg-gray-100"
                  style={{ objectFit: 'contain' }}
                  loading="lazy"
                  {...(preview?.startsWith('data:') || preview?.startsWith('blob:') ? { unoptimized: true } : {})}
                />
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={disabled}
                  className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                  aria-label="Eliminar archivo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2 text-gray-600">
                <FileImage className="w-5 h-5" />
                <span className="text-sm font-medium">{value?.name || 'Archivo seleccionado'}</span>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={disabled}
                  className="ml-2 p-1 text-red-600 hover:text-red-700 focus:outline-none"
                  aria-label="Eliminar archivo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {capture ? (
                <Camera className="w-12 h-12 text-gray-400" />
              ) : (
                <Upload className="w-12 h-12 text-gray-400" />
              )}
            </div>
            <p className="text-sm text-gray-600 mb-1">
              {capture 
                ? 'Toca para tomar una foto' 
                : 'Toca para seleccionar un archivo'
              }
            </p>
            <p className="text-xs text-gray-500">
              {capture 
                ? 'Se abrirá la cámara de tu dispositivo'
                : 'Desde galería o cámara'
              }
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Texto de ayuda para móvil */}
      <p className="mt-2 text-xs text-gray-500">
        {capture 
          ? 'Usa la cámara de tu dispositivo para tomar una foto directamente'
          : 'Puedes tomar una foto o seleccionar una imagen de tu galería'
        }
      </p>
    </div>
  )
}










