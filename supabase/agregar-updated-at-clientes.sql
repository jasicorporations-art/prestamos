-- Agregar columna updated_at a la tabla clientes (si no existe)
-- Ejecutar en Supabase SQL Editor si al actualizar clientes aparece error de columna inexistente

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN clientes.updated_at IS 'Fecha y hora de última actualización del registro';
