-- Unicidad de cédula y número de préstamo por empresa (no global)
-- Ejecutar en Supabase SQL Editor y luego API → Reload schema

BEGIN;

-- 1) Asegurar columnas de empresa
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(255);

ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);

-- 2) Eliminar restricciones/índices únicos globales si existen
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_cedula_key;
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_numero_prestamo_cliente_key;
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS idx_clientes_cedula_unique;
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS idx_clientes_numero_prestamo_unique;
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS idx_clientes_compania_cedula_unique;
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS idx_clientes_compania_numero_prestamo_unique;

DROP INDEX IF EXISTS clientes_cedula_key;
DROP INDEX IF EXISTS clientes_numero_prestamo_cliente_key;
DROP INDEX IF EXISTS idx_clientes_cedula_unique;
DROP INDEX IF EXISTS idx_clientes_numero_prestamo_unique;
DROP INDEX IF EXISTS idx_clientes_compania_cedula_unique;
DROP INDEX IF EXISTS idx_clientes_compania_numero_prestamo_unique;

-- 2.1) Eliminar cualquier constraint único residual sobre cédula o número de préstamo
DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE t.relname = 'clientes'
      AND c.contype = 'u'
      AND a.attname IN ('cedula', 'numero_prestamo_cliente')
  LOOP
    EXECUTE format('ALTER TABLE clientes DROP CONSTRAINT IF EXISTS %I', con.conname);
  END LOOP;
END $$;

-- 2.2) Resolver duplicados globales de numero_prestamo_cliente (evita fallos)
WITH duplicados_global AS (
  SELECT id, numero_prestamo_cliente,
         ROW_NUMBER() OVER (PARTITION BY numero_prestamo_cliente ORDER BY created_at, id) AS rn
  FROM clientes
  WHERE numero_prestamo_cliente IS NOT NULL
)
UPDATE clientes c
SET numero_prestamo_cliente = CONCAT('CLI-', EXTRACT(EPOCH FROM NOW())::bigint, '-', c.id)
WHERE c.id IN (SELECT id FROM duplicados_global WHERE rn > 1);

-- 3) Resolver duplicados de numero_prestamo_cliente por empresa/compañía
WITH duplicados_empresa AS (
  SELECT id, numero_prestamo_cliente,
         ROW_NUMBER() OVER (PARTITION BY empresa_id, numero_prestamo_cliente ORDER BY created_at, id) AS rn
  FROM clientes
  WHERE empresa_id IS NOT NULL AND numero_prestamo_cliente IS NOT NULL
),
duplicados_compania AS (
  SELECT id, numero_prestamo_cliente,
         ROW_NUMBER() OVER (PARTITION BY compania_id, numero_prestamo_cliente ORDER BY created_at, id) AS rn
  FROM clientes
  WHERE compania_id IS NOT NULL AND numero_prestamo_cliente IS NOT NULL
)
UPDATE clientes c
SET numero_prestamo_cliente = CONCAT('CLI-', EXTRACT(EPOCH FROM NOW())::bigint, '-', c.id)
WHERE c.id IN (
  SELECT id FROM duplicados_empresa WHERE rn > 1
  UNION
  SELECT id FROM duplicados_compania WHERE rn > 1
);

-- 3) Crear índices únicos por empresa (compatibles con empresa_id y compania_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_empresa_cedula_unique
  ON clientes (empresa_id, cedula)
  WHERE empresa_id IS NOT NULL AND cedula IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_empresa_numero_prestamo_unique
  ON clientes (empresa_id, numero_prestamo_cliente)
  WHERE empresa_id IS NOT NULL AND numero_prestamo_cliente IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_compania_cedula_unique
  ON clientes (compania_id, cedula)
  WHERE compania_id IS NOT NULL AND cedula IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_compania_numero_prestamo_unique
  ON clientes (compania_id, numero_prestamo_cliente)
  WHERE compania_id IS NOT NULL AND numero_prestamo_cliente IS NOT NULL;

COMMIT;
