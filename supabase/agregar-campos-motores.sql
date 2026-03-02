-- Script para agregar columnas marca, modelo y color a la tabla motores
-- Ejecutar este script en Supabase SQL Editor

-- Paso 1: Agregar columna marca (si no existe)
ALTER TABLE public.motores 
ADD COLUMN IF NOT EXISTS marca VARCHAR(255);

-- Paso 2: Actualizar valores NULL de marca a un valor por defecto
UPDATE public.motores 
SET marca = 'Préstamo' 
WHERE marca IS NULL;

-- Paso 3: Hacer marca NOT NULL después de actualizar los NULLs
DO $$ 
BEGIN
  -- Primero asegurarse de que no hay NULLs
  UPDATE public.motores SET marca = 'Préstamo' WHERE marca IS NULL;
  
  -- Intentar hacer NOT NULL
  BEGIN
    ALTER TABLE public.motores ALTER COLUMN marca SET NOT NULL;
  EXCEPTION
    WHEN others THEN
      -- Si ya es NOT NULL o hay otro error, continuar
      NULL;
  END;
END $$;

-- Paso 4: Agregar columna modelo (opcional, puede ser NULL)
ALTER TABLE public.motores 
ADD COLUMN IF NOT EXISTS modelo VARCHAR(255);

-- Paso 5: Agregar columna color (opcional, puede ser NULL)
ALTER TABLE public.motores 
ADD COLUMN IF NOT EXISTS color VARCHAR(255);

-- Verificación: Mostrar las columnas agregadas
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'motores' 
  AND column_name IN ('marca', 'modelo', 'color')
ORDER BY column_name;

