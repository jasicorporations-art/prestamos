BEGIN;

-- =====================================================
-- 1) FUNCIÓN: obtener empresa del usuario autenticado
-- Usa empresa_id o compania_id (por si el perfil solo tiene uno)
-- Así cuentas nuevas no fallan RLS al crear clientes.
-- =====================================================

CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
  v_compania_id text;
BEGIN
  SELECT p.empresa_id, COALESCE(p.compania_id::text, '') INTO v_empresa_id, v_compania_id
  FROM public.perfiles p
  WHERE p.user_id = auth.uid() AND p.activo = true
  LIMIT 1;
  IF v_empresa_id IS NOT NULL THEN
    RETURN v_empresa_id;
  END IF;
  IF v_compania_id <> '' AND v_compania_id ~ '^[0-9a-fA-F-]{36}$' THEN
    RETURN v_compania_id::uuid;
  END IF;
  RETURN NULL;
EXCEPTION
  WHEN undefined_column THEN
    RETURN (SELECT empresa_id FROM public.perfiles WHERE user_id = auth.uid() AND activo = true LIMIT 1);
END;
$$;

-- =====================================================
-- 2) FUNCIÓN: verificar si es super_admin
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles
    WHERE user_id = auth.uid()
      AND LOWER(rol) = 'super_admin'
      AND activo = true
  );
$$;

-- =====================================================
-- 3) CLIENTES - RLS POR EMPRESA
-- =====================================================

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clientes_empresa_policy ON public.clientes;

CREATE POLICY clientes_empresa_policy
ON public.clientes
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR empresa_id = public.current_empresa_id()
)
WITH CHECK (
  public.is_super_admin()
  OR empresa_id = public.current_empresa_id()
);

-- =====================================================
-- 3b) CLIENTES - Cédula única POR EMPRESA (varias empresas pueden repetir misma cédula)
-- =====================================================
-- Quita restricciones que exijan cédula única global; deja solo (empresa_id, cedula).
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_cedula_key;
DROP INDEX IF EXISTS idx_cliente_empresa_cedula;
DROP INDEX IF EXISTS idx_clientes_empresa_cedula_unique;
DROP INDEX IF EXISTS idx_clientes_compania_cedula_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cliente_empresa_cedula ON public.clientes (empresa_id, cedula);

-- =====================================================
-- 4) MOTORES - RLS POR EMPRESA
-- =====================================================

ALTER TABLE public.motores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motores FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS motores_empresa_policy ON public.motores;

CREATE POLICY motores_empresa_policy
ON public.motores
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR empresa_id = public.current_empresa_id()
)
WITH CHECK (
  public.is_super_admin()
  OR empresa_id = public.current_empresa_id()
);

-- =====================================================
-- 5) (OPCIONAL RECOMENDADO) VENTAS
-- =====================================================

ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ventas_empresa_policy ON public.ventas;

CREATE POLICY ventas_empresa_policy
ON public.ventas
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR empresa_id = public.current_empresa_id()
)
WITH CHECK (
  public.is_super_admin()
  OR empresa_id = public.current_empresa_id()
);

-- =====================================================
-- 6) PAGOS - RLS POR EMPRESA
-- =====================================================

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pagos_empresa_policy ON public.pagos;

CREATE POLICY pagos_empresa_policy
ON public.pagos
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR empresa_id = public.current_empresa_id()
)
WITH CHECK (
  public.is_super_admin()
  OR empresa_id = public.current_empresa_id()
);

-- =====================================================
-- 7) SUCURSALES - RLS POR EMPRESA
-- =====================================================

ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sucursales_empresa_policy ON public.sucursales;
DROP POLICY IF EXISTS sucursales_policy ON public.sucursales;

CREATE POLICY sucursales_empresa_policy
ON public.sucursales
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR empresa_id = public.current_empresa_id()
)
WITH CHECK (
  public.is_super_admin()
  OR empresa_id = public.current_empresa_id()
);

-- =====================================================
-- 8) RUTAS - RLS POR EMPRESA
-- =====================================================

ALTER TABLE public.rutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rutas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rutas_empresa_policy ON public.rutas;
DROP POLICY IF EXISTS rutas_policy ON public.rutas;

CREATE POLICY rutas_empresa_policy
ON public.rutas
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR empresa_id = public.current_empresa_id()
)
WITH CHECK (
  public.is_super_admin()
  OR empresa_id = public.current_empresa_id()
);

COMMIT;

