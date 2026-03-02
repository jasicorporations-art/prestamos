-- Agregar columnas entidad_tipo y entidad_id a actividad_logs (si no existen)
-- Ejecutar en Supabase SQL Editor si aparece: column "entidad_tipo" of relation "actividad_logs" does not exist

ALTER TABLE actividad_logs ADD COLUMN IF NOT EXISTS entidad_tipo VARCHAR(50);
ALTER TABLE actividad_logs ADD COLUMN IF NOT EXISTS entidad_id UUID;

COMMENT ON COLUMN actividad_logs.entidad_tipo IS 'Tipo de entidad: pago, venta, cliente, etc.';
COMMENT ON COLUMN actividad_logs.entidad_id IS 'ID de la entidad relacionada';
