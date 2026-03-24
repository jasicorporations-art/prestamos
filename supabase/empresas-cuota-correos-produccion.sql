-- =============================================================================
-- Cuota mensual de correos por empresa (producción)
-- Recomendado para Resend / email transaccional
-- =============================================================================
-- Orden sugerido:
--   1) Este script
--   2) empresas-plan-suscripcion-correos.sql (opcional: plan "ilimitado" → NULL)
-- Nota: Con tabla mensual, no hace falta cron que ponga a 0 un contador en empresas;
--       cada mes es una fila nueva (periodo = primer día UTC del mes).
-- =============================================================================

BEGIN;

-- Permitir NULL en límite si la columna ya existía como NOT NULL (migración desde esquema anterior)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'empresas' AND column_name = 'limite_correos_mensual'
  ) THEN
    ALTER TABLE public.empresas ALTER COLUMN limite_correos_mensual DROP NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Configuración en empresas
--    NULL = ilimitado
-- ---------------------------------------------------------------------------
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS limite_correos_mensual integer;

COMMENT ON COLUMN public.empresas.limite_correos_mensual IS
  'Máximo de correos permitidos por mes. NULL = ilimitado.';

-- Si existe un esquema anterior con default 500, lo mantenemos de forma explícita
UPDATE public.empresas
SET limite_correos_mensual = 500
WHERE limite_correos_mensual IS NULL;

ALTER TABLE public.empresas
  ALTER COLUMN limite_correos_mensual SET DEFAULT 500;

-- ---------------------------------------------------------------------------
-- 2) Tabla de consumo mensual por empresa
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.empresas_consumo_correos_mensual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  periodo date NOT NULL,
  correos_consumidos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, periodo),
  CONSTRAINT empresas_consumo_correos_mensual_consumidos_check
    CHECK (correos_consumidos >= 0)
);

COMMENT ON TABLE public.empresas_consumo_correos_mensual IS
  'Consumo mensual de correos por empresa. Una fila por empresa y por mes.';

COMMENT ON COLUMN public.empresas_consumo_correos_mensual.periodo IS
  'Primer día del mes en UTC, por ejemplo 2026-03-01.';

CREATE INDEX IF NOT EXISTS idx_empresas_consumo_correos_periodo
  ON public.empresas_consumo_correos_mensual (periodo DESC);

CREATE INDEX IF NOT EXISTS idx_empresas_consumo_correos_empresa_periodo
  ON public.empresas_consumo_correos_mensual (empresa_id, periodo DESC);

-- ---------------------------------------------------------------------------
-- 3) updated_at automático
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_empresas_consumo_correos()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_set_updated_at_empresas_consumo_correos
  ON public.empresas_consumo_correos_mensual;

CREATE TRIGGER tr_set_updated_at_empresas_consumo_correos
BEFORE UPDATE ON public.empresas_consumo_correos_mensual
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_empresas_consumo_correos();

-- ---------------------------------------------------------------------------
-- 4) Helper: normaliza el período mensual actual en UTC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.periodo_mensual_actual_utc()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT date_trunc('month', now() AT TIME ZONE 'UTC')::date;
$$;

REVOKE ALL ON FUNCTION public.periodo_mensual_actual_utc() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.periodo_mensual_actual_utc() TO service_role;

COMMENT ON FUNCTION public.periodo_mensual_actual_utc() IS
  'Devuelve el primer día del mes actual en UTC.';

-- ---------------------------------------------------------------------------
-- 5) Consultar consumo actual
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.empresas_get_consumo_correos_actual(p_empresa_id uuid)
RETURNS TABLE (
  empresa_id uuid,
  periodo date,
  limite_correos_mensual integer,
  correos_consumidos integer,
  correos_restantes integer,
  excedido boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH periodo_actual AS (
    SELECT public.periodo_mensual_actual_utc() AS periodo
  )
  SELECT
    e.id AS empresa_id,
    p.periodo,
    e.limite_correos_mensual,
    COALESCE(c.correos_consumidos, 0) AS correos_consumidos,
    CASE
      WHEN e.limite_correos_mensual IS NULL THEN NULL
      ELSE GREATEST(e.limite_correos_mensual - COALESCE(c.correos_consumidos, 0), 0)
    END::integer AS correos_restantes,
    CASE
      WHEN e.limite_correos_mensual IS NULL THEN false
      ELSE COALESCE(c.correos_consumidos, 0) >= e.limite_correos_mensual
    END AS excedido
  FROM public.empresas e
  CROSS JOIN periodo_actual p
  LEFT JOIN public.empresas_consumo_correos_mensual c
    ON c.empresa_id = e.id
   AND c.periodo = p.periodo
  WHERE e.id = p_empresa_id;
$$;

REVOKE ALL ON FUNCTION public.empresas_get_consumo_correos_actual(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.empresas_get_consumo_correos_actual(uuid) TO service_role;

COMMENT ON FUNCTION public.empresas_get_consumo_correos_actual(uuid) IS
  'Devuelve el consumo actual de correos de una empresa para el mes vigente UTC.';

-- ---------------------------------------------------------------------------
-- 6) Consumir cuota de forma atómica y segura
--    Devuelve true si se consumió correctamente
--    Devuelve false si alcanzó el límite
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.empresas_consumir_cuota_correo(
  p_empresa_id uuid,
  p_cantidad integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_periodo date;
  v_limite integer;
  v_consumidos integer;
BEGIN
  IF p_empresa_id IS NULL THEN
    RAISE EXCEPTION 'p_empresa_id no puede ser NULL';
  END IF;

  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'p_cantidad debe ser mayor que 0';
  END IF;

  v_periodo := public.periodo_mensual_actual_utc();

  SELECT e.limite_correos_mensual
    INTO v_limite
  FROM public.empresas e
  WHERE e.id = p_empresa_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa no encontrada: %', p_empresa_id;
  END IF;

  INSERT INTO public.empresas_consumo_correos_mensual (
    empresa_id,
    periodo,
    correos_consumidos
  )
  VALUES (p_empresa_id, v_periodo, 0)
  ON CONFLICT (empresa_id, periodo) DO NOTHING;

  SELECT c.correos_consumidos
    INTO v_consumidos
  FROM public.empresas_consumo_correos_mensual c
  WHERE c.empresa_id = p_empresa_id
    AND c.periodo = v_periodo
  FOR UPDATE;

  IF v_limite IS NOT NULL AND (v_consumidos + p_cantidad) > v_limite THEN
    RETURN false;
  END IF;

  UPDATE public.empresas_consumo_correos_mensual
  SET correos_consumidos = correos_consumidos + p_cantidad
  WHERE empresa_id = p_empresa_id
    AND periodo = v_periodo;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.empresas_consumir_cuota_correo(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.empresas_consumir_cuota_correo(uuid, integer) TO service_role;

COMMENT ON FUNCTION public.empresas_consumir_cuota_correo(uuid, integer) IS
  'Consume cuota mensual de correos de forma atómica. false = límite alcanzado. NULL limite en empresas = sin tope de envío (sigue registrando consumo en la tabla mensual).';

-- ---------------------------------------------------------------------------
-- 6b) Devolver cuota si el envío externo (Resend) falló tras consumir
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.empresas_devolver_cuota_correo(
  p_empresa_id uuid,
  p_cantidad integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_periodo date;
BEGIN
  IF p_empresa_id IS NULL OR p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RETURN;
  END IF;
  v_periodo := public.periodo_mensual_actual_utc();
  UPDATE public.empresas_consumo_correos_mensual
  SET correos_consumidos = GREATEST(0, correos_consumidos - p_cantidad),
      updated_at = now()
  WHERE empresa_id = p_empresa_id
    AND periodo = v_periodo;
END;
$$;

REVOKE ALL ON FUNCTION public.empresas_devolver_cuota_correo(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.empresas_devolver_cuota_correo(uuid, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- 7) Ajuste manual opcional (admin / soporte)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.empresas_ajustar_consumo_correos(
  p_empresa_id uuid,
  p_periodo date,
  p_nuevo_consumo integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_empresa_id IS NULL THEN
    RAISE EXCEPTION 'p_empresa_id no puede ser NULL';
  END IF;

  IF p_periodo IS NULL THEN
    RAISE EXCEPTION 'p_periodo no puede ser NULL';
  END IF;

  IF p_nuevo_consumo IS NULL OR p_nuevo_consumo < 0 THEN
    RAISE EXCEPTION 'p_nuevo_consumo debe ser >= 0';
  END IF;

  INSERT INTO public.empresas_consumo_correos_mensual (
    empresa_id,
    periodo,
    correos_consumidos
  )
  VALUES (
    p_empresa_id,
    date_trunc('month', p_periodo)::date,
    p_nuevo_consumo
  )
  ON CONFLICT (empresa_id, periodo)
  DO UPDATE SET
    correos_consumidos = EXCLUDED.correos_consumidos,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.empresas_ajustar_consumo_correos(uuid, date, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.empresas_ajustar_consumo_correos(uuid, date, integer) TO service_role;

COMMENT ON FUNCTION public.empresas_ajustar_consumo_correos(uuid, date, integer) IS
  'Permite fijar manualmente el consumo de correos de una empresa en un período dado.';

-- ---------------------------------------------------------------------------
-- 8) Limpieza opcional: contador legado en empresas (ejecutar si migraste desde
--    empresas-cuota-correos-mensual.sql con correos_consumidos en empresas)
-- ---------------------------------------------------------------------------
-- ALTER TABLE public.empresas DROP COLUMN IF EXISTS correos_consumidos;

COMMIT;
