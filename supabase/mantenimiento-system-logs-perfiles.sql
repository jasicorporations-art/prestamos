-- Ejecutar en Supabase SQL Editor
-- 1) Estado de mantenimiento por tenant (empresas.status)
-- 2) Tabla system_logs para errores con correlation_id
-- 3) Constraint de roles en perfiles (Admin, Vendedor, Cobrador, super_admin)

BEGIN;

-- =========================================================
-- 0) Requisitos para UUID
-- =========================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- 1) Estado de mantenimiento por tenant (empresas.status)
-- =========================================================
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS status TEXT;

-- normaliza NULLs antes de NOT NULL
UPDATE public.empresas
SET status = 'active'
WHERE status IS NULL;

-- constraint idempotente
ALTER TABLE public.empresas
  DROP CONSTRAINT IF EXISTS empresas_status_check;

ALTER TABLE public.empresas
  ADD CONSTRAINT empresas_status_check
  CHECK (status IN ('active', 'inactive'));

-- asegura default + not null
ALTER TABLE public.empresas
  ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE public.empresas
  ALTER COLUMN status SET NOT NULL;

COMMENT ON COLUMN public.empresas.status
IS 'active = operación normal; inactive = modo mantenimiento (usuarios ven mensaje al loguearse)';


-- =========================================================
-- 2) system_logs (logs de errores con correlation_id)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint TEXT,
  error_message TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_tenant       ON public.system_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at   ON public.system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_correlation  ON public.system_logs(correlation_id);

COMMENT ON TABLE public.system_logs
IS 'Logs de errores con correlation_id para rastrear sesión del error';

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Helper: función para saber si el usuario actual es super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles p
    WHERE p.user_id = auth.uid()
      AND p.rol = 'super_admin'
  );
$$;

-- Limpia policies previas
DROP POLICY IF EXISTS system_logs_insert_auth ON public.system_logs;
DROP POLICY IF EXISTS system_logs_select_super ON public.system_logs;

-- INSERT: cualquier authenticated puede insertar logs (ok)
CREATE POLICY system_logs_insert_auth
  ON public.system_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SELECT: SOLO super_admin (recomendado)
CREATE POLICY system_logs_select_super
  ON public.system_logs
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());


-- =========================================================
-- 3) Rol super_admin en perfiles
-- =========================================================
-- 3.1) Normalizar valores inválidos antes del CHECK
UPDATE public.perfiles
SET rol = 'Vendedor'
WHERE rol IS NULL
   OR rol NOT IN ('Admin', 'Vendedor', 'Cobrador', 'super_admin');

-- 3.2) Re-crear constraint
ALTER TABLE public.perfiles
  DROP CONSTRAINT IF EXISTS perfiles_rol_check;

ALTER TABLE public.perfiles
  ADD CONSTRAINT perfiles_rol_check
  CHECK (rol IN ('Admin', 'Vendedor', 'Cobrador', 'super_admin'));

COMMIT;
