-- ================================================================
-- PASO 10: Funciones RLS (get_user_empresa_id RETURNS UUID)
-- ================================================================
-- Todas las empresa_id son UUID. Políticas comparan UUID con UUID.
-- ================================================================

-- 1. Funciones auxiliares
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE user_id = auth.uid()
      AND LOWER(rol) = 'super_admin'
      AND (activo = true OR activo IS NULL)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE user_id = auth.uid()
      AND LOWER(rol) = 'admin'
      AND (activo = true OR activo IS NULL)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  RETURN (SELECT empresa_id FROM public.perfiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_sucursal_id()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  RETURN (SELECT sucursal_id FROM public.perfiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_empresa_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_sucursal_id() TO authenticated;

-- 2. Reemplazar políticas temporales por políticas correctas
-- EMPRESAS
DROP POLICY IF EXISTS "empresas_select_own" ON empresas;
DROP POLICY IF EXISTS "empresas_insert_own" ON empresas;
DROP POLICY IF EXISTS "empresas_policy" ON empresas;
CREATE POLICY "empresas_policy" ON empresas FOR ALL TO authenticated
  USING (public.is_super_admin() OR id = public.get_user_empresa_id() OR user_id = auth.uid())
  WITH CHECK (public.is_super_admin() OR id = public.get_user_empresa_id() OR user_id = auth.uid());

-- SUCURSALES
DROP POLICY IF EXISTS "sucursales_authenticated" ON sucursales;
DROP POLICY IF EXISTS "sucursales_policy" ON sucursales;
CREATE POLICY "sucursales_policy" ON sucursales FOR ALL TO authenticated
  USING (public.is_super_admin() OR empresa_id = public.get_user_empresa_id());

-- PERFILES (mantener select_own, insert_own, update_own; añadir policy para admin)
DROP POLICY IF EXISTS "perfiles_policy" ON perfiles;
CREATE POLICY "perfiles_policy" ON perfiles FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin()
    OR (public.is_admin() AND empresa_id = public.get_user_empresa_id())
  );

-- CLIENTES
DROP POLICY IF EXISTS "clientes_authenticated" ON clientes;
DROP POLICY IF EXISTS "clientes_policy" ON clientes;
CREATE POLICY "clientes_policy" ON clientes FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      empresa_id = public.get_user_empresa_id()
      AND (public.is_admin() OR sucursal_id = public.get_user_sucursal_id() OR sucursal_id IS NULL)
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      empresa_id = public.get_user_empresa_id()
      AND (public.is_admin() OR sucursal_id = public.get_user_sucursal_id() OR sucursal_id IS NULL)
    )
  );

-- VENTAS
DROP POLICY IF EXISTS "ventas_authenticated" ON ventas;
DROP POLICY IF EXISTS "ventas_policy" ON ventas;
CREATE POLICY "ventas_policy" ON ventas FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      empresa_id = public.get_user_empresa_id()
      AND (public.is_admin() OR sucursal_id = public.get_user_sucursal_id())
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      empresa_id = public.get_user_empresa_id()
      AND (public.is_admin() OR sucursal_id = public.get_user_sucursal_id())
    )
  );

-- PAGOS
DROP POLICY IF EXISTS "pagos_authenticated" ON pagos;
DROP POLICY IF EXISTS "pagos_policy" ON pagos;
CREATE POLICY "pagos_policy" ON pagos FOR ALL TO authenticated
  USING (public.is_super_admin() OR empresa_id = public.get_user_empresa_id())
  WITH CHECK (public.is_super_admin() OR empresa_id = public.get_user_empresa_id());

-- MOTORES
DROP POLICY IF EXISTS "motores_authenticated" ON motores;
DROP POLICY IF EXISTS "motores_policy" ON motores;
CREATE POLICY "motores_policy" ON motores FOR ALL TO authenticated
  USING (public.is_super_admin() OR empresa_id = public.get_user_empresa_id())
  WITH CHECK (public.is_super_admin() OR empresa_id = public.get_user_empresa_id());
