-- RLS y unicidad de perfiles por empresa (no global)
-- Ejecutar en Supabase SQL Editor y luego API → Reload schema

BEGIN;

-- 1) Asegurar columnas de empresa/app
ALTER TABLE perfiles
ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(255);

ALTER TABLE perfiles
ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);

ALTER TABLE perfiles
ADD COLUMN IF NOT EXISTS app_id TEXT;

-- 2) Eliminar restricciones/índices únicos globales si existen
ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_user_id_key;
ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_email_key;
ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS idx_perfiles_email_unique;
ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS idx_perfiles_compania_email_unique;

DROP INDEX IF EXISTS perfiles_user_id_key;
DROP INDEX IF EXISTS perfiles_email_key;
DROP INDEX IF EXISTS idx_perfiles_email_unique;
DROP INDEX IF EXISTS idx_perfiles_compania_email_unique;

-- 3) Crear índices únicos por empresa (solo user_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_perfiles_empresa_user_unique
  ON perfiles (empresa_id, user_id)
  WHERE empresa_id IS NOT NULL AND user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_perfiles_compania_user_unique
  ON perfiles (compania_id, user_id)
  WHERE compania_id IS NOT NULL AND user_id IS NOT NULL;

-- 4) Función para obtener empresa del usuario actual
CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS VARCHAR(255)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id VARCHAR(255);
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM perfiles
  WHERE user_id = auth.uid() AND activo = true
  LIMIT 1;
  RETURN v_empresa_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_empresa_id() TO authenticated;

-- 5) RLS para perfiles
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfiles_select_empresa" ON perfiles;
DROP POLICY IF EXISTS "perfiles_insert_empresa" ON perfiles;
DROP POLICY IF EXISTS "perfiles_update_empresa" ON perfiles;
DROP POLICY IF EXISTS "perfiles_delete_empresa" ON perfiles;

CREATE POLICY "perfiles_select_empresa"
  ON perfiles
  FOR SELECT
  TO authenticated
  USING (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

CREATE POLICY "perfiles_insert_empresa"
  ON perfiles
  FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

CREATE POLICY "perfiles_update_empresa"
  ON perfiles
  FOR UPDATE
  TO authenticated
  USING (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

CREATE POLICY "perfiles_delete_empresa"
  ON perfiles
  FOR DELETE
  TO authenticated
  USING (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

COMMIT;
