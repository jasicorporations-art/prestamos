-- =============================================================================
-- Cuota mensual de correos (Resend) por empresa / tenant
-- =============================================================================
-- Ejecutar en Supabase → SQL Editor
-- Luego (planes JASI LLC + sync automático del límite): empresas-plan-suscripcion-correos.sql
--
-- Reinicio mensual (elige UNA opción):
--
-- A pg_cron (Supabase Pro+: Database → Extensions → pg_cron)
--    SELECT cron.schedule(
--      'reset-correos-empresas-mes',
--      '0 5 1 * *',  -- día 1 de cada mes, 05:00 UTC (ajusta zona)
--      $$ SELECT public.reset_correos_consumidos_mensual(); $$
--    );
--
-- B Vercel / cron externo: llama GET /api/cron/reset-correos-empresas con header
--   Authorization: Bearer CRON_SECRET (misma variable que otras rutas cron del proyecto)
-- =============================================================================

BEGIN;

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS limite_correos_mensual integer NOT NULL DEFAULT 500;

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS correos_consumidos integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.empresas.limite_correos_mensual IS
  'Tope de correos (recibos, etc.) por mes vía Resend. NULL no permitido con este esquema; usar un valor alto si “ilimitado”.';
COMMENT ON COLUMN public.empresas.correos_consumidos IS
  'Correos enviados exitosamente en el mes actual; reiniciar el día 1 con reset_correos_consumidos_mensual.';

-- NULL en límite = sin tope (compat futura): migración usa NOT NULL DEFAULT 500.
-- Para una empresa sin límite, puedes poner limite_correos_mensual muy alto (ej. 999999).

CREATE OR REPLACE FUNCTION public.reset_correos_consumidos_mensual()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.empresas
  SET correos_consumidos = 0;
$$;

REVOKE ALL ON FUNCTION public.reset_correos_consumidos_mensual() FROM PUBLIC;

COMMENT ON FUNCTION public.reset_correos_consumidos_mensual() IS
  'Pone correos_consumidos = 0 en todas las empresas (ejecutar el día 1 de cada mes).';

CREATE OR REPLACE FUNCTION public.empresas_increment_correo_consumido(p_empresa_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.empresas
  SET correos_consumidos = COALESCE(correos_consumidos, 0) + 1
  WHERE id = p_empresa_id;
$$;

REVOKE ALL ON FUNCTION public.empresas_increment_correo_consumido(uuid) FROM PUBLIC;

COMMENT ON FUNCTION public.empresas_increment_correo_consumido(uuid) IS
  'Suma 1 a correos_consumidos tras un envío exitoso por API (service role).';

-- Permitir invocación desde el backend (service role / supabase-js admin)
GRANT EXECUTE ON FUNCTION public.reset_correos_consumidos_mensual() TO service_role;
GRANT EXECUTE ON FUNCTION public.empresas_increment_correo_consumido(uuid) TO service_role;

COMMIT;
