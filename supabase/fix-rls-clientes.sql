-- Corregir RLS en clientes para permitir crear desde la app
-- Ejecutar en Supabase SQL Editor y luego API → Reload schema

BEGIN;

-- Asegurar RLS activado
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Función: obtener empresa del usuario actual
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

-- Eliminar políticas anteriores si existen
DROP POLICY IF EXISTS "clientes_select_empresa" ON clientes;
DROP POLICY IF EXISTS "clientes_insert_empresa" ON clientes;
DROP POLICY IF EXISTS "clientes_update_empresa" ON clientes;
DROP POLICY IF EXISTS "clientes_delete_empresa" ON clientes;

-- SELECT: ver clientes de su empresa
CREATE POLICY "clientes_select_empresa"
  ON clientes
  FOR SELECT
  TO authenticated
  USING (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

-- INSERT: crear clientes en su empresa
CREATE POLICY "clientes_insert_empresa"
  ON clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

-- UPDATE: editar clientes de su empresa
CREATE POLICY "clientes_update_empresa"
  ON clientes
  FOR UPDATE
  TO authenticated
  USING (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

-- DELETE: eliminar clientes de su empresa
CREATE POLICY "clientes_delete_empresa"
  ON clientes
  FOR DELETE
  TO authenticated
  USING (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

COMMIT;
