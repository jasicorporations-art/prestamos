-- ⚠️ EJECUTA ESTE SCRIPT EN SUPABASE SQL EDITOR
-- Este script agrega la columna "cantidad" a la tabla motores
-- Copia TODO este contenido y pégalo en el SQL Editor de Supabase

-- Paso 1: Agregar columna cantidad (si no existe)
ALTER TABLE motores 
ADD COLUMN IF NOT EXISTS cantidad INTEGER DEFAULT 1;

-- Paso 2: Actualizar valores NULL a 1 (para motores existentes)
UPDATE motores 
SET cantidad = 1 
WHERE cantidad IS NULL;

-- Paso 3: Hacer la columna NOT NULL (después de actualizar los NULLs)
DO $$ 
BEGIN
  -- Primero, hacer que todos los valores NULL sean 1 (por si acaso)
  UPDATE motores SET cantidad = 1 WHERE cantidad IS NULL;
  
  -- Luego, alterar la columna para que sea NOT NULL
  ALTER TABLE motores 
  ALTER COLUMN cantidad SET NOT NULL;
  
  -- Establecer el valor por defecto
  ALTER TABLE motores 
  ALTER COLUMN cantidad SET DEFAULT 1;
EXCEPTION
  WHEN others THEN
    -- Si ya es NOT NULL, simplemente continuar
    NULL;
END $$;

-- Paso 4: Eliminar constraint si existe (para evitar errores)
ALTER TABLE motores 
DROP CONSTRAINT IF EXISTS check_cantidad_positiva;

-- Paso 5: Agregar constraint para que cantidad sea mayor o igual a 0
ALTER TABLE motores 
ADD CONSTRAINT check_cantidad_positiva 
CHECK (cantidad >= 0);

-- Paso 6: Crear índice para búsquedas por cantidad (si no existe)
CREATE INDEX IF NOT EXISTS idx_motores_cantidad ON motores(cantidad);

-- Verificar que se creó correctamente
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'motores' AND column_name = 'cantidad';






