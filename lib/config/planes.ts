/**
 * Configuración de planes de suscripción SaaS
 */

export type PlanType = 'TRIAL' | 'INICIAL' | 'BRONCE' | 'PLATA' | 'ORO' | 'INFINITO'

export interface PlanLimits {
  clientes: number | 'ilimitado'
  prestamos: number | 'ilimitado'
  whatsapp: 'manual' | 'automatico'
  facturaPDF: boolean
  reportesGanancias: boolean
  soportePrioritario: boolean
}

export interface Plan {
  id: PlanType
  nombre: string
  precio: number
  periodo: 'mes' | 'año' | 'pago_unico'
  limites: PlanLimits
  popular?: boolean
  color: string
  descripcion: string
  caracteristicas: string[]
  esVitalicio?: boolean
}

export const PLANES: Record<PlanType, Plan> = {
  TRIAL: {
    id: 'TRIAL',
    nombre: 'Plan de Prueba',
    precio: 0,
    periodo: 'mes',
    limites: {
      clientes: 3,
      prestamos: 2,
      whatsapp: 'manual',
      facturaPDF: true,
      reportesGanancias: true,
      soportePrioritario: false,
    },
    color: 'bg-blue-500',
    descripcion: 'Prueba gratuita de 7 días',
    caracteristicas: [
      'Hasta 3 clientes',
      'Hasta 3 préstamos activos',
      'Todas las funciones desbloqueadas',
      'WhatsApp manual',
      'Factura PDF y Reportes',
      'Acceso completo por 7 días',
      'Sin tarjeta de crédito',
    ],
  },
  INICIAL: {
    id: 'INICIAL',
    nombre: 'Plan Inicial',
    precio: 9.99,
    periodo: 'mes',
    limites: {
      clientes: 10,
      prestamos: 4,
      whatsapp: 'manual',
      facturaPDF: false,
      reportesGanancias: false,
      soportePrioritario: false,
    },
    color: 'bg-gray-500',
    descripcion: 'Perfecto para empezar',
    caracteristicas: [
      'Hasta 10 clientes',
      'Hasta 4 préstamos activos',
      'WhatsApp manual',
      'Soporte por email',
    ],
  },
  BRONCE: {
    id: 'BRONCE',
    nombre: 'Plan Bronce',
    precio: 19.99,
    periodo: 'mes',
    limites: {
      clientes: 200,
      prestamos: 60,
      whatsapp: 'manual',
      facturaPDF: false,
      reportesGanancias: false,
      soportePrioritario: false,
    },
    color: 'bg-amber-600',
    descripcion: 'Perfecto para comenzar',
    caracteristicas: [
      'Hasta 200 clientes',
      'Hasta 60 préstamos activos',
      '1 sucursal',
      'Hasta 3 vendedores (no administradores)',
      'WhatsApp manual',
      'Soporte por email',
    ],
  },
  PLATA: {
    id: 'PLATA',
    nombre: 'Plan Plata',
    precio: 49.99,
    periodo: 'mes',
    limites: {
      clientes: 500,
      prestamos: 200,
      whatsapp: 'automatico',
      facturaPDF: true,
      reportesGanancias: false,
      soportePrioritario: false,
    },
    popular: true,
    color: 'bg-rose-500',
    descripcion: 'El más popular para negocios en crecimiento',
    caracteristicas: [
      'Hasta 500 clientes (límite total, no se restablece al borrar)',
      'Hasta 200 préstamos activos',
      'Hasta 3 sucursales',
      'WhatsApp automático',
      'Factura PDF personalizada',
      'Creación de sucursales',
      'Creación y eliminación de usuarios',
      'Gestión de mora',
      'Historial de movimiento de los usuarios',
      'Supervisión de movimientos económicos de cada sucursal',
      'Abrir y cerrar cajas de cada sucursal',
      'Soporte prioritario',
    ],
  },
  ORO: {
    id: 'ORO',
    nombre: 'Plan Oro',
    precio: 99.99,
    periodo: 'mes',
    limites: {
      clientes: 'ilimitado',
      prestamos: 'ilimitado',
      whatsapp: 'automatico',
      facturaPDF: true,
      reportesGanancias: true,
      soportePrioritario: true,
    },
    color: 'bg-amber-500',
    descripcion: 'Para negocios grandes',
    caracteristicas: [
      'Clientes ilimitados',
      'Préstamos ilimitados',
      'WhatsApp automático',
      'Factura PDF personalizada',
      'Creación de sucursales',
      'Creación y eliminación de usuarios',
      'Gestión de mora avanzada',
      'Historial de movimiento de los usuarios',
      'Supervisión de movimientos económicos de cada sucursal',
      'Abrir y cerrar cajas de cada sucursal',
      'Reportes de ganancias',
      'Soporte prioritario 24/7',
    ],
  },
  INFINITO: {
    id: 'INFINITO',
    nombre: 'Plan Infinito',
    precio: 1699,
    periodo: 'pago_unico',
    limites: {
      clientes: 'ilimitado',
      prestamos: 'ilimitado',
      whatsapp: 'automatico',
      facturaPDF: true,
      reportesGanancias: true,
      soportePrioritario: true,
    },
    esVitalicio: true,
    color: 'bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500',
    descripcion: 'Acceso de por vida, sin renovaciones',
    caracteristicas: [
      'Clientes ilimitados de por vida',
      'Préstamos ilimitados de por vida',
      'WhatsApp automático',
      'Factura PDF personalizada',
      'Creación de sucursales ilimitadas',
      'Creación y eliminación de usuarios',
      'Gestión de mora avanzada',
      'Historial completo de movimiento de los usuarios',
      'Supervisión de movimientos económicos de cada sucursal',
      'Abrir y cerrar cajas de cada sucursal',
      'Reportes de ganancias avanzados',
      'Soporte prioritario 24/7',
      'Sin renovaciones mensuales',
      'Pago único, acceso permanente',
    ],
  },
}

/**
 * Obtiene los límites de un plan
 */
export function getPlanLimits(planType: PlanType): PlanLimits {
  return PLANES[planType].limites
}

/**
 * Verifica si un valor está dentro del límite
 */
export function isWithinLimit(used: number, limit: number | 'ilimitado'): boolean {
  if (limit === 'ilimitado') return true
  return used < limit
}

/**
 * Obtiene el porcentaje de uso de un límite
 */
export function getUsagePercentage(used: number, limit: number | 'ilimitado'): number {
  if (limit === 'ilimitado') return 0
  if (limit === 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

