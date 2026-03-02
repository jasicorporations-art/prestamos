-- Agregar columna tipo_interes a la tabla ventas
-- Ejecutar en Supabase: SQL Editor > New query > Pegar y Run

-- Si la columna no existe, la creamos
ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS tipo_interes VARCHAR(20) DEFAULT 'interes';

-- Si ya existe pero sin valor por defecto, actualizar filas existentes
UPDATE ventas SET tipo_interes = 'interes' WHERE tipo_interes IS NULL;

-- Comentario para documentación
COMMENT ON COLUMN ventas.tipo_interes IS 'Tipo: descuento (reduce precio) o interes (aumenta precio)';
