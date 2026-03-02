-- ========================================
-- GARANTÍAS: Campos para respaldo de préstamos
-- ========================================
-- Ejecutar en Supabase SQL Editor

BEGIN;

-- Agregar columnas de garantía a la tabla ventas (préstamos)
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS tipo_garantia VARCHAR(100);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS descripcion_garantia TEXT;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS valor_estimado DECIMAL(12, 2);

COMMENT ON COLUMN ventas.tipo_garantia IS 'Tipo de garantía: Ninguna, Vehículo, Hipotecario, Electrodoméstico, Otro';
COMMENT ON COLUMN ventas.descripcion_garantia IS 'Descripción detallada de la garantía (obligatorio si hay garantía)';
COMMENT ON COLUMN ventas.valor_estimado IS 'Valor estimado de la garantía en la moneda local';

COMMIT;
