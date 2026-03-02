-- Script para agregar campo de cantidad a la tabla motores (VERSIÓN SIMPLE)
-- Ejecutar este script en Supabase SQL Editor

-- Paso 1: Agregar columna cantidad (si no existe)
ALTER TABLE motores 
ADD COLUMN IF NOT EXISTS cantidad INTEGER DEFAULT 1;

-- Paso 2: Actualizar valores NULL a 1
UPDATE motores 
SET cantidad = 1 
WHERE cantidad IS NULL;

-- Paso 3: Hacer la columna NOT NULL (solo si no tiene datos NULL)
-- Si hay datos NULL, el paso anterior los actualizó a 1
ALTER TABLE motores 
ALTER COLUMN cantidad SET NOT NULL;

ALTER TABLE motores 
ALTER COLUMN cantidad SET DEFAULT 1;

-- Paso 4: Eliminar constraint si existe
ALTER TABLE motores 
DROP CONSTRAINT IF EXISTS check_cantidad_positiva;

-- Paso 5: Agregar constraint para que cantidad sea mayor o igual a 0
ALTER TABLE motores 
ADD CONSTRAINT check_cantidad_positiva 
CHECK (cantidad >= 0);

-- Paso 6: Crear índice para búsquedas por cantidad
CREATE INDEX IF NOT EXISTS idx_motores_cantidad ON motores(cantidad);

