import { NextRequest, NextResponse } from 'next/server'
import { extraerSoloCedulaYNombre } from '@/lib/utils/limpiarDatosIdentidad'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const OCR_SPACE_URL = 'https://api.ocr.space/parse/image'

/**
 * POST /api/ocr-space
 * Fallback OCR usando OCR.space cuando Tesseract en el navegador falla por red.
 * Body: { base64Image: string } (data URL o base64 puro)
 * Devuelve: { nombre?: string, cedula?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OCR_SPACE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OCR no configurado (falta OCR_SPACE_API_KEY)' },
        { status: 503 }
      )
    }

    const body = await request.json()
    let base64Image = body?.base64Image
    if (!base64Image || typeof base64Image !== 'string') {
      return NextResponse.json(
        { error: 'Se requiere base64Image' },
        { status: 400 }
      )
    }

    // OCR.space con FormData y data URI completo evita error 99 (file type)
    const isDataUrl = base64Image.startsWith('data:')
    const imageForApi = isDataUrl
      ? base64Image
      : `data:image/jpeg;base64,${base64Image}`

    const form = new FormData()
    form.set('apikey', apiKey)
    form.set('base64Image', imageForApi)
    form.set('language', 'spa')
    form.set('filetype', imageForApi.includes('png') ? 'PNG' : 'JPG')

    const res = await fetch(OCR_SPACE_URL, {
      method: 'POST',
      body: form,
    })

    const data = await res.json()
    if (!res.ok) {
      const errMsg = data?.ErrorMessage || data?.error || `OCR.space ${res.status}`
      return NextResponse.json({ error: errMsg }, { status: res.status >= 500 ? 502 : 400 })
    }

    // Respuesta OCR.space: ParsedResults[0].ParsedText (o ErrorMessage si falló)
    const parsedResults = data?.ParsedResults
    const first = parsedResults?.[0]
    if (first?.IsErroredOnProcessing && first?.ErrorMessage) {
      const errMsg = Array.isArray(first.ErrorMessage) ? first.ErrorMessage.join(' ') : first.ErrorMessage
      return NextResponse.json({ error: errMsg }, { status: 400 })
    }
    const text = first?.ParsedText ?? ''
    if (!text.trim()) {
      return NextResponse.json({ nombre: null, cedula: null })
    }

    const { cedula, nombreCompleto } = extraerSoloCedulaYNombre(text)
    return NextResponse.json({
      nombre: nombreCompleto || undefined,
      cedula: cedula || undefined,
    })
  } catch (err) {
    console.error('[api/ocr-space]', err)
    return NextResponse.json(
      { error: 'Error al procesar la imagen con OCR' },
      { status: 500 }
    )
  }
}
