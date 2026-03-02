-- Agregar campo de plazo de financiamiento a la tabla de ventas
-- Ejecutar este script en Supabase SQL Editor

-- Agregar columna de plazo en meses
ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS plazo_meses INTEGER CHECK (plazo_meses > 0);

-- Agregar columna de porcentaje de interés aplicado
ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS porcentaje_interes DECIMAL(5, 2) DEFAULT 0;

-- Agregar columna de tipo de interés (descuento o interés)
ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS tipo_interes VARCHAR(10) CHECK (tipo_interes IN ('descuento', 'interes'));

-- Comentarios para documentación
COMMENT ON COLUMN ventas.plazo_meses IS 'Plazo de financiamiento en meses';
COMMENT ON COLUMN ventas.porcentaje_interes IS 'Porcentaje de interés o descuento aplicado';
COMMENT ON COLUMN ventas.tipo_interes IS 'Tipo: descuento (reduce precio) o interes (aumenta precio)';

-- Verificar que se agregaron correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ventas' 
AND column_name IN ('plazo_meses', 'porcentaje_interes', 'tipo_interes');

