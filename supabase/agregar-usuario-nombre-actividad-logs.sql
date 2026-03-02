-- Agregar columna usuario_nombre a actividad_logs (si no existe)
-- Ejecutar en Supabase SQL Editor si al registrar un pago aparece: column "usuario_nombre" of relation "actividad_logs" does not exist

ALTER TABLE actividad_logs ADD COLUMN IF NOT EXISTS usuario_nombre TEXT;
ALTER TABLE actividad_logs ADD COLUMN IF NOT EXISTS sucursal_id UUID;
ALTER TABLE actividad_logs ADD COLUMN IF NOT EXISTS sucursal_nombre TEXT;

COMMENT ON COLUMN actividad_logs.usuario_nombre IS 'Nombre del usuario que realizó la acción';
