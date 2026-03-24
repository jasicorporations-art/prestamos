-- =============================================================================
-- Plan de suscripción (correos Resend) por empresa — JASI LLC
-- =============================================================================
-- Bronce 500 | Plata 1.000 | Oro 4.000 | Ilimitado = NULL (sin tope real)
-- Ejecutar tras empresas-cuota-correos-produccion.sql (limite_correos_mensual nullable)
--
-- Sincronización con el plan SaaS (user_metadata.planType):
--   La app actualiza plan_suscripcion vía syncEmpresaPlanCorreoForUser (Stripe, login admin,
--   registro, /api/empresa/sync-plan-correos). Mapa: PLATA→plata, ORO→oro, INFINITO→ilimitado,
--   TRIAL/INICIAL/BRONCE→bronce.
-- =============================================================================

BEGIN;

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS plan_suscripcion text NOT NULL DEFAULT 'bronce';

COMMENT ON COLUMN public.empresas.plan_suscripcion IS
  'Plan de correos: bronce | plata | oro | ilimitado. El límite mensual se sincroniza automáticamente.';

ALTER TABLE public.empresas
  DROP CONSTRAINT IF EXISTS empresas_plan_suscripcion_check;

ALTER TABLE public.empresas
  ADD CONSTRAINT empresas_plan_suscripcion_check
  CHECK (
    plan_suscripcion IN ('bronce', 'plata', 'oro', 'ilimitado')
  );

-- Función central para resolver el límite por plan (NULL = ilimitado)
CREATE OR REPLACE FUNCTION public.empresas_limite_correos_por_plan(p_plan text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_plan text;
BEGIN
  v_plan := lower(trim(coalesce(p_plan, 'bronce')));

  IF v_plan = '' THEN
    v_plan := 'bronce';
  END IF;

  RETURN CASE v_plan
    WHEN 'bronce' THEN 500
    WHEN 'plata' THEN 1000
    WHEN 'oro' THEN 4000
    WHEN 'ilimitado' THEN NULL::integer
    ELSE 500
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.empresas_limite_correos_por_plan(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.empresas_limite_correos_por_plan(text) TO service_role;

COMMENT ON FUNCTION public.empresas_limite_correos_por_plan(text) IS
  'Devuelve el límite mensual de correos según el plan. NULL = ilimitado.';

CREATE OR REPLACE FUNCTION public.empresas_aplica_limite_correos_por_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
BEGIN
  v_plan := lower(trim(coalesce(NEW.plan_suscripcion, 'bronce')));

  IF v_plan = '' OR v_plan NOT IN ('bronce', 'plata', 'oro', 'ilimitado') THEN
    v_plan := 'bronce';
  END IF;

  NEW.plan_suscripcion := v_plan;
  NEW.limite_correos_mensual := public.empresas_limite_correos_por_plan(v_plan);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.empresas_aplica_limite_correos_por_plan() FROM PUBLIC;

COMMENT ON FUNCTION public.empresas_aplica_limite_correos_por_plan() IS
  'Normaliza plan_suscripcion y sincroniza limite_correos_mensual según el plan.';

-- Nombre anterior del trigger (migraciones previas del repo)
DROP TRIGGER IF EXISTS empresas_limite_correos_por_plan ON public.empresas;
DROP TRIGGER IF EXISTS tr_empresas_limite_correos_por_plan ON public.empresas;

CREATE TRIGGER tr_empresas_limite_correos_por_plan
  BEFORE INSERT OR UPDATE OF plan_suscripcion
  ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.empresas_aplica_limite_correos_por_plan();

-- Re-sincronizar solo filas necesarias (normaliza plan y/o alinea límite)
UPDATE public.empresas
SET plan_suscripcion = lower(trim(coalesce(plan_suscripcion, 'bronce')))
WHERE plan_suscripcion IS DISTINCT FROM lower(trim(coalesce(plan_suscripcion, 'bronce')))
   OR limite_correos_mensual IS DISTINCT FROM public.empresas_limite_correos_por_plan(plan_suscripcion);

COMMIT;
