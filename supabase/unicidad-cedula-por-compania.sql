-- ============================================================
-- UNICIDAD DE CÉDULA Y NÚMERO PRÉSTAMO POR COMPAÑÍA
-- ============================================================
-- Permite que la misma cédula exista en diferentes compañías sin conflicto.
-- Ej: Compañía A tiene "Juan Pérez" 001-1234567-8
--     Compañía B tiene "Juan Pérez" 001-1234567-8  (mismo cliente, distinto registro)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

BEGIN;

-- 1) Asegurar columnas empresa_id y compania_id
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS app_id TEXT;

-- 2) Eliminar constraints únicos GLOBALES (que impiden misma cédula en distintas compañías)
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_cedula_key;
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_numero_prestamo_cliente_key;

DROP INDEX IF EXISTS clientes_cedula_key;
DROP INDEX IF EXISTS clientes_numero_prestamo_cliente_key;
DROP INDEX IF EXISTS idx_clientes_cedula_unique;
DROP INDEX IF EXISTS idx_clientes_numero_prestamo_unique;

-- 2.1) Eliminar cualquier constraint único residual
DO $$
DECLARE con RECORD;
BEGIN
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE t.relname = 'clientes' AND c.contype = 'u'
      AND a.attname IN ('cedula', 'numero_prestamo_cliente')
  LOOP
    EXECUTE format('ALTER TABLE clientes DROP CONSTRAINT IF EXISTS %I', con.conname);
  END LOOP;
END $$;

-- 2.2) Eliminar índices únicos residuales
DROP INDEX IF EXISTS idx_clientes_empresa_cedula_unique;
DROP INDEX IF EXISTS idx_clientes_empresa_numero_prestamo_unique;
DROP INDEX IF EXISTS idx_clientes_compania_cedula_unique;
DROP INDEX IF EXISTS idx_clientes_compania_numero_prestamo_unique;
DROP INDEX IF EXISTS idx_clientes_app_empresa_cedula_unique;
DROP INDEX IF EXISTS idx_clientes_app_empresa_numero_prestamo_unique;
DROP INDEX IF EXISTS idx_clientes_app_compania_cedula_unique;
DROP INDEX IF EXISTS idx_clientes_app_compania_numero_prestamo_unique;

-- 3) Asignar empresa_id/compania_id a clientes huérfanos (solo donde ambos son NULL)
-- Usa la primera empresa para no dejar filas fuera del unique. Si no hay empresas, usa 'DEFAULT'.
DO $$
BEGIN
  UPDATE clientes c
  SET empresa_id = COALESCE((SELECT id::text FROM empresas LIMIT 1), 'DEFAULT'),
      compania_id = COALESCE((SELECT id::text FROM empresas LIMIT 1), 'DEFAULT')
  WHERE c.empresa_id IS NULL AND c.compania_id IS NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'No se pudieron asignar empresa_id a huérfanos: %', SQLERRM;
END $$;

-- 4) Resolver duplicados de numero_prestamo_cliente por compañía (mantener el primero)
WITH duplicados AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY COALESCE(empresa_id, compania_id), numero_prestamo_cliente
    ORDER BY created_at, id
  ) AS rn
  FROM clientes
  WHERE numero_prestamo_cliente IS NOT NULL
)
UPDATE clientes c
SET numero_prestamo_cliente = 'CLI-' || EXTRACT(EPOCH FROM NOW())::bigint || '-' || SUBSTRING(c.id::text, 1, 8)
WHERE c.id IN (SELECT id FROM duplicados WHERE rn > 1);

-- 5) Crear índices únicos POR COMPAÑÍA (empresa_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_empresa_cedula_unique
  ON clientes (empresa_id, cedula)
  WHERE empresa_id IS NOT NULL AND cedula IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_empresa_numero_prestamo_unique
  ON clientes (empresa_id, numero_prestamo_cliente)
  WHERE empresa_id IS NOT NULL AND numero_prestamo_cliente IS NOT NULL;

-- 6) Crear índices únicos POR COMPAÑÍA (compania_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_compania_cedula_unique
  ON clientes (compania_id, cedula)
  WHERE compania_id IS NOT NULL AND cedula IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_compania_numero_prestamo_unique
  ON clientes (compania_id, numero_prestamo_cliente)
  WHERE compania_id IS NOT NULL AND numero_prestamo_cliente IS NOT NULL;

-- 7) Índice para búsquedas (no único)
CREATE INDEX IF NOT EXISTS idx_clientes_cedula ON clientes(cedula);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_compania ON clientes(compania_id);

COMMIT;

-- Verificación (ejecutar aparte):
-- SELECT empresa_id, compania_id, cedula, nombre_completo, COUNT(*) 
-- FROM clientes 
-- GROUP BY empresa_id, compania_id, cedula, nombre_completo 
-- HAVING COUNT(*) > 1;
-- (debe retornar 0 filas si todo está bien)
