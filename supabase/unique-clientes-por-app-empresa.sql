-- Unicidad de numero_prestamo_cliente por app + empresa (evita choque entre PWAs)
-- Ejecutar en Supabase SQL Editor y luego API → Reload schema

BEGIN;

-- 1) Asegurar columnas
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS app_id TEXT;

ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(255);

ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);

-- 2) Eliminar cualquier constraint único global sobre numero_prestamo_cliente
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
      AND a.attname = 'numero_prestamo_cliente'
  LOOP
    EXECUTE format('ALTER TABLE clientes DROP CONSTRAINT IF EXISTS %I', con.conname);
  END LOOP;
END $$;

-- 3) Normalizar números con prefijo por app (solo si faltan)
UPDATE clientes
SET numero_prestamo_cliente = CONCAT('CLI-ELECTRO-', RIGHT(numero_prestamo_cliente, 4))
WHERE app_id = 'electro'
  AND numero_prestamo_cliente ~ '^CLI-[0-9]+$';

UPDATE clientes
SET numero_prestamo_cliente = CONCAT('CLI-DEALER-', RIGHT(numero_prestamo_cliente, 4))
WHERE app_id = 'dealer'
  AND numero_prestamo_cliente ~ '^CLI-[0-9]+$';

-- 4) Resolver duplicados globales restantes
WITH duplicados AS (
  SELECT id, numero_prestamo_cliente,
         ROW_NUMBER() OVER (PARTITION BY numero_prestamo_cliente ORDER BY created_at, id) AS rn
  FROM clientes
  WHERE numero_prestamo_cliente IS NOT NULL
)
UPDATE clientes c
SET numero_prestamo_cliente = CONCAT('CLI-', UPPER(COALESCE(c.app_id, 'APP')), '-', EXTRACT(EPOCH FROM NOW())::bigint, '-', c.id)
WHERE c.id IN (SELECT id FROM duplicados WHERE rn > 1);

-- 5) Crear índices únicos por app + empresa/compañía
DROP INDEX IF EXISTS idx_clientes_app_empresa_numero_prestamo_unique;
DROP INDEX IF EXISTS idx_clientes_app_compania_numero_prestamo_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_app_empresa_numero_prestamo_unique
  ON clientes (app_id, empresa_id, numero_prestamo_cliente)
  WHERE app_id IS NOT NULL AND empresa_id IS NOT NULL AND numero_prestamo_cliente IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_app_compania_numero_prestamo_unique
  ON clientes (app_id, compania_id, numero_prestamo_cliente)
  WHERE app_id IS NOT NULL AND compania_id IS NOT NULL AND numero_prestamo_cliente IS NOT NULL;

COMMIT;
