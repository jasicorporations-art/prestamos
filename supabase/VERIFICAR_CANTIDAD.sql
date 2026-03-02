-- Script para VERIFICAR si la columna cantidad existe
-- Ejecuta este primero para verificar el estado actual

SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable,
  character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'motores' 
  AND column_name = 'cantidad';

-- Si no devuelve ninguna fila, la columna NO existe
-- Si devuelve una fila, la columna SÍ existe






