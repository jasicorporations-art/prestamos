// Tipos para las tablas de Supabase
export type Database = {
  public: {
    Tables: {
      motores: {
        Row: {
          id: string
          marca: string
          matricula: string
          numero_chasis: string
          precio_venta: number
          estado: 'Nuevo' | 'Reacondicionado' | 'Usado' | 'Disponible' | 'Vendido'
          cantidad: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          marca: string
          matricula: string
          numero_chasis: string
          precio_venta: number
          estado?: 'Nuevo' | 'Reacondicionado' | 'Usado' | 'Disponible' | 'Vendido'
          cantidad?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          marca?: string
          matricula?: string
          numero_chasis?: string
          precio_venta?: number
          estado?: 'Nuevo' | 'Reacondicionado' | 'Usado' | 'Disponible' | 'Vendido'
          cantidad?: number
          created_at?: string
          updated_at?: string
        }
      }
      clientes: {
        Row: {
          id: string
          nombre_completo: string
          cedula: string
          direccion: string
          nombre_garante: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre_completo: string
          cedula: string
          direccion: string
          nombre_garante: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre_completo?: string
          cedula?: string
          direccion?: string
          nombre_garante?: string
          created_at?: string
          updated_at?: string
        }
      }
      ventas: {
        Row: {
          id: string
          motor_id: string
          cliente_id: string
          numero_prestamo?: string
          monto_total: number
          cantidad_cuotas: number
          saldo_pendiente: number
          fecha_venta: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          motor_id: string
          cliente_id: string
          numero_prestamo?: string
          monto_total: number
          cantidad_cuotas: number
          saldo_pendiente: number
          fecha_venta: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          motor_id?: string
          cliente_id?: string
          numero_prestamo?: string
          monto_total?: number
          cantidad_cuotas?: number
          saldo_pendiente?: number
          fecha_venta?: string
          created_at?: string
          updated_at?: string
        }
      }
      pagos: {
        Row: {
          id: string
          venta_id: string
          monto: number
          fecha_pago: string
          numero_cuota: number | null
          created_at: string
        }
        Insert: {
          id?: string
          venta_id: string
          monto: number
          fecha_pago: string
          numero_cuota?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          venta_id?: string
          monto?: number
          fecha_pago?: string
          numero_cuota?: number | null
          created_at?: string
        }
      }
    }
  }
}


