-- Agregar columna año a la tabla motores
-- Ejecutar este script en el SQL Editor de Supabase

ALTER TABLE motores
ADD COLUMN IF NOT EXISTS año INTEGER;

-- Comentario para documentación
COMMENT ON COLUMN motores.año IS 'Año del vehículo';

