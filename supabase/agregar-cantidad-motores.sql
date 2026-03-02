-- Script para agregar campo de cantidad a la tabla motores
-- Ejecutar este script en Supabase SQL Editor

-- Agregar columna cantidad a la tabla motores (si no existe)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'motores' AND column_name = 'cantidad'
  ) THEN
    ALTER TABLE motores 
    ADD COLUMN cantidad INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Actualizar motores existentes para que tengan cantidad 1
UPDATE motores 
SET cantidad = 1 
WHERE cantidad IS NULL OR cantidad = 0;

-- Eliminar constraint si existe antes de crearlo
ALTER TABLE motores 
DROP CONSTRAINT IF EXISTS check_cantidad_positiva;

-- Agregar constraint para que cantidad sea mayor o igual a 0
ALTER TABLE motores 
ADD CONSTRAINT check_cantidad_positiva 
CHECK (cantidad >= 0);

-- Crear índice para búsquedas por cantidad
CREATE INDEX IF NOT EXISTS idx_motores_cantidad ON motores(cantidad);




