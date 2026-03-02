-- Agregar app_id a perfiles y empresas para compatibilidad multi-tenant
-- Ejecutar en Supabase SQL Editor y luego hacer "API → Reload schema"

BEGIN;

-- 1) Columnas app_id
ALTER TABLE empresas
ADD COLUMN IF NOT EXISTS app_id TEXT;

ALTER TABLE perfiles
ADD COLUMN IF NOT EXISTS app_id TEXT;

-- 2) Backfill con el app_id actual (ajusta si usas otro)
UPDATE empresas
SET app_id = 'electro'
WHERE app_id IS NULL;

UPDATE perfiles
SET app_id = 'electro'
WHERE app_id IS NULL;

-- 3) Índices para consultas por app_id
CREATE INDEX IF NOT EXISTS idx_empresas_app_id ON empresas(app_id);
CREATE INDEX IF NOT EXISTS idx_perfiles_app_id ON perfiles(app_id);

COMMIT;
