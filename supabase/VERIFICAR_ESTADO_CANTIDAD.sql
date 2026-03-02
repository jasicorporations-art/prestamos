-- Script para VERIFICAR el estado COMPLETO de la columna cantidad
-- Ejecuta esto en Supabase SQL Editor para ver todos los detalles

-- 1. Verificar si la columna existe y sus propiedades
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable,
  character_maximum_length,
  numeric_precision,
  numeric_scale
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'motores' 
  AND column_name = 'cantidad';

-- 2. Verificar constraints en la columna
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'motores'
  AND ccu.column_name = 'cantidad';

-- 3. Verificar índices en la columna
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'motores'
  AND indexdef LIKE '%cantidad%';

-- 4. Ver algunos valores de ejemplo
SELECT 
  id,
  marca,
  numero_chasis,
  cantidad,
  estado
FROM motores
LIMIT 5;






