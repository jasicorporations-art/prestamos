-- RLS y aislamiento de actividad_logs por empresa
-- Ejecutar en Supabase SQL Editor y luego API → Reload schema

BEGIN;

-- 1) Asegurar columnas de empresa/app
ALTER TABLE actividad_logs
ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(255);

ALTER TABLE actividad_logs
ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);

ALTER TABLE actividad_logs
ADD COLUMN IF NOT EXISTS app_id TEXT;

-- 2) Backfill de empresa/app usando sucursales
UPDATE actividad_logs a
SET empresa_id = s.empresa_id
FROM sucursales s
WHERE a.sucursal_id = s.id AND a.empresa_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sucursales'
      AND column_name = 'compania_id'
  ) THEN
    EXECUTE '
      UPDATE actividad_logs a
      SET compania_id = s.compania_id
      FROM sucursales s
      WHERE a.sucursal_id = s.id AND a.compania_id IS NULL
    ';
  END IF;
END $$;

UPDATE actividad_logs a
SET app_id = s.app_id
FROM sucursales s
WHERE a.sucursal_id = s.id AND a.app_id IS NULL;

-- Forzar app_id electro si aún falta
UPDATE actividad_logs
SET app_id = 'electro'
WHERE app_id IS NULL;

-- 3) Función para obtener empresa del usuario actual
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

-- 4) RLS para actividad_logs
ALTER TABLE actividad_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "actividad_logs_select_empresa" ON actividad_logs;
DROP POLICY IF EXISTS "actividad_logs_insert_empresa" ON actividad_logs;
DROP POLICY IF EXISTS "actividad_logs_update_empresa" ON actividad_logs;
DROP POLICY IF EXISTS "actividad_logs_delete_empresa" ON actividad_logs;

CREATE POLICY "actividad_logs_select_empresa"
  ON actividad_logs
  FOR SELECT
  TO authenticated
  USING (
    (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND app_id = 'electro'
  );

CREATE POLICY "actividad_logs_insert_empresa"
  ON actividad_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND app_id = 'electro'
  );

CREATE POLICY "actividad_logs_update_empresa"
  ON actividad_logs
  FOR UPDATE
  TO authenticated
  USING (
    (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND app_id = 'electro'
  )
  WITH CHECK (
    (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND app_id = 'electro'
  );

CREATE POLICY "actividad_logs_delete_empresa"
  ON actividad_logs
  FOR DELETE
  TO authenticated
  USING (
    (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND app_id = 'electro'
  );

COMMIT;
