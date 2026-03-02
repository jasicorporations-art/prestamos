-- RLS y aislamiento de movimientos_caja por empresa (Electro)
-- Ejecutar en Supabase SQL Editor y luego API → Reload schema

BEGIN;

ALTER TABLE movimientos_caja
ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(255);

ALTER TABLE movimientos_caja
ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);

ALTER TABLE movimientos_caja
ADD COLUMN IF NOT EXISTS app_id TEXT;

-- Backfill usando cajas
UPDATE movimientos_caja m
SET empresa_id = c.empresa_id
FROM cajas c
WHERE m.caja_id = c.id AND m.empresa_id IS NULL;

UPDATE movimientos_caja m
SET compania_id = c.compania_id
FROM cajas c
WHERE m.caja_id = c.id AND m.compania_id IS NULL;

UPDATE movimientos_caja m
SET app_id = c.app_id
FROM cajas c
WHERE m.caja_id = c.id AND m.app_id IS NULL;

-- Forzar app_id electro si aún falta
UPDATE movimientos_caja
SET app_id = 'electro'
WHERE app_id IS NULL;

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

ALTER TABLE movimientos_caja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movimientos_select_empresa" ON movimientos_caja;
DROP POLICY IF EXISTS "movimientos_insert_empresa" ON movimientos_caja;
DROP POLICY IF EXISTS "movimientos_update_empresa" ON movimientos_caja;
DROP POLICY IF EXISTS "movimientos_delete_empresa" ON movimientos_caja;

CREATE POLICY "movimientos_select_empresa"
  ON movimientos_caja
  FOR SELECT
  TO authenticated
  USING (
    (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND app_id = 'electro'
  );

CREATE POLICY "movimientos_insert_empresa"
  ON movimientos_caja
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND app_id = 'electro'
  );

CREATE POLICY "movimientos_update_empresa"
  ON movimientos_caja
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

CREATE POLICY "movimientos_delete_empresa"
  ON movimientos_caja
  FOR DELETE
  TO authenticated
  USING (
    (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND app_id = 'electro'
  );

COMMIT;
