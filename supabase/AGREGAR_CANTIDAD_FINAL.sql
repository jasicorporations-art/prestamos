-- ⚠️ EJECUTA ESTE SCRIPT EN SUPABASE SQL EDITOR
-- Script FINAL y SIMPLIFICADO para agregar columna cantidad
-- Este script es más robusto y maneja errores

-- PASO 1: Agregar la columna (si no existe)
DO $$ 
BEGIN
  -- Primero intentar agregar la columna si no existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'motores' 
      AND column_name = 'cantidad'
  ) THEN
    -- Agregar columna como nullable primero
    ALTER TABLE public.motores 
    ADD COLUMN cantidad INTEGER;
    
    -- Llenar valores NULL con 1
    UPDATE public.motores 
    SET cantidad = 1 
    WHERE cantidad IS NULL;
    
    -- Ahora hacerla NOT NULL
    ALTER TABLE public.motores 
    ALTER COLUMN cantidad SET NOT NULL;
    
    -- Establecer valor por defecto
    ALTER TABLE public.motores 
    ALTER COLUMN cantidad SET DEFAULT 1;
    
    RAISE NOTICE 'Columna cantidad agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna cantidad ya existe';
  END IF;
END $$;

-- PASO 2: Eliminar constraint anterior si existe (para evitar errores)
ALTER TABLE public.motores 
DROP CONSTRAINT IF EXISTS check_cantidad_positiva;

-- PASO 3: Agregar constraint de validación
ALTER TABLE public.motores 
ADD CONSTRAINT check_cantidad_positiva 
CHECK (cantidad >= 0);

-- PASO 4: Crear índice (si no existe)
CREATE INDEX IF NOT EXISTS idx_motores_cantidad 
ON public.motores(cantidad);

-- PASO 5: Asegurar que todos los valores NULL sean 1 (por si acaso)
UPDATE public.motores 
SET cantidad = 1 
WHERE cantidad IS NULL;

-- PASO 6: VERIFICACIÓN FINAL
SELECT 
  'VERIFICACIÓN: Columna cantidad' as status,
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'motores' 
  AND column_name = 'cantidad';

