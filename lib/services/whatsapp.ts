import type { CuotaPendiente } from './cuotas'
import { EMPRESA } from '@/lib/constants'
import type { Pago, Venta } from '@/types'

/**
 * Genera el mensaje de WhatsApp para una cuota
 */
export function generarMensajeWhatsApp(cuota: CuotaPendiente): string {
  const nombre = cuota.cliente.nombre_completo
  const modelo = `${cuota.motor.marca} (Préstamo: ${cuota.motor.numero_chasis})`
  const cuotaFormateada = cuota.cuotaBase.toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const fechaVencimiento = formatDate(cuota.fechaVencimiento)
  const totalFormateado = cuota.totalAPagar.toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  
  let mensaje = `Hola ${nombre}, te contactamos de ${EMPRESA.nombre}. `
  mensaje += `Tu pago por el motor ${modelo} de $${cuotaFormateada} venció el ${fechaVencimiento}. `
  
  if (cuota.penalidad > 0) {
    mensaje += `Con la penalidad, el total es $${totalFormateado}. `
  } else {
    mensaje += `El total a pagar es $${totalFormateado}. `
  }
  
  mensaje += `Por favor, confirma tu pago.`
  
  return encodeURIComponent(mensaje)
}

/**
 * Genera el mensaje de WhatsApp para confirmación de pago registrado
 */
export function generarMensajeConfirmacionPago(
  nombreCliente: string,
  montoPagado: number,
  saldoRestante: number,
  numeroPrestamo: string,
  numeroCuota?: number
): string {
  const montoFormateado = montoPagado.toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const saldoFormateado = saldoRestante.toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  
  let mensaje = `Hola ${nombreCliente}, te contactamos de ${EMPRESA.nombre}.\n\n`
  mensaje += `✅ *Confirmación de Pago*\n\n`
  mensaje += `📋 *Número de Préstamo:* ${numeroPrestamo}\n`
  
  if (numeroCuota) {
    mensaje += `📅 *Cuota:* ${numeroCuota}\n`
  }
  
  mensaje += `💰 *Monto Pagado:* $${montoFormateado}\n`
  mensaje += `💵 *Saldo Restante:* $${saldoFormateado}\n\n`
  mensaje += `Gracias por tu pago.`
  
  return encodeURIComponent(mensaje)
}

/**
 * Genera un mensaje de recordatorio para cuotas próximas a vencer
 */
export function generarMensajeRecordatorio(cuota: CuotaPendiente, diasRestantes: number): string {
  const nombre = cuota.cliente.nombre_completo
  const modelo = `${cuota.motor.marca} (Préstamo: ${cuota.motor.numero_chasis})`
  const cuotaFormateada = cuota.cuotaBase.toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const fechaVencimiento = formatDate(cuota.fechaVencimiento)
  const totalFormateado = cuota.totalAPagar.toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  
  let mensaje = `Hola ${nombre}, te recordamos de ${EMPRESA.nombre}. `
  
  if (diasRestantes === 0) {
    mensaje += `Tu pago por el motor ${modelo} de $${cuotaFormateada} vence HOY (${fechaVencimiento}). `
  } else if (diasRestantes === 1) {
    mensaje += `Tu pago por el motor ${modelo} de $${cuotaFormateada} vence MAÑANA (${fechaVencimiento}). `
  } else {
    mensaje += `Tu pago por el motor ${modelo} de $${cuotaFormateada} vence en ${diasRestantes} días (${fechaVencimiento}). `
  }
  
  mensaje += `El total a pagar es $${totalFormateado}. `
  mensaje += `Por favor, confirma tu pago. Gracias.`
  
  return encodeURIComponent(mensaje)
}

/**
 * Formatea un número de teléfono para WhatsApp en formato E.164
 * E.164: +[código de país][número sin ceros iniciales]
 * Ejemplos:
 * - República Dominicana: +18091234567 (1 + 809 + 1234567)
 * - Estados Unidos: +12125551234 (1 + 212 + 5551234)
 */
export function formatearTelefonoWhatsApp(telefono: string): string {
  // Limpiar el número: remover todo excepto dígitos y el signo +
  let telefonoLimpio = telefono.replace(/[^\d+]/g, '')
  
  // Si ya tiene el signo +, removerlo para procesarlo
  const tieneSignoMas = telefonoLimpio.startsWith('+')
  if (tieneSignoMas) {
    telefonoLimpio = telefonoLimpio.substring(1)
  }
  
  // Remover ceros iniciales
  telefonoLimpio = telefonoLimpio.replace(/^0+/, '')
  
  // Si está vacío después de limpiar, retornar el original
  if (!telefonoLimpio || telefonoLimpio.length === 0) {
    return telefono
  }
  
  // Detectar código de país basado en la longitud y prefijos comunes
  let telefonoFormateado = telefonoLimpio
  
  // República Dominicana: códigos 809, 829, 849
  if (telefonoLimpio.length === 10 && /^(809|829|849)/.test(telefonoLimpio)) {
    // Formato: 8091234567 -> 18091234567
    telefonoFormateado = '1' + telefonoLimpio
  }
  // Si tiene 10 dígitos y empieza con 1, ya tiene código de país
  else if (telefonoLimpio.length === 11 && telefonoLimpio.startsWith('1')) {
    // Ya está en formato correcto: 18091234567
    telefonoFormateado = telefonoLimpio
  }
  // Si tiene 10 dígitos sin código de país, asumir República Dominicana
  else if (telefonoLimpio.length === 10 && !telefonoLimpio.startsWith('1')) {
    telefonoFormateado = '1' + telefonoLimpio
  }
  // Si tiene menos de 10 dígitos, puede ser un número local incompleto
  else if (telefonoLimpio.length < 10) {
    // Intentar agregar código de país si parece ser un número dominicano
    if (/^(809|829|849)/.test(telefonoLimpio)) {
      telefonoFormateado = '1' + telefonoLimpio
    } else {
      // Si no coincide con ningún patrón conocido, retornar con código por defecto
      telefonoFormateado = '1' + telefonoLimpio
    }
  }
  // Si ya tiene código de país (más de 10 dígitos), usar tal cual
  else if (telefonoLimpio.length > 10) {
    telefonoFormateado = telefonoLimpio
  }
  
  // Asegurar que no tenga el signo + (wa.me lo agrega automáticamente)
  telefonoFormateado = telefonoFormateado.replace(/^\+/, '')
  
  return telefonoFormateado
}

/**
 * Genera la URL de WhatsApp para un mensaje
 * Optimizada para funcionar tanto en computadoras (WhatsApp Web) como en celulares
 */
export function generarUrlWhatsApp(telefono: string, mensaje: string): string {
  const telefonoFormateado = formatearTelefonoWhatsApp(telefono)
  
  // wa.me funciona tanto en móviles como en desktop
  // En móviles: abre la app de WhatsApp
  // En desktop: abre WhatsApp Web
  const url = `https://wa.me/${telefonoFormateado}?text=${mensaje}`
  
  return url
}

/**
 * Abre WhatsApp de forma optimizada (detecta si es móvil o desktop)
 */
export function abrirWhatsApp(telefono: string, mensaje: string): void {
  const url = generarUrlWhatsApp(telefono, mensaje)
  
  // Detectar si es un dispositivo móvil
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
  
  if (isMobile) {
    // En móviles, abrir en la misma ventana (abrirá la app de WhatsApp)
    window.location.href = url
  } else {
    // En desktop, abrir en nueva pestaña (abrirá WhatsApp Web)
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}




