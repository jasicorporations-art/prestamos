'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, Loader2, X, CheckCircle2 } from 'lucide-react'
import { createWorker } from 'tesseract.js'
import Image from 'next/image'
import { extraerSoloCedulaYNombre } from '@/lib/utils/limpiarDatosIdentidad'

/** Constraints de video: alta resolución y cámara trasera para documentos */
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  facingMode: 'environment',
}

/** USA: MM/DD/YYYY — RD: 11 dígitos (con o sin guiones) */
const USA_DATE_REGEX = /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(19|20)\d{2}\b/
const RD_CEDULA_REGEX = /(\d{3}[-]?\d{7}[-]?\d{1})|(\d{11})/

export interface BarcodeResultRD {
  numero_licencia?: string
  fecha_vencimiento?: string
  nombre_completo?: string
  fecha_nacimiento?: string
  sexo?: string
}

interface DocumentScannerProps {
  onOCRResult?: (data: { nombre?: string; cedula?: string }) => void
  onBarcodeResult?: (data: BarcodeResultRD) => void
}

/** Pre-procesamiento: blanco y negro + mayor contraste para mejorar OCR */
function preprocessImageForOCR(imageDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    if (!imageDataUrl.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        reject(new Error('La imagen no tiene tamaño válido'))
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No se pudo obtener contexto del canvas'))
        return
      }
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      const contrast = 1.8
      const brightness = 0.05

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        let gray = 0.299 * r + 0.587 * g + 0.114 * b
        gray = gray / 255 - 0.5
        gray = (gray * contrast + 0.5 + brightness) * 255
        gray = Math.max(0, Math.min(255, Math.round(gray)))
        data[i] = data[i + 1] = data[i + 2] = gray
      }
      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Error al cargar la imagen'))
    img.src = imageDataUrl
  })
}

/** Reducir tamaño de imagen para OCR (evita timeouts en móviles) */
function resizeImageForOCR(dataUrl: string, maxSize = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      if (w <= maxSize && h <= maxSize) {
        resolve(dataUrl)
        return
      }
      const scale = maxSize / Math.max(w, h)
      const cw = Math.round(w * scale)
      const ch = Math.round(h * scale)
      const canvas = document.createElement('canvas')
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, cw, ch)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    img.src = dataUrl
  })
}

/** Comprueba si el texto reconoce un ID válido (USA o RD) */
function readingLooksValid(text: string): boolean {
  const fullText = text.replace(/\s/g, ' ')
  if (USA_DATE_REGEX.test(fullText)) return true
  if (RD_CEDULA_REGEX.test(fullText)) return true
  return false
}

export function DocumentScanner({ onOCRResult }: DocumentScannerProps) {
  const [scanningFront, setScanningFront] = useState(false)
  const [showLiveCamera, setShowLiveCamera] = useState(false)
  const [processingOCR, setProcessingOCR] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<{ nombre?: string; cedula?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Verificar permisos con las mismas constraints que usaremos
  useEffect(() => {
    let mounted = true
    async function checkCameraPermission() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: VIDEO_CONSTRAINTS,
        })
        if (mounted) {
          stream.getTracks().forEach((track) => track.stop())
          setCameraPermission(true)
        }
      } catch (err) {
        if (mounted) {
          setCameraPermission(false)
          setError('Se requiere permiso de cámara para escanear documentos')
        }
      }
    }
    checkCameraPermission()
    return () => {
      mounted = false
    }
  }, [])

  // Limpiar cámara al desmontar
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  const startLiveCamera = useCallback(async () => {
    setError(null)
    setShowLiveCamera(true)
    setScanningFront(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: VIDEO_CONSTRAINTS,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo acceder a la cámara'
      setError(msg)
      setShowLiveCamera(false)
      setScanningFront(false)
    }
  }, [])

  const stopLiveCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setShowLiveCamera(false)
    setScanningFront(false)
  }, [])

  /** Llama a la API OCR.space (soporta red; no depende de Tesseract). Usar imagen reducida para límite 1MB. */
  const tryOcrSpaceFallback = useCallback(
    async (imageData: string): Promise<{ nombre?: string; cedula?: string } | null> => {
      try {
        let toSend = imageData
        try {
          toSend = await resizeImageForOCR(imageData, 1000)
        } catch {
          // usar original
        }
        const res = await fetch('/api/ocr-space', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Image: toSend }),
        })
        const data = await res.json()
        if (!res.ok) return null
        const nombre = data?.nombre ?? null
        const cedula = data?.cedula ?? null
        if (nombre || cedula) {
          return { nombre: nombre || undefined, cedula: cedula || undefined }
        }
        return null
      } catch {
        return null
      }
    },
    []
  )

  const processImageWithOCR = useCallback(
    async (imageData: string) => {
      setProcessingOCR(true)
      setError(null)
      try {
        if (
          !imageData ||
          typeof imageData !== 'string' ||
          !imageData.startsWith('data:')
        ) {
          setError('La imagen no es válida. Intente capturar de nuevo.')
          setProcessingOCR(false)
          return
        }

        let imageToUse = imageData
        try {
          imageToUse = await resizeImageForOCR(imageData)
        } catch {
          // seguir con imagen original
        }
        try {
          imageToUse = await preprocessImageForOCR(imageToUse)
        } catch (preprocessErr) {
          console.warn('Preprocesamiento falló, usando imagen original:', preprocessErr)
        }

        // Intentar primero OCR.space (no depende de cargar Tesseract en el navegador)
        const apiResult = await tryOcrSpaceFallback(imageData)
        if (apiResult && (apiResult.nombre || apiResult.cedula)) {
          setOcrResult(apiResult)
          if (onOCRResult) onOCRResult(apiResult)
          setProcessingOCR(false)
          return
        }

        let text = ''
        try {
          let worker
          try {
            worker = await createWorker('eng+spa')
          } catch (workerErr) {
            console.warn('Worker eng+spa falló, intentando solo eng:', workerErr)
            worker = await createWorker('eng')
          }
          const { data } = await worker.recognize(imageToUse)
          await worker.terminate()
          text = data?.text ?? ''
        } catch (tesseractErr: unknown) {
          const rawMessage =
            tesseractErr instanceof Error ? tesseractErr.message : String(tesseractErr)
          const isNetworkError = /network|NetworkError|load|Worker|fetch|Failed to fetch/i.test(
            rawMessage
          )
          if (isNetworkError) {
            const fallback = await tryOcrSpaceFallback(imageData)
            if (fallback && (fallback.nombre || fallback.cedula)) {
              setOcrResult(fallback)
              if (onOCRResult) onOCRResult(fallback)
              setProcessingOCR(false)
              return
            }
          }
          throw tesseractErr
        }

        let nombre = ''
        let cedula = ''
        try {
          const { cedula: cedulaExtraida, nombreCompleto } = extraerSoloCedulaYNombre(
            text || ''
          )
          cedula = cedulaExtraida
          nombre = nombreCompleto
        } catch (extractErr) {
          console.warn('Extracción OCR:', extractErr)
        }
        const fullText = (text || '').replace(/\n/g, ' ')
        const isValid = readingLooksValid(fullText)
        const result = { nombre: nombre || undefined, cedula: cedula || undefined }

        if (result.nombre || result.cedula) {
          setOcrResult(result)
          if (onOCRResult) onOCRResult(result)
          if (!isValid) {
            setError(
              'Se leyó texto pero no se detectó fecha (MM/DD/YYYY) ni cédula de 11 dígitos. Revise los datos abajo.'
            )
          }
        } else if (!isValid) {
          setError(
            'No se reconoció un ID válido. Asegúrese de que se vea la fecha (MM/DD/YYYY) o el número de cédula de 11 dígitos (RD).'
          )
        } else {
          setOcrResult(result)
          if (onOCRResult) onOCRResult(result)
        }
      } catch (err: unknown) {
        const rawMessage = err instanceof Error ? err.message : String(err)
        console.error('OCR error:', err)
        const isNetworkError = /network|NetworkError|load|Worker|fetch|Failed to fetch/i.test(
          rawMessage
        )
        if (isNetworkError) {
          const fallback = await tryOcrSpaceFallback(imageData)
          if (fallback && (fallback.nombre || fallback.cedula)) {
            setOcrResult(fallback)
            if (onOCRResult) onOCRResult(fallback)
            setProcessingOCR(false)
            return
          }
          setError(
            'Error de red al leer el documento. Compruebe su conexión e intente de nuevo. Si persiste, use "O subir imagen" para cargar una foto del documento.'
          )
        } else {
          setError(
            rawMessage.includes('Worker') || rawMessage.includes('load')
              ? 'No se pudo cargar el lector de texto. Compruebe la conexión e intente de nuevo.'
              : `Error al procesar la imagen: ${rawMessage}`
          )
        }
      } finally {
        setProcessingOCR(false)
      }
    },
    [onOCRResult, tryOcrSpaceFallback]
  )

  const captureFromVideo = useCallback(() => {
    const video = videoRef.current
    if (!video || !streamRef.current || video.readyState < 2) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    stopLiveCamera()
    setPreviewImage(dataUrl)
    processImageWithOCR(dataUrl)
  }, [stopLiveCamera, processImageWithOCR])

  function handleScanFront() {
    setError(null)
    startLiveCamera()
  }

  function handleClearResults() {
    setPreviewImage(null)
    setOcrResult(null)
    setError(null)
  }

  return (
    <div className="bg-red-50 p-4 rounded-md border-l-4 border-red-500 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-red-900">Carga y Verificación de Documentos</h3>
        {(previewImage || ocrResult) && (
          <button
            type="button"
            onClick={handleClearResults}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            <X className="w-4 h-4 inline mr-1" />
            Limpiar
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {cameraPermission === false && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded text-sm">
          ⚠️ Se requiere permiso de cámara. Por favor, permite el acceso a la cámara en la
          configuración de tu navegador.
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handleScanFront}
            disabled={scanningFront || processingOCR || cameraPermission === false}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {scanningFront || processingOCR ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {processingOCR ? 'Analizando...' : 'Capturando...'}
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                Escanear Frente de Cédula/ID
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={processingOCR || cameraPermission === false}
            className="text-xs text-red-600 hover:text-red-800 underline disabled:opacity-50"
          >
            O subir imagen
          </button>
        </div>
      </div>

      {/* Cámara en vivo para frente de ID */}
      {showLiveCamera && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-gray-600 text-center">
            Alinee el frente de la cédula/ID y pulse Capturar
          </p>
          <div className="relative w-full max-w-lg mx-auto rounded-lg overflow-hidden bg-black aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={stopLiveCamera}
              className="flex items-center gap-2 px-4 py-2 border border-gray-400 rounded-md text-gray-700 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={captureFromVideo}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium"
            >
              <Camera className="w-4 h-4" />
              Capturar
            </button>
          </div>
        </div>
      )}

      {previewImage && !showLiveCamera && (
        <div className="mt-4">
          <p className="text-xs text-gray-600 mb-2">Imagen capturada:</p>
          <div className="relative w-full max-w-md mx-auto h-64 rounded-md border border-gray-300 overflow-hidden">
            <Image
              src={previewImage}
              alt="Documento escaneado"
              fill
              className="object-contain rounded-md"
              unoptimized
            />
          </div>
        </div>
      )}

      {ocrResult && (ocrResult.nombre || ocrResult.cedula) && (
        <div className="mt-4 bg-white p-3 rounded-md border border-green-300">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <p className="text-xs font-semibold text-green-900">Datos extraídos del frente:</p>
          </div>
          {ocrResult.nombre && (
            <p className="text-xs text-gray-700">
              <strong>Nombre:</strong> {ocrResult.nombre}
            </p>
          )}
          {ocrResult.cedula && (
            <p className="text-xs text-gray-700">
              <strong>Cédula:</strong> {ocrResult.cedula}
            </p>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            setScanningFront(false)
            setShowLiveCamera(false)
            const reader = new FileReader()
            reader.onload = (event) => {
              const imageData = event.target?.result as string
              if (imageData) {
                setPreviewImage(imageData)
                processImageWithOCR(imageData)
              }
            }
            reader.readAsDataURL(file)
          }
          if (fileInputRef.current) fileInputRef.current.value = ''
        }}
      />
    </div>
  )
}
