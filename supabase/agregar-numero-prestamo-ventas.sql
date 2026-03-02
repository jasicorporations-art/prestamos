-- Agregar numero_prestamo a ventas y asegurar unicidad global
-- Ejecutar en Supabase SQL Editor y luego API → Reload schema

BEGIN;

ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS numero_prestamo TEXT;

-- Rellenar valores faltantes con un código único basado en id
UPDATE ventas
SET numero_prestamo = CONCAT('LEGACY-', id)
WHERE numero_prestamo IS NULL;

-- Resolver duplicados globales (si existieran)
WITH duplicados AS (
  SELECT id, numero_prestamo,
         ROW_NUMBER() OVER (PARTITION BY numero_prestamo ORDER BY created_at, id) AS rn
  FROM ventas
  WHERE numero_prestamo IS NOT NULL
)
UPDATE ventas v
SET numero_prestamo = CONCAT('LEGACY-', v.id)
WHERE v.id IN (SELECT id FROM duplicados WHERE rn > 1);

-- Índice único global
CREATE UNIQUE INDEX IF NOT EXISTS idx_ventas_numero_prestamo_unique
  ON ventas (numero_prestamo)
  WHERE numero_prestamo IS NOT NULL;

COMMIT;
