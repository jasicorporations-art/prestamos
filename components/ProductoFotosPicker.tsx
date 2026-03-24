'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

export type ProductoFotosPickerProps = {
  maxFiles?: number
  disabled?: boolean
  /** Archivos locales pendientes de subir */
  value: File[]
  onChange: (files: File[]) => void
  /** URLs existentes (ya subidas). Útil al editar. */
  existingUrls?: string[]
  onExistingUrlsChange?: (urls: string[]) => void
  label?: string
  helpText?: string
  /** Muestra un spinner (p. ej. mientras la API sube a Storage) */
  uploading?: boolean
}

export function ProductoFotosPicker({
  maxFiles = 3,
  disabled = false,
  value,
  onChange,
  existingUrls = [],
  onExistingUrlsChange,
  label = 'Fotos del producto',
  helpText,
  uploading = false,
}: ProductoFotosPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  useEffect(() => {
    const urls = value.map((f) => URL.createObjectURL(f))
    setPreviewUrls(urls)
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [value])

  function addFiles(list: FileList | null) {
    if (!list?.length || disabled) return
    const next: File[] = [...value]
    for (let i = 0; i < list.length && next.length < maxFiles; i++) {
      const f = list[i]
      if (!f.type.startsWith('image/')) continue
      next.push(f)
    }
    onChange(next.slice(0, maxFiles))
  }

  function removeAt(index: number) {
    if (disabled) return
    onChange(value.filter((_, j) => j !== index))
  }

  function removeExistingAt(index: number) {
    if (disabled || !onExistingUrlsChange) return
    onExistingUrlsChange(existingUrls.filter((_, j) => j !== index))
  }

  const totalCount = existingUrls.length + value.length

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-gray-300 bg-gray-50/80 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {helpText ?? `Hasta ${maxFiles} imágenes (JPG, PNG, WebP, GIF). Máx. 5 MB c/u.`}
          </p>
        </div>
        {uploading && (
          <div className="flex items-center gap-1.5 text-xs text-primary-600 shrink-0">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            Subiendo…
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {existingUrls.map((src, i) => (
          <div
            key={`existing-${src}-${i}`}
            className="relative h-24 w-24 overflow-hidden rounded-md border border-gray-200 bg-white shadow"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="h-full w-full cursor-zoom-in object-cover"
              onClick={() => setLightboxUrl(src)}
            />
            {!disabled && !uploading && onExistingUrlsChange && (
              <button
                type="button"
                onClick={() => removeExistingAt(i)}
                className="absolute right-0.5 top-0.5 rounded-full bg-red-600 p-0.5 text-white shadow hover:bg-red-700"
                aria-label={`Quitar foto existente ${i + 1}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

        {previewUrls.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative h-24 w-24 overflow-hidden rounded-md border border-gray-200 bg-white shadow"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="h-full w-full cursor-zoom-in object-cover"
              onClick={() => setLightboxUrl(src)}
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            {!disabled && !uploading && (
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-0.5 top-0.5 rounded-full bg-red-600 p-0.5 text-white shadow hover:bg-red-700"
                aria-label={`Quitar foto ${i + 1}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

        {totalCount < maxFiles && !disabled && !uploading && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-24 w-24 flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-white text-gray-500 hover:border-primary-400 hover:text-primary-600"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="mt-0.5 text-[10px]">Añadir</span>
            </button>
          </>
        )}
      </div>

      {lightboxUrl && (
        <button
          type="button"
          aria-label="Cerrar vista previa"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrl} alt="" className="max-h-[90vh] max-w-[90vw] rounded-md object-contain shadow-2xl" />
        </button>
      )}
    </div>
  )
}
