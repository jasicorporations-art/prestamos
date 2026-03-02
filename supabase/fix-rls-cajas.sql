-- RLS y aislamiento de cajas por empresa
-- Ejecutar en Supabase SQL Editor y luego API → Reload schema

BEGIN;

-- 1) Asegurar columnas de empresa/app
ALTER TABLE cajas
ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(255);

ALTER TABLE cajas
ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);

ALTER TABLE cajas
ADD COLUMN IF NOT EXISTS app_id TEXT;

-- 2) Backfill usando sucursales (si existe empresa_id)
UPDATE cajas c
SET empresa_id = s.empresa_id
FROM sucursales s
WHERE c.sucursal_id = s.id AND c.empresa_id IS NULL;

-- 3) Backfill con compania_id si existe en sucursales
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sucursales'
      AND column_name = 'compania_id'
  ) THEN
    EXECUTE '
      UPDATE cajas c
      SET compania_id = s.compania_id
      FROM sucursales s
      WHERE c.sucursal_id = s.id AND c.compania_id IS NULL
    ';
  END IF;
END $$;

-- 4) Backfill app_id usando sucursales si existe
UPDATE cajas c
SET app_id = s.app_id
FROM sucursales s
WHERE c.sucursal_id = s.id AND c.app_id IS NULL;

-- 5) Función para obtener empresa del usuario actual
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

-- 6) RLS para cajas
ALTER TABLE cajas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cajas_select_empresa" ON cajas;
DROP POLICY IF EXISTS "cajas_insert_empresa" ON cajas;
DROP POLICY IF EXISTS "cajas_update_empresa" ON cajas;
DROP POLICY IF EXISTS "cajas_delete_empresa" ON cajas;

CREATE POLICY "cajas_select_empresa"
  ON cajas
  FOR SELECT
  TO authenticated
  USING (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

CREATE POLICY "cajas_insert_empresa"
  ON cajas
  FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

CREATE POLICY "cajas_update_empresa"
  ON cajas
  FOR UPDATE
  TO authenticated
  USING (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

CREATE POLICY "cajas_delete_empresa"
  ON cajas
  FOR DELETE
  TO authenticated
  USING (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

COMMIT;
