-- ================================================================
-- FIX: Admin y super_admin deben ver clientes, préstamos y pagos
-- ================================================================
-- Ejecutar en Supabase SQL Editor
-- ================================================================

BEGIN;

-- Función que bypassa RLS para verificar rol (Admin con empresa_id NULL no puede leer perfiles por RLS)
CREATE OR REPLACE FUNCTION is_admin_or_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM perfiles p
    WHERE p.user_id = auth.uid()
      AND (p.activo = true OR p.activo IS NULL)
      AND p.rol IN ('Admin', 'super_admin')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_admin_or_super_admin() TO authenticated;

-- CLIENTES: Admin y super_admin ven todo
DROP POLICY IF EXISTS "clientes_select_super_admin" ON clientes;
DROP POLICY IF EXISTS "clientes_insert_super_admin" ON clientes;
DROP POLICY IF EXISTS "clientes_update_super_admin" ON clientes;
DROP POLICY IF EXISTS "clientes_delete_super_admin" ON clientes;
DROP POLICY IF EXISTS "clientes_select_admin" ON clientes;
DROP POLICY IF EXISTS "clientes_insert_admin" ON clientes;
DROP POLICY IF EXISTS "clientes_update_admin" ON clientes;
DROP POLICY IF EXISTS "clientes_delete_admin" ON clientes;

CREATE POLICY "clientes_select_admin"
  ON clientes FOR SELECT TO authenticated
  USING (is_admin_or_super_admin());

CREATE POLICY "clientes_insert_admin"
  ON clientes FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_super_admin());

CREATE POLICY "clientes_update_admin"
  ON clientes FOR UPDATE TO authenticated
  USING (is_admin_or_super_admin());

CREATE POLICY "clientes_delete_admin"
  ON clientes FOR DELETE TO authenticated
  USING (is_admin_or_super_admin());

-- VENTAS: Admin y super_admin ven todo
DROP POLICY IF EXISTS "ventas_select_super_admin" ON ventas;
DROP POLICY IF EXISTS "ventas_insert_super_admin" ON ventas;
DROP POLICY IF EXISTS "ventas_update_super_admin" ON ventas;
DROP POLICY IF EXISTS "ventas_delete_super_admin" ON ventas;
DROP POLICY IF EXISTS "ventas_select_admin" ON ventas;
DROP POLICY IF EXISTS "ventas_insert_admin" ON ventas;
DROP POLICY IF EXISTS "ventas_update_admin" ON ventas;
DROP POLICY IF EXISTS "ventas_delete_admin" ON ventas;

CREATE POLICY "ventas_select_admin"
  ON ventas FOR SELECT TO authenticated
  USING (is_admin_or_super_admin());

CREATE POLICY "ventas_insert_admin"
  ON ventas FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_super_admin());

CREATE POLICY "ventas_update_admin"
  ON ventas FOR UPDATE TO authenticated
  USING (is_admin_or_super_admin());

CREATE POLICY "ventas_delete_admin"
  ON ventas FOR DELETE TO authenticated
  USING (is_admin_or_super_admin());

-- PAGOS: Admin y super_admin ven todo
DROP POLICY IF EXISTS "pagos_select_super_admin" ON pagos;
DROP POLICY IF EXISTS "pagos_insert_super_admin" ON pagos;
DROP POLICY IF EXISTS "pagos_update_super_admin" ON pagos;
DROP POLICY IF EXISTS "pagos_delete_super_admin" ON pagos;
DROP POLICY IF EXISTS "pagos_select_admin" ON pagos;
DROP POLICY IF EXISTS "pagos_insert_admin" ON pagos;
DROP POLICY IF EXISTS "pagos_update_admin" ON pagos;
DROP POLICY IF EXISTS "pagos_delete_admin" ON pagos;

CREATE POLICY "pagos_select_admin"
  ON pagos FOR SELECT TO authenticated
  USING (is_admin_or_super_admin());

CREATE POLICY "pagos_insert_admin"
  ON pagos FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_super_admin());

CREATE POLICY "pagos_update_admin"
  ON pagos FOR UPDATE TO authenticated
  USING (is_admin_or_super_admin());

CREATE POLICY "pagos_delete_admin"
  ON pagos FOR DELETE TO authenticated
  USING (is_admin_or_super_admin());

-- MOTORES: Admin y super_admin ven todo
DROP POLICY IF EXISTS "motores_select_super_admin" ON motores;
DROP POLICY IF EXISTS "motores_insert_super_admin" ON motores;
DROP POLICY IF EXISTS "motores_update_super_admin" ON motores;
DROP POLICY IF EXISTS "motores_delete_super_admin" ON motores;
DROP POLICY IF EXISTS "motores_select_admin" ON motores;
DROP POLICY IF EXISTS "motores_insert_admin" ON motores;
DROP POLICY IF EXISTS "motores_update_admin" ON motores;
DROP POLICY IF EXISTS "motores_delete_admin" ON motores;

CREATE POLICY "motores_select_admin"
  ON motores FOR SELECT TO authenticated
  USING (is_admin_or_super_admin());

CREATE POLICY "motores_insert_admin"
  ON motores FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_super_admin());

CREATE POLICY "motores_update_admin"
  ON motores FOR UPDATE TO authenticated
  USING (is_admin_or_super_admin());

CREATE POLICY "motores_delete_admin"
  ON motores FOR DELETE TO authenticated
  USING (is_admin_or_super_admin());

COMMIT;
