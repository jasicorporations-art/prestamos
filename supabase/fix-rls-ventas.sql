-- RLS y unicidad de ventas por empresa
-- Ejecutar en Supabase SQL Editor y luego API → Reload schema

BEGIN;

-- 1) Asegurar columnas de empresa/app
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(255);

ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);

ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS app_id TEXT;

-- 2) Backfill de empresa/compania/app usando clientes
UPDATE ventas v
SET empresa_id = c.empresa_id
FROM clientes c
WHERE v.cliente_id = c.id AND v.empresa_id IS NULL;

UPDATE ventas v
SET compania_id = c.compania_id
FROM clientes c
WHERE v.cliente_id = c.id AND v.compania_id IS NULL;

UPDATE ventas v
SET app_id = c.app_id
FROM clientes c
WHERE v.cliente_id = c.id AND v.app_id IS NULL;

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

-- 4) RLS para ventas
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ventas_select_empresa" ON ventas;
DROP POLICY IF EXISTS "ventas_insert_empresa" ON ventas;
DROP POLICY IF EXISTS "ventas_update_empresa" ON ventas;
DROP POLICY IF EXISTS "ventas_delete_empresa" ON ventas;

CREATE POLICY "ventas_select_empresa"
  ON ventas
  FOR SELECT
  TO authenticated
  USING (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

CREATE POLICY "ventas_insert_empresa"
  ON ventas
  FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

CREATE POLICY "ventas_update_empresa"
  ON ventas
  FOR UPDATE
  TO authenticated
  USING (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

CREATE POLICY "ventas_delete_empresa"
  ON ventas
  FOR DELETE
  TO authenticated
  USING (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

-- 5) Unicidad por empresa si existe columna de numero en ventas
DO $$
DECLARE
  col TEXT;
  con RECORD;
BEGIN
  FOR col IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'ventas'
      AND column_name IN ('numero_venta', 'numero_factura', 'numero_prestamo')
  LOOP
    -- Eliminar constraints únicos globales sobre esa columna
    FOR con IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE t.relname = 'ventas'
        AND c.contype = 'u'
        AND a.attname = col
    LOOP
      EXECUTE format('ALTER TABLE ventas DROP CONSTRAINT IF EXISTS %I', con.conname);
    END LOOP;

    -- Crear índices únicos por empresa/compañía
    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_ventas_empresa_%1$I_unique ON ventas (empresa_id, %1$I) WHERE empresa_id IS NOT NULL AND %1$I IS NOT NULL',
      col
    );
    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_ventas_compania_%1$I_unique ON ventas (compania_id, %1$I) WHERE compania_id IS NOT NULL AND %1$I IS NOT NULL',
      col
    );
  END LOOP;
END $$;

COMMIT;
