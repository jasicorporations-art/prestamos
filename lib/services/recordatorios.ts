import { obtenerCuotasPendientes, type CuotaPendiente } from './cuotas'
import { generarMensajeRecordatorio, generarUrlWhatsApp } from './whatsapp'

export interface Recordatorio {
  cuota: CuotaPendiente
  diasRestantes: number
  mensaje: string
  urlWhatsApp: string
}

/**
 * Obtiene todas las cuotas que necesitan recordatorios
 * (2 días antes del vencimiento)
 */
export async function obtenerRecordatoriosPendientes(): Promise<Recordatorio[]> {
  const cuotas = await obtenerCuotasPendientes()
  const fechaActual = new Date()
  fechaActual.setHours(0, 0, 0, 0)
  
  const recordatorios: Recordatorio[] = []
  
  for (const cuota of cuotas) {
    const fechaVencimiento = new Date(cuota.fechaVencimiento)
    fechaVencimiento.setHours(0, 0, 0, 0)
    
    // Calcular días restantes
    const diffTime = fechaVencimiento.getTime() - fechaActual.getTime()
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    // Solo incluir cuotas que vencen en 2 días o menos (y aún no están vencidas)
    if (diasRestantes >= 0 && diasRestantes <= 2) {
      const mensaje = generarMensajeRecordatorio(cuota, diasRestantes)
      const urlWhatsApp = generarUrlWhatsApp(cuota.telefono, mensaje)
      
      recordatorios.push({
        cuota,
        diasRestantes,
        mensaje: decodeURIComponent(mensaje),
        urlWhatsApp,
      })
    }
  }
  
  // Ordenar por días restantes (las más urgentes primero)
  return recordatorios.sort((a, b) => a.diasRestantes - b.diasRestantes)
}


