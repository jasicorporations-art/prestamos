-- ========================================
-- SISTEMA MULTIUSUARIO Y SUCURSALES
-- ========================================
-- Ejecutar este script en Supabase SQL Editor
-- Este script implementa el sistema completo de multiusuarios y sucursales

-- 1. Crear tabla de Sucursales
CREATE TABLE IF NOT EXISTS sucursales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  direccion TEXT,
  telefono VARCHAR(50),
  empresa_id VARCHAR(255), -- Referencia a la empresa (compatible con compania_id existente)
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Si la tabla ya existe pero empresa_id es UUID, cambiarlo a VARCHAR
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sucursales' 
    AND column_name = 'empresa_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE sucursales ALTER COLUMN empresa_id TYPE VARCHAR(255);
  END IF;
END $$;

-- 2. Crear tabla de Perfiles de Usuarios
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo VARCHAR(255),
  rol VARCHAR(50) NOT NULL DEFAULT 'Vendedor' CHECK (rol IN ('Admin', 'Vendedor')),
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  empresa_id VARCHAR(255), -- Referencia a la empresa (compatible con compania_id existente)
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Si la tabla ya existe pero empresa_id es UUID, cambiarlo a VARCHAR
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'perfiles' 
    AND column_name = 'empresa_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE perfiles ALTER COLUMN empresa_id TYPE VARCHAR(255);
  END IF;
END $$;

-- 3. Agregar empresa_id y sucursal_id a tabla clientes
-- empresa_id es VARCHAR para coincidir con el tipo de compania_id existente
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL;

-- Si empresa_id ya existe como UUID, cambiarlo a VARCHAR
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clientes' 
    AND column_name = 'empresa_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE clientes ALTER COLUMN empresa_id TYPE VARCHAR(255);
  END IF;
END $$;

-- 4. Agregar empresa_id y sucursal_id a tabla ventas (créditos)
-- empresa_id es VARCHAR para coincidir con el tipo de compania_id existente
ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL;

-- Si empresa_id ya existe como UUID, cambiarlo a VARCHAR
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ventas' 
    AND column_name = 'empresa_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE ventas ALTER COLUMN empresa_id TYPE VARCHAR(255);
  END IF;
END $$;

-- 5. Agregar campos adicionales a tabla pagos
-- empresa_id es VARCHAR para coincidir con el tipo de compania_id existente
ALTER TABLE pagos 
ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS usuario_que_cobro UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sucursal_donde_se_cobro UUID REFERENCES sucursales(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Si empresa_id ya existe como UUID, cambiarlo a VARCHAR
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pagos' 
    AND column_name = 'empresa_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE pagos ALTER COLUMN empresa_id TYPE VARCHAR(255);
  END IF;
END $$;

-- 6. Crear tabla de Historial de Actividad (Logs)
CREATE TABLE IF NOT EXISTS actividad_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nombre VARCHAR(255),
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  sucursal_nombre VARCHAR(255),
  accion VARCHAR(255) NOT NULL, -- Ej: 'Registró un pago', 'Creó un cliente', 'Emitió un crédito'
  detalle TEXT, -- Información adicional de la acción
  entidad_tipo VARCHAR(50), -- 'cliente', 'venta', 'pago', etc.
  entidad_id UUID, -- ID de la entidad afectada
  fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_sucursal ON clientes(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_ventas_empresa ON ventas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ventas_sucursal ON ventas(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_pagos_empresa ON pagos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagos_sucursal ON pagos(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_pagos_usuario_cobro ON pagos(usuario_que_cobro);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha_hora ON pagos(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_perfiles_user_id ON perfiles(user_id);
CREATE INDEX IF NOT EXISTS idx_perfiles_sucursal ON perfiles(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_actividad_logs_usuario ON actividad_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_actividad_logs_fecha ON actividad_logs(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_actividad_logs_sucursal ON actividad_logs(sucursal_id);

-- 8. Actualizar datos existentes con empresa_id (usando compania_id si existe)
-- Esto es para migrar datos existentes
DO $$
BEGIN
  -- Migrar clientes existentes
  UPDATE clientes 
  SET empresa_id = compania_id 
  WHERE empresa_id IS NULL AND compania_id IS NOT NULL;
  
  -- Migrar ventas existentes
  UPDATE ventas 
  SET empresa_id = compania_id 
  WHERE empresa_id IS NULL AND compania_id IS NOT NULL;
  
  -- Migrar pagos existentes
  UPDATE pagos 
  SET empresa_id = compania_id 
  WHERE empresa_id IS NULL AND compania_id IS NOT NULL;
END $$;

-- 9. Crear función para registrar actividad automáticamente
CREATE OR REPLACE FUNCTION registrar_actividad(
  p_usuario_id UUID,
  p_usuario_nombre VARCHAR(255),
  p_sucursal_id UUID,
  p_sucursal_nombre VARCHAR(255),
  p_accion VARCHAR(255),
  p_detalle TEXT DEFAULT NULL,
  p_entidad_tipo VARCHAR(50) DEFAULT NULL,
  p_entidad_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO actividad_logs (
    usuario_id,
    usuario_nombre,
    sucursal_id,
    sucursal_nombre,
    accion,
    detalle,
    entidad_tipo,
    entidad_id
  ) VALUES (
    p_usuario_id,
    p_usuario_nombre,
    p_sucursal_id,
    p_sucursal_nombre,
    p_accion,
    p_detalle,
    p_entidad_tipo,
    p_entidad_id
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Comentarios para documentación
COMMENT ON TABLE sucursales IS 'Tabla de sucursales/ubicaciones de la empresa';
COMMENT ON TABLE perfiles IS 'Perfiles de usuarios con roles y sucursales asignadas';
COMMENT ON TABLE actividad_logs IS 'Historial de actividad de usuarios en el sistema';
COMMENT ON COLUMN clientes.empresa_id IS 'ID de la empresa a la que pertenece el cliente';
COMMENT ON COLUMN clientes.sucursal_id IS 'ID de la sucursal donde se creó el cliente';
COMMENT ON COLUMN ventas.empresa_id IS 'ID de la empresa a la que pertenece la venta/crédito';
COMMENT ON COLUMN ventas.sucursal_id IS 'ID de la sucursal donde se originó el crédito';
COMMENT ON COLUMN pagos.empresa_id IS 'ID de la empresa a la que pertenece el pago';
COMMENT ON COLUMN pagos.sucursal_id IS 'ID de la sucursal donde se registró el pago';
COMMENT ON COLUMN pagos.usuario_que_cobro IS 'ID del usuario que registró el pago';
COMMENT ON COLUMN pagos.sucursal_donde_se_cobro IS 'ID de la sucursal donde se cobró el pago';
COMMENT ON COLUMN pagos.fecha_hora IS 'Fecha y hora exacta del pago (con zona horaria)';

-- 11. Trigger para actualizar updated_at en sucursales y perfiles
-- Eliminar triggers existentes si existen antes de crearlos
DROP TRIGGER IF EXISTS update_sucursales_updated_at ON sucursales;
DROP TRIGGER IF EXISTS update_perfiles_updated_at ON perfiles;

CREATE TRIGGER update_sucursales_updated_at BEFORE UPDATE ON sucursales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_perfiles_updated_at BEFORE UPDATE ON perfiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Script completado
-- IMPORTANTE: Después de ejecutar este script, necesitarás:
-- 1. Crear sucursales manualmente desde la aplicación o directamente en Supabase
-- 2. Actualizar los perfiles de usuarios existentes para asignarles una sucursal
-- 3. Ejecutar los scripts de migración de datos si es necesario

