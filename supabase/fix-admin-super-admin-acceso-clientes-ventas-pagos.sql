-- ================================================================
-- FIX: Roles correctos - super_admin, Admin y Vendedor
-- ================================================================
--
-- super_admin: Acceso TOTAL a todo (todas las empresas, sucursales, clientes, etc.)
-- Admin: Acceso a TODA la información de su empresa (todas las sucursales, clientes, rutas, pagos, préstamos)
-- Vendedor: Acceso SOLO a su sucursal asignada
--
-- Ejecutar en Supabase SQL Editor
-- ================================================================

BEGIN;

-- ============================================================
-- 1. Funciones auxiliares (SECURITY DEFINER = no recursión)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.user_id = auth.uid() AND p.rol = 'super_admin'
    AND (p.activo = true OR p.activo IS NULL)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.user_id = auth.uid() AND p.rol = 'Admin'
    AND (p.activo = true OR p.activo IS NULL)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  RETURN public.is_super_admin() OR public.is_admin();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_sucursal_id()
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE v UUID;
BEGIN
  SELECT sucursal_id INTO v FROM public.perfiles
  WHERE user_id = auth.uid() AND (activo = true OR activo IS NULL) LIMIT 1;
  RETURN v;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_sucursal_id() TO authenticated;

-- ============================================================
-- 2. Eliminar políticas existentes (excepto perfiles_select_own, etc.)
-- ============================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('clientes', 'ventas', 'pagos', 'motores', 'sucursales', 'rutas')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
  -- Perfiles: eliminar solo las que añadimos (mantener select_own, insert_own, update_own)
  DROP POLICY IF EXISTS "perfiles_select_empresa" ON perfiles;
  DROP POLICY IF EXISTS "perfiles_select_super_admin" ON perfiles;
  DROP POLICY IF EXISTS "perfiles_select_admin" ON perfiles;
END $$;

-- ============================================================
-- 3. CLIENTES
-- super_admin: todo | Admin: toda su empresa | Vendedor: solo su sucursal
-- ============================================================
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_super_admin" ON clientes FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "clientes_admin" ON clientes FOR ALL TO authenticated
  USING (
    public.is_admin()
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  )
  WITH CHECK (
    public.is_admin()
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "clientes_vendedor" ON clientes FOR ALL TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND (sucursal_id = public.get_user_sucursal_id() OR sucursal_id IS NULL)
  )
  WITH CHECK (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND (sucursal_id = public.get_user_sucursal_id() OR sucursal_id IS NULL)
  );

-- ============================================================
-- 4. VENTAS (préstamos/financiamientos)
-- ============================================================
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ventas_super_admin" ON ventas FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "ventas_admin" ON ventas FOR ALL TO authenticated
  USING (
    public.is_admin()
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  )
  WITH CHECK (
    public.is_admin()
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "ventas_vendedor" ON ventas FOR ALL TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND (sucursal_id = public.get_user_sucursal_id() OR sucursal_id IS NULL)
  )
  WITH CHECK (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND (sucursal_id = public.get_user_sucursal_id() OR sucursal_id IS NULL)
  );

-- ============================================================
-- 5. PAGOS
-- ============================================================
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pagos_super_admin" ON pagos FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "pagos_admin" ON pagos FOR ALL TO authenticated
  USING (
    public.is_admin()
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  )
  WITH CHECK (
    public.is_admin()
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "pagos_vendedor" ON pagos FOR ALL TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND (
      sucursal_id = public.get_user_sucursal_id()
      OR sucursal_donde_se_cobro = public.get_user_sucursal_id()
      OR (sucursal_id IS NULL AND sucursal_donde_se_cobro IS NULL)
    )
  )
  WITH CHECK (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

-- ============================================================
-- 6. MOTORES
-- ============================================================
ALTER TABLE motores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "motores_super_admin" ON motores FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "motores_admin" ON motores FOR ALL TO authenticated
  USING (
    public.is_admin()
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  )
  WITH CHECK (
    public.is_admin()
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "motores_vendedor" ON motores FOR ALL TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  )
  WITH CHECK (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

-- ============================================================
-- 7. SUCURSALES
-- super_admin: todas | Admin: todas de su empresa | Vendedor: las de su empresa
-- ============================================================
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sucursales_select_perfil" ON sucursales;
DROP POLICY IF EXISTS "sucursales_select_empresa_owner" ON sucursales;
DROP POLICY IF EXISTS "sucursales_insert_admin" ON sucursales;
DROP POLICY IF EXISTS "sucursales_update_admin" ON sucursales;
DROP POLICY IF EXISTS "sucursales_delete_admin" ON sucursales;

CREATE POLICY "sucursales_super_admin" ON sucursales FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "sucursales_admin" ON sucursales FOR ALL TO authenticated
  USING (
    public.is_admin()
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  )
  WITH CHECK (
    public.is_admin()
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "sucursales_vendedor" ON sucursales FOR SELECT TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

-- Fallback: usuario que creó la empresa (registro sin perfil aún)
CREATE POLICY "sucursales_empresa_owner" ON sucursales FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT id::text FROM empresas WHERE user_id = auth.uid()));

-- ============================================================
-- 7b. PERFILES (para admin/usuarios - ver lista de usuarios)
-- super_admin: todos | Admin: perfiles de su empresa | propio: siempre
-- ============================================================
CREATE POLICY "perfiles_select_super_admin" ON perfiles FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "perfiles_select_admin" ON perfiles FOR SELECT TO authenticated
  USING (
    public.is_admin()
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

-- ============================================================
-- 8. RUTAS (si la tabla existe)
-- super_admin: todas | Admin: todas de su empresa | Vendedor: rutas de su empresa
-- ============================================================
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rutas') THEN
    ALTER TABLE rutas ENABLE ROW LEVEL SECURITY;
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rutas') LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON rutas', r.policyname);
    END LOOP;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rutas') THEN
    CREATE POLICY "rutas_super_admin" ON rutas FOR ALL TO authenticated
      USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
    CREATE POLICY "rutas_admin" ON rutas FOR ALL TO authenticated
      USING (public.is_admin() AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()))
      WITH CHECK (public.is_admin() AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()));
    CREATE POLICY "rutas_vendedor" ON rutas FOR SELECT TO authenticated
      USING (get_user_empresa_id() IS NOT NULL AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()));
  END IF;
END $$;

COMMIT;

-- ============================================================
-- IMPORTANTE: get_user_empresa_id() para super_admin
-- ============================================================
-- Si super_admin tiene empresa_id = NULL o 'SISTEMA', get_user_empresa_id()
-- devuelve NULL. Las políticas *_super_admin usan is_super_admin() y no
-- dependen de get_user_empresa_id(), así que super_admin verá todo.
--
-- Para Admin: asegúrate de que empresa_id en perfiles sea el UUID de su empresa.
-- Verificar: SELECT u.email, p.rol, p.empresa_id FROM auth.users u
--            JOIN perfiles p ON p.user_id = u.id WHERE p.rol IN ('Admin','super_admin');
-- ============================================================
