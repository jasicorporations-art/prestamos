-- Script para limpiar números de préstamo duplicados
-- Ejecutar este script en Supabase SQL Editor si hay números duplicados

-- Paso 1: Identificar duplicados
SELECT 
  numero_chasis,
  COUNT(*) as cantidad
FROM motores
WHERE numero_chasis IS NOT NULL
GROUP BY numero_chasis
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;

-- Paso 2: Actualizar duplicados con números únicos
-- Esto actualizará los registros duplicados (excepto el primero) con nuevos números únicos
WITH duplicados AS (
  SELECT 
    id,
    numero_chasis,
    ROW_NUMBER() OVER (PARTITION BY numero_chasis ORDER BY created_at) as rn
  FROM motores
  WHERE numero_chasis IN (
    SELECT numero_chasis
    FROM motores
    WHERE numero_chasis IS NOT NULL
    GROUP BY numero_chasis
    HAVING COUNT(*) > 1
  )
),
nuevos_numeros AS (
  SELECT 
    d.id,
    d.numero_chasis,
    d.rn,
    COALESCE(
      (SELECT MAX(CAST(SUBSTRING(numero_chasis FROM 'PREST-(\d+)') AS INTEGER)) FROM motores WHERE numero_chasis ~ '^PREST-\d+$'),
      0
    ) + d.rn as nuevo_numero
  FROM duplicados d
  WHERE d.rn > 1
)
UPDATE motores m
SET 
  numero_chasis = 'PREST-' || LPAD(nn.nuevo_numero::text, 3, '0'),
  matricula = 'MAT-PREST-' || LPAD(nn.nuevo_numero::text, 3, '0'),
  updated_at = NOW()
FROM nuevos_numeros nn
WHERE m.id = nn.id;

-- Paso 3: Verificar que no hay duplicados
SELECT 
  numero_chasis,
  COUNT(*) as cantidad
FROM motores
WHERE numero_chasis IS NOT NULL
GROUP BY numero_chasis
HAVING COUNT(*) > 1;

-- Si el resultado está vacío, no hay duplicados



