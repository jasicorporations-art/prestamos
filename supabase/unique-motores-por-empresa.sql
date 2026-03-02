-- Unicidad de número de producto por empresa (no global)
-- Ejecutar en Supabase SQL Editor y luego API → Reload schema

BEGIN;

-- 1) Asegurar columnas de empresa
ALTER TABLE motores
ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(255);

ALTER TABLE motores
ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);

-- 2) Eliminar restricciones/índices únicos globales si existen
ALTER TABLE motores DROP CONSTRAINT IF EXISTS motores_numero_chasis_key;
ALTER TABLE motores DROP CONSTRAINT IF EXISTS motores_matricula_key;
ALTER TABLE motores DROP CONSTRAINT IF EXISTS motores_numero_chasis_real_key;
ALTER TABLE motores DROP CONSTRAINT IF EXISTS idx_motores_numero_chasis_unique;
ALTER TABLE motores DROP CONSTRAINT IF EXISTS idx_motores_matricula_unique;
ALTER TABLE motores DROP CONSTRAINT IF EXISTS idx_motores_numero_chasis_real_unique;
ALTER TABLE motores DROP CONSTRAINT IF EXISTS idx_motores_compania_numero_chasis_unique;
ALTER TABLE motores DROP CONSTRAINT IF EXISTS idx_motores_compania_matricula_unique;
ALTER TABLE motores DROP CONSTRAINT IF EXISTS idx_motores_compania_numero_chasis_real_unique;

DROP INDEX IF EXISTS motores_numero_chasis_key;
DROP INDEX IF EXISTS motores_matricula_key;
DROP INDEX IF EXISTS motores_numero_chasis_real_key;
DROP INDEX IF EXISTS idx_motores_numero_chasis_unique;
DROP INDEX IF EXISTS idx_motores_matricula_unique;
DROP INDEX IF EXISTS idx_motores_numero_chasis_real_unique;
DROP INDEX IF EXISTS idx_motores_compania_numero_chasis_unique;
DROP INDEX IF EXISTS idx_motores_compania_matricula_unique;
DROP INDEX IF EXISTS idx_motores_compania_numero_chasis_real_unique;

-- 3) Crear índices únicos por empresa (numero_chasis y matricula)
CREATE UNIQUE INDEX IF NOT EXISTS idx_motores_empresa_numero_chasis_unique
  ON motores (empresa_id, numero_chasis)
  WHERE empresa_id IS NOT NULL AND numero_chasis IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_motores_empresa_matricula_unique
  ON motores (empresa_id, matricula)
  WHERE empresa_id IS NOT NULL AND matricula IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_motores_empresa_numero_chasis_real_unique
  ON motores (empresa_id, numero_chasis_real)
  WHERE empresa_id IS NOT NULL AND numero_chasis_real IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_motores_compania_numero_chasis_unique
  ON motores (compania_id, numero_chasis)
  WHERE compania_id IS NOT NULL AND numero_chasis IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_motores_compania_matricula_unique
  ON motores (compania_id, matricula)
  WHERE compania_id IS NOT NULL AND matricula IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_motores_compania_numero_chasis_real_unique
  ON motores (compania_id, numero_chasis_real)
  WHERE compania_id IS NOT NULL AND numero_chasis_real IS NOT NULL;

COMMIT;
