-- ================================================================
-- FIX DEFINITIVO: super_admin, Admin y Vendedor - permisos correctos
-- ================================================================
--
-- super_admin: Acceso TOTAL (todas las empresas)
-- Admin: Acceso a TODA su empresa (todas las sucursales)
-- Vendedor: Acceso SOLO a su sucursal asignada
--
-- Ejecutar en Supabase SQL Editor
-- ================================================================

BEGIN;

-- ============================================================
-- 1. Funciones auxiliares (SECURITY DEFINER = sin recursión RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.user_id = auth.uid()
      AND LOWER(TRIM(p.rol)) = 'super_admin'
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
    WHERE p.user_id = auth.uid()
      AND LOWER(TRIM(p.rol)) = 'admin'
      AND (p.activo = true OR p.activo IS NULL)
  );
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

-- Asegurar que get_user_empresa_id existe y maneja super_admin
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS VARCHAR(255)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE v_val VARCHAR(255);
BEGIN
  SELECT COALESCE(p.empresa_id, p.compania_id) INTO v_val
  FROM public.perfiles p
  WHERE p.user_id = auth.uid() AND (p.activo = true OR p.activo IS NULL)
  LIMIT 1;
  RETURN v_val;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_sucursal_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_empresa_id() TO authenticated;

-- ============================================================
-- 2. Eliminar TODAS las políticas existentes
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
END $$;

-- ============================================================
-- 3. CLIENTES
-- super_admin: TODO | Admin: su empresa | Vendedor: su sucursal
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

-- Vendedor: solo su sucursal (datos con sucursal_id NULL visibles solo si vendedor tampoco tiene sucursal)
CREATE POLICY "clientes_vendedor" ON clientes FOR ALL TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND (
      sucursal_id = public.get_user_sucursal_id()
      OR (sucursal_id IS NULL AND public.get_user_sucursal_id() IS NULL)
    )
  )
  WITH CHECK (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND (sucursal_id = public.get_user_sucursal_id() OR (sucursal_id IS NULL AND public.get_user_sucursal_id() IS NULL))
  );

-- ============================================================
-- 4. VENTAS
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
    AND (
      sucursal_id = public.get_user_sucursal_id()
      OR (sucursal_id IS NULL AND public.get_user_sucursal_id() IS NULL)
    )
  )
  WITH CHECK (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND sucursal_id = public.get_user_sucursal_id()
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
      OR (sucursal_id IS NULL AND sucursal_donde_se_cobro IS NULL AND public.get_user_sucursal_id() IS NULL)
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
-- ============================================================

ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "sucursales_empresa_owner" ON sucursales FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT id::text FROM empresas WHERE user_id = auth.uid()));

-- ============================================================
-- 8. RUTAS (si existe)
-- ============================================================

DO $$
DECLARE pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rutas') THEN
    ALTER TABLE rutas ENABLE ROW LEVEL SECURITY;
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rutas') LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON rutas', pol.policyname);
    END LOOP;
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
-- VERIFICACIÓN (ejecutar aparte)
-- ============================================================
-- SELECT u.email, p.rol, p.empresa_id, p.sucursal_id
-- FROM auth.users u
-- JOIN perfiles p ON p.user_id = u.id
-- WHERE p.rol IN ('super_admin', 'Admin', 'Vendedor');
--
-- Para Admin: empresa_id debe coincidir con clientes.empresa_id (UUID o nombre)
-- Para Vendedor: sucursal_id debe estar asignada
-- ============================================================
