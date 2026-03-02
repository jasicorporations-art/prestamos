-- ================================================================
-- FIX: Restaurar login y acceso tras ejecutar access_policy_*
-- ================================================================
-- El script access_policy_* puede bloquear el login porque:
-- 1. perfiles: Admin/super_admin con empresa_id=NULL no pueden leer su perfil
-- 2. Las subconsultas (SELECT ... FROM perfiles) fallan por RLS
--
-- Este script:
-- 1. Permite que CUALQUIER usuario lea su propio perfil (crítico para login)
-- 2. Elimina las políticas access_policy_* problemáticas
-- 3. Restaura políticas que funcionan (empresa + admin)
-- ================================================================

BEGIN;

-- ============================================================
-- 1. PERFILES: Permitir leer propio perfil (obligatorio para login)
-- ============================================================
DROP POLICY IF EXISTS "perfiles_select_own" ON perfiles;
CREATE POLICY "perfiles_select_own"
  ON perfiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 2. Eliminar políticas access_policy_* que causan problemas
-- ============================================================
DROP POLICY IF EXISTS "access_policy_clientes" ON clientes;
DROP POLICY IF EXISTS "access_policy_ventas" ON ventas;
DROP POLICY IF EXISTS "access_policy_pagos" ON pagos;

-- ============================================================
-- 3. Asegurar políticas para vendedores (por empresa_id)
-- ============================================================
DROP POLICY IF EXISTS "clientes_select_empresa" ON clientes;
DROP POLICY IF EXISTS "clientes_insert_empresa" ON clientes;
DROP POLICY IF EXISTS "clientes_update_empresa" ON clientes;
DROP POLICY IF EXISTS "clientes_delete_empresa" ON clientes;

CREATE POLICY "clientes_select_empresa"
  ON clientes FOR SELECT TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "clientes_insert_empresa"
  ON clientes FOR INSERT TO authenticated
  WITH CHECK (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "clientes_update_empresa"
  ON clientes FOR UPDATE TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  )
  WITH CHECK (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

CREATE POLICY "clientes_delete_empresa"
  ON clientes FOR DELETE TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

-- Ventas
DROP POLICY IF EXISTS "ventas_select_empresa" ON ventas;
DROP POLICY IF EXISTS "ventas_insert_empresa" ON ventas;
DROP POLICY IF EXISTS "ventas_update_empresa" ON ventas;
DROP POLICY IF EXISTS "ventas_delete_empresa" ON ventas;

CREATE POLICY "ventas_select_empresa"
  ON ventas FOR SELECT TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "ventas_insert_empresa"
  ON ventas FOR INSERT TO authenticated
  WITH CHECK (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "ventas_update_empresa"
  ON ventas FOR UPDATE TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  )
  WITH CHECK (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

CREATE POLICY "ventas_delete_empresa"
  ON ventas FOR DELETE TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

-- Pagos
DROP POLICY IF EXISTS "pagos_select_empresa" ON pagos;
DROP POLICY IF EXISTS "pagos_insert_empresa" ON pagos;
DROP POLICY IF EXISTS "pagos_update_empresa" ON pagos;
DROP POLICY IF EXISTS "pagos_delete_empresa" ON pagos;

CREATE POLICY "pagos_select_empresa"
  ON pagos FOR SELECT TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "pagos_insert_empresa"
  ON pagos FOR INSERT TO authenticated
  WITH CHECK (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "pagos_update_empresa"
  ON pagos FOR UPDATE TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  )
  WITH CHECK (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

CREATE POLICY "pagos_delete_empresa"
  ON pagos FOR DELETE TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

-- ============================================================
-- 4. Políticas para Admin y super_admin (ven todo)
-- ============================================================
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

-- Motores
DROP POLICY IF EXISTS "motores_select_empresa" ON motores;
DROP POLICY IF EXISTS "motores_insert_empresa" ON motores;
DROP POLICY IF EXISTS "motores_update_empresa" ON motores;
DROP POLICY IF EXISTS "motores_delete_empresa" ON motores;
DROP POLICY IF EXISTS "motores_select_admin" ON motores;
DROP POLICY IF EXISTS "motores_insert_admin" ON motores;
DROP POLICY IF EXISTS "motores_update_admin" ON motores;
DROP POLICY IF EXISTS "motores_delete_admin" ON motores;

CREATE POLICY "motores_select_empresa"
  ON motores FOR SELECT TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "motores_insert_empresa"
  ON motores FOR INSERT TO authenticated
  WITH CHECK (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "motores_update_empresa"
  ON motores FOR UPDATE TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  )
  WITH CHECK (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());

CREATE POLICY "motores_delete_empresa"
  ON motores FOR DELETE TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

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
