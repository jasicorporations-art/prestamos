-- ⚠️ EJECUTA ESTE SCRIPT EN SUPABASE SQL EDITOR
-- Este script agrega la columna "cantidad" a la tabla motores

-- Paso 1: Agregar columna cantidad
ALTER TABLE motores 
ADD COLUMN IF NOT EXISTS cantidad INTEGER NOT NULL DEFAULT 1;

-- Paso 2: Actualizar motores existentes
UPDATE motores 
SET cantidad = 1 
WHERE cantidad IS NULL OR cantidad = 0;

-- Paso 3: Agregar constraint (puede dar error si ya existe, está bien)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_cantidad_positiva'
    ) THEN
        ALTER TABLE motores 
        ADD CONSTRAINT check_cantidad_positiva 
        CHECK (cantidad >= 0);
    END IF;
END $$;

-- Paso 4: Crear índice
CREATE INDEX IF NOT EXISTS idx_motores_cantidad ON motores(cantidad);

-- Verificar que se creó correctamente
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'motores' AND column_name = 'cantidad';

