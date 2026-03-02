export type MotorEstado = 'Nuevo' | 'Reacondicionado' | 'Usado' | 'Disponible' | 'Vendido'

export interface Motor {
  id: string
  marca: string
  matricula: string
  numero_chasis: string
  precio_venta: number
  estado: MotorEstado
  cantidad: number
  modelo?: string
  categoria?: string
  tipo_articulo?: string
  capacidad?: string
  dimension_altura?: string
  dimension_ancho?: string
  dimension_profundidad?: string
  eficiencia_energetica?: string
  color?: string
  año?: number
  numero_chasis_real?: string // Número de chasis real del vehículo (diferente del número de préstamo)
  compania_id?: string
  app_id?: string
  created_at?: string
  updated_at?: string
}

export interface Cliente {
  id: string
  nombre_completo: string
  cedula: string
  direccion: string
  nombre_garante: string
  direccion_garante?: string
  telefono_garante?: string
  email_garante?: string
  numero_prestamo_cliente?: string
  celular?: string
  whatsapp_activo?: boolean
  email?: string
  fecha_compra?: string
  fecha_finalizacion_prestamo?: string
  dia_pagos?: number
  url_id_frontal?: string
  url_id_trasera?: string
  url_contrato?: string
  latitud_negocio?: number | null
  longitud_negocio?: number | null
  compania_id?: string
  empresa_id?: string // ID de la empresa (multi-tenant)
  sucursal_id?: string // ID de la sucursal donde se creó
  app_id?: string
  created_at?: string
  updated_at?: string
}

export type VentaStatus = 'pending' | 'active' | 'rejected' | 'completed'

export interface Venta {
  id: string
  motor_id: string
  cliente_id: string
  numero_prestamo?: string
  monto_total: number
  cantidad_cuotas: number
  saldo_pendiente: number
  fecha_venta: string
  tipo_pago?: 'financiamiento' | 'contado'
  descuento_contado?: number
  plazo_meses?: number // Plazo de financiamiento en meses
  porcentaje_interes?: number // Porcentaje de interés aplicado (por período si metodo_interes es sobre_saldo)
  tipo_interes?: 'descuento' | 'interes' // Tipo de interés
  metodo_interes?: 'sobre_saldo' | 'fijo' // Sobre Saldo = compuesto sobre balance; Fijo = lineal
  tipo_plazo?: 'diario' | 'semanal' | 'quincenal' | 'mensual' // Tipo de plazo de pago
  dia_pago_semanal?: number // Día de la semana para pagos semanales (0 = Domingo, 6 = Sábado)
  fecha_inicio_quincenal?: string // Fecha de inicio para pagos quincenales (cada 15 días)
  dia_pago_mensual?: number // Día del mes para pagos mensuales (1-31)
  compania_id?: string
  empresa_id?: string // ID de la empresa (multi-tenant)
  sucursal_id?: string // ID de la sucursal donde se originó el crédito
  ruta_id?: string | null
  orden_visita?: number
  status?: VentaStatus
  app_id?: string
  tipo_garantia?: string | null
  descripcion_garantia?: string | null
  valor_estimado?: number | null
  created_at?: string
  updated_at?: string
  motor?: Motor
  cliente?: Cliente
  cargosMora?: number // Total de cargos por mora pendientes
}

export const TIPOS_GARANTIA = ['Ninguna', 'Vehículo (Motor/Carro)', 'Hipotecario (Casa/Terreno)', 'Electrodoméstico', 'Otro'] as const

export interface Ruta {
  id: string
  sucursal_id: string
  nombre: string
  descripcion?: string
  activa: boolean
  created_at?: string
  updated_at?: string
}

export interface SolicitudCambio {
  id: string
  venta_id: string
  tipo: 'renovacion' | 'nuevo'
  monto_solicitado?: number
  plazo_solicitado?: number
  datos_extra?: Record<string, unknown>
  solicitado_por?: string
  sucursal_id?: string
  status: 'pending' | 'aprobada' | 'rechazada'
  aprobado_por?: string
  fecha_aprobacion?: string
  observaciones?: string
  created_at: string
  venta?: Venta
  cliente?: Cliente
  motor?: Motor
}

export interface Pago {
  id: string
  venta_id: string
  monto: number
  fecha_pago: string
  numero_cuota?: number | null // null = pago inicial, undefined = se asignará automáticamente
  compania_id?: string
  empresa_id?: string // ID de la empresa (multi-tenant)
  sucursal_id?: string // ID de la sucursal donde se registró el pago
  usuario_que_cobro?: string // ID del usuario que registró el pago
  sucursal_donde_se_cobro?: string // ID de la sucursal donde se cobró
  fecha_hora?: string // Fecha y hora exacta del pago
  latitud_cobro?: number | null
  longitud_cobro?: number | null
  app_id?: string
  /** True si el pago no cubre la cuota completa (abono parcial) */
  es_abono_parcial?: boolean
  /** True si un admin autorizó este abono parcial (contraseña o código) */
  autorizado_por_admin?: boolean
  created_at?: string
  venta?: Venta
}

// Nuevos tipos para el sistema multiusuario
export interface Sucursal {
  id: string
  nombre: string
  direccion?: string
  telefono?: string
  empresa_id?: string
  activa: boolean
  cobrar_domingos?: boolean
  created_at?: string
  updated_at?: string
}

export interface Perfil {
  id: string
  user_id: string
  nombre_completo?: string
  rol: 'Admin' | 'Vendedor' | 'super_admin'
  sucursal_id?: string
  ruta_id?: string | null
  empresa_id?: string
  compania_id?: string
  app_id?: string
  activo: boolean
  terminos_aceptados?: boolean
  terminos_version?: string
  fecha_aceptacion?: string
  ip_registro?: string
  privacidad_aceptada?: boolean
  privacidad_version?: string
  privacidad_fecha_aceptacion?: string
  privacidad_ip?: string
  tour_completado?: boolean
  has_whatsapp_premium?: boolean
  premium_until?: string | null
  created_at?: string
  updated_at?: string
  sucursal?: Sucursal
  ruta?: Ruta
}

export interface LegalAceptacion {
  id: string
  user_id: string
  documento: 'terminos' | 'privacidad'
  version: string
  accepted_at: string
  ip_address?: string | null
  user_agent?: string | null
  created_at?: string
}

export interface ActividadLog {
  id: string
  usuario_id?: string
  usuario_nombre?: string
  sucursal_id?: string
  sucursal_nombre?: string
  accion: string
  detalle?: string
  entidad_tipo?: string
  entidad_id?: string
  fecha_hora: string
  app_id?: string
  created_at?: string
}

// Tipos para sistema de cierre de caja
export interface Caja {
  id: string
  sucursal_id: string
  usuario_id: string
  monto_apertura: number
  monto_cierre_esperado: number
  monto_cierre_real?: number | null
  diferencia?: number | null
  estado: 'Abierta' | 'Cerrada'
  fecha: string
  observaciones?: string | null
  app_id?: string
  created_at?: string
  updated_at?: string
  sucursal?: Sucursal
  usuario?: {
    id: string
    nombre_completo?: string
    email?: string
  }
}

export interface MovimientoCaja {
  id: string
  caja_id: string
  sucursal_id: string
  usuario_id: string
  tipo: 'Entrada' | 'Salida'
  monto: number
  concepto: string
  observaciones?: string | null
  fecha_hora: string
  app_id?: string
  created_at?: string
  caja?: Caja
  usuario?: {
    id: string
    nombre_completo?: string
    email?: string
  }
}

export interface MovimientoCajaResumen extends MovimientoCaja {
  usuario_nombre?: string
  usuario_email?: string
  ingresos_dia?: number
  salidas_dia?: number
  ingresos_semana?: number
  salidas_semana?: number
  ingresos_mes?: number
  salidas_mes?: number
  ingresos_anio?: number
  salidas_anio?: number
}

export interface ResumenTotalesCajaPeriodo {
  ingresos: number
  salidas: number
  neto: number
}

export interface ResumenTotalesCaja {
  dia: ResumenTotalesCajaPeriodo
  semana: ResumenTotalesCajaPeriodo
  mes: ResumenTotalesCajaPeriodo
  anio: ResumenTotalesCajaPeriodo
}



