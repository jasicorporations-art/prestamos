-- ============================================================
-- tenant_backups: RLS moderno para leer, guardar, actualizar y eliminar
-- ============================================================
-- Ejecutar en Supabase SQL Editor si "No se pudo guardar en la nube".
-- Si la tabla tenant_backups no existe, ejecute antes: crear-tabla-tenant-backups.sql

-- 1) Asegurar RLS
ALTER TABLE public.tenant_backups ENABLE ROW LEVEL SECURITY;

-- 2) Índice para rendimiento de RLS y consultas por tenant
CREATE INDEX IF NOT EXISTS idx_tenant_backups_tenant_id
ON public.tenant_backups (tenant_id);

-- 3) Limpiar políticas anteriores
DROP POLICY IF EXISTS tenant_backups_select_own ON public.tenant_backups;
DROP POLICY IF EXISTS tenant_backups_insert_own ON public.tenant_backups;
DROP POLICY IF EXISTS tenant_backups_update_own ON public.tenant_backups;
DROP POLICY IF EXISTS tenant_backups_delete_own ON public.tenant_backups;

-- 4) Función auxiliar: obtiene el tenant del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_tenant_id_for_backups()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.empresa_id
  FROM public.perfiles AS p
  WHERE p.user_id = auth.uid()
    AND p.empresa_id IS NOT NULL
  LIMIT 1
$$;

-- 5) Política SELECT
CREATE POLICY tenant_backups_select_own
ON public.tenant_backups
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_tenant_id_for_backups()
);

-- 6) Política INSERT
CREATE POLICY tenant_backups_insert_own
ON public.tenant_backups
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_tenant_id_for_backups()
);

-- 7) Política UPDATE
CREATE POLICY tenant_backups_update_own
ON public.tenant_backups
FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_tenant_id_for_backups()
)
WITH CHECK (
  tenant_id = public.get_tenant_id_for_backups()
);

-- 8) Política DELETE
CREATE POLICY tenant_backups_delete_own
ON public.tenant_backups
FOR DELETE
TO authenticated
USING (
  tenant_id = public.get_tenant_id_for_backups()
);

-- 9) Grants mínimos necesarios
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_backups TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_id_for_backups() TO authenticated;

-- 10) Documentación
COMMENT ON FUNCTION public.get_tenant_id_for_backups() IS
'Devuelve el empresa_id del usuario autenticado para aplicar RLS en tenant_backups.';

COMMENT ON TABLE public.tenant_backups IS
'Backups por tenant con RLS: cada usuario autenticado solo puede leer, crear, actualizar y eliminar backups de su propia empresa.';

-- 11) Recargar PostgREST
NOTIFY pgrst, 'reload schema';
