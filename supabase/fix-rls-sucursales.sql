-- Corregir RLS en sucursales para permitir crear/editar desde Admin
-- Ejecutar en Supabase SQL Editor y luego API → Reload schema

BEGIN;

-- Asegurar RLS activado
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;

-- Función: obtener empresa_id del usuario actual
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

-- Función: verificar si el usuario es Admin
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol VARCHAR(50);
BEGIN
  SELECT rol INTO v_rol
  FROM perfiles
  WHERE user_id = auth.uid() AND activo = true
  LIMIT 1;
  RETURN COALESCE(v_rol = 'Admin', false);
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_empresa_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_admin() TO authenticated;

-- Eliminar políticas anteriores
DROP POLICY IF EXISTS "sucursales_select_empresa" ON sucursales;
DROP POLICY IF EXISTS "sucursales_insert_admin" ON sucursales;
DROP POLICY IF EXISTS "sucursales_update_admin" ON sucursales;
DROP POLICY IF EXISTS "sucursales_delete_admin" ON sucursales;

-- SELECT: usuarios pueden ver sucursales de su empresa
CREATE POLICY "sucursales_select_empresa"
  ON sucursales
  FOR SELECT
  TO authenticated
  USING (empresa_id = get_user_empresa_id());

-- INSERT/UPDATE/DELETE: solo Admin de su empresa
CREATE POLICY "sucursales_insert_admin"
  ON sucursales
  FOR INSERT
  TO authenticated
  WITH CHECK (is_user_admin() AND empresa_id = get_user_empresa_id());

CREATE POLICY "sucursales_update_admin"
  ON sucursales
  FOR UPDATE
  TO authenticated
  USING (is_user_admin() AND empresa_id = get_user_empresa_id())
  WITH CHECK (is_user_admin() AND empresa_id = get_user_empresa_id());

CREATE POLICY "sucursales_delete_admin"
  ON sucursales
  FOR DELETE
  TO authenticated
  USING (is_user_admin() AND empresa_id = get_user_empresa_id());

COMMIT;
