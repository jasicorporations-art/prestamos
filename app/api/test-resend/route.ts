import { NextResponse } from 'next/server'
import { resend, FROM_EMAIL } from '@/lib/resend'

/**
 * GET /api/test-resend
 * 
 * Endpoint de prueba para verificar que RESEND_API_KEY está configurada correctamente
 */
export async function GET() {
  try {
    // Verificar que Resend esté configurado
    if (!resend) {
      return NextResponse.json(
        {
          success: false,
          error: 'RESEND_API_KEY no está configurada',
          message: 'Por favor, configura RESEND_API_KEY en las variables de entorno de Vercel',
        },
        { status: 500 }
      )
    }

    // Intentar obtener información de la cuenta (esto verifica que la API key es válida)
    // Nota: Resend no tiene un endpoint directo para verificar la key, 
    // pero podemos intentar listar dominios o usar otro método
    
    return NextResponse.json({
      success: true,
      message: '✅ RESEND_API_KEY está configurada correctamente',
      configurado: true,
      fromEmail: FROM_EMAIL,
      nota: 'La API key está presente. Para verificar completamente, intenta enviar un correo de prueba.',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al verificar la configuración',
      },
      { status: 500 }
    )
  }
}

