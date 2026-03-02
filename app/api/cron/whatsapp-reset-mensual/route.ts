import { NextResponse } from 'next/server'
import { reiniciarConsumoMensual } from '@/lib/services/whatsapp-consumo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Cron: Reinicia el contador de mensajes WhatsApp el día 1 de cada mes.
 * Schedule: 0 0 1 * * (00:00 UTC día 1)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const secret = authHeader?.replace('Bearer ', '') || authHeader
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { reiniciados } = await reiniciarConsumoMensual()
    return NextResponse.json({
      success: true,
      reiniciados,
      message: `Contador WhatsApp reiniciado para el mes actual. Registros actualizados: ${reiniciados}`,
    })
  } catch (err) {
    console.error('Error reinicio WhatsApp:', err)
    return NextResponse.json(
      { error: 'Error reiniciando consumo', details: String(err) },
      { status: 500 }
    )
  }
}
