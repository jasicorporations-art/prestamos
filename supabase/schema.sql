-- Esquema de base de datos para JASICORPORATIONS GESTION DE PRESTAMOS
-- Ejecutar este script en Supabase SQL Editor

-- Tabla de Motores
CREATE TABLE IF NOT EXISTS motores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca VARCHAR(255) NOT NULL,
  matricula VARCHAR(255) NOT NULL UNIQUE,
  numero_chasis VARCHAR(255) NOT NULL UNIQUE,
  precio_venta DECIMAL(10, 2) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'Disponible' CHECK (estado IN ('Disponible', 'Vendido')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo VARCHAR(255) NOT NULL,
  cedula VARCHAR(50) NOT NULL UNIQUE,
  direccion TEXT NOT NULL,
  nombre_garante VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Ventas
CREATE TABLE IF NOT EXISTS ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motor_id UUID NOT NULL REFERENCES motores(id) ON DELETE RESTRICT,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  monto_total DECIMAL(10, 2) NOT NULL,
  cantidad_cuotas INTEGER NOT NULL CHECK (cantidad_cuotas > 0),
  saldo_pendiente DECIMAL(10, 2) NOT NULL,
  fecha_venta TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Pagos
CREATE TABLE IF NOT EXISTS pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  monto DECIMAL(10, 2) NOT NULL CHECK (monto > 0),
  fecha_pago TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  numero_cuota INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_motores_estado ON motores(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_motor ON ventas(motor_id);
CREATE INDEX IF NOT EXISTS idx_pagos_venta ON pagos(venta_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Eliminar triggers existentes si existen (para poder re-ejecutar el script)
DROP TRIGGER IF EXISTS update_motores_updated_at ON motores;
DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
DROP TRIGGER IF EXISTS update_ventas_updated_at ON ventas;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_motores_updated_at BEFORE UPDATE ON motores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ventas_updated_at BEFORE UPDATE ON ventas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS) - Opcional, ajustar según necesidades
-- ALTER TABLE motores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

-- Políticas de ejemplo (descomentar y ajustar según necesidades)
-- CREATE POLICY "Permitir lectura pública" ON motores FOR SELECT USING (true);
-- CREATE POLICY "Permitir inserción pública" ON motores FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Permitir actualización pública" ON motores FOR UPDATE USING (true);
-- CREATE POLICY "Permitir eliminación pública" ON motores FOR DELETE USING (true);


