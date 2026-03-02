-- Script para VERIFICAR los tipos de datos numéricos en la tabla motores
-- Ejecuta esto primero para ver qué tipos tienen las columnas

SELECT 
  column_name, 
  data_type,
  numeric_precision,
  numeric_scale,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'motores' 
  AND column_name IN ('precio_venta', 'cantidad')
ORDER BY column_name;

