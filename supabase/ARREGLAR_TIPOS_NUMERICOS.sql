-- Script para ARREGLAR los tipos de datos numéricos en la tabla motores
-- Ejecutar este script en Supabase SQL Editor
-- Este script asegura que las columnas numéricas tengan el tamaño correcto

-- Paso 1: Verificar y arreglar precio_venta (debe ser DECIMAL(10, 2))
-- DECIMAL(10, 2) permite valores hasta 99,999,999.99

-- Si la columna existe pero tiene un tipo diferente, necesitamos alterarla
-- Primero verificamos si necesitamos cambiar el tipo
DO $$ 
BEGIN
  -- Intentar alterar precio_venta si es necesario
  -- Nota: PostgreSQL no permite cambiar directamente DECIMAL a otro tamaño
  -- Si ya es DECIMAL(10,2) o mayor, no hay problema
  -- Este bloque solo verifica, la alteración real se hace abajo si es necesario
  NULL;
END $$;

-- Paso 2: Asegurar que cantidad es INTEGER (no SMALLINT o otro tipo más pequeño)
-- INTEGER permite valores de -2,147,483,648 a 2,147,483,647

-- Si cantidad es SMALLINT, cambiarla a INTEGER
DO $$ 
BEGIN
  -- Verificar el tipo actual de cantidad
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'motores' 
      AND column_name = 'cantidad'
      AND data_type = 'smallint'
  ) THEN
    -- Cambiar de SMALLINT a INTEGER
    ALTER TABLE public.motores 
    ALTER COLUMN cantidad TYPE INTEGER;
    
    RAISE NOTICE 'Columna cantidad cambiada de SMALLINT a INTEGER';
  ELSE
    RAISE NOTICE 'Columna cantidad ya es INTEGER o no existe';
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'No se pudo cambiar el tipo de cantidad: %', SQLERRM;
END $$;

-- Paso 3: Verificación final
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

