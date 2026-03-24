-- =============================================================================
-- Auditoría automática de BD (producción)
-- Tablas auditadas: clientes, ventas, pagos, sucursales
-- Destino: public.actividad_logs
--
-- CÓMO EJECUTAR EN SUPABASE
--   1) Dashboard → SQL Editor → Nueva consulta
--   2) Pega todo el script y pulsa Run (ideal en horario de poca carga)
--   3) Si ya existían triggers/campos, el script es idempotente salvo conflictos de nombres
--
-- RESTORE / CARGA MASIVA (sin miles de filas en actvidad_logs):
--   SELECT public.set_auditoria_suspendida(true);
--   ... tu restore o INSERT masivo ...
--   SELECT public.set_auditoria_suspendida(false);
--
-- Nota: en PG antiguos sustituye "EXECUTE FUNCTION" por "EXECUTE PROCEDURE" en los triggers.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Columnas requeridas en actividad_logs
-- ---------------------------------------------------------------------------
ALTER TABLE public.actividad_logs
  ADD COLUMN IF NOT EXISTS old_data jsonb,
  ADD COLUMN IF NOT EXISTS new_data jsonb,
  ADD COLUMN IF NOT EXISTS tipo_accion varchar(10);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'actividad_logs_tipo_accion_check'
  ) THEN
    ALTER TABLE public.actividad_logs
      ADD CONSTRAINT actividad_logs_tipo_accion_check
      CHECK (tipo_accion IS NULL OR tipo_accion IN ('INSERT', 'UPDATE', 'DELETE'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

COMMENT ON COLUMN public.actividad_logs.old_data IS
  'Auditoría DB: estado anterior de la fila.';
COMMENT ON COLUMN public.actividad_logs.new_data IS
  'Auditoría DB: estado nuevo de la fila.';
COMMENT ON COLUMN public.actividad_logs.tipo_accion IS
  'Auditoría DB: INSERT, UPDATE o DELETE.';

CREATE INDEX IF NOT EXISTS idx_actividad_logs_fecha_audit
  ON public.actividad_logs (fecha_hora DESC)
  WHERE tipo_accion IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_actividad_logs_entidad_audit
  ON public.actividad_logs (entidad_tipo, entidad_id, fecha_hora DESC)
  WHERE tipo_accion IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_actividad_logs_empresa_audit
  ON public.actividad_logs (empresa_id, fecha_hora DESC)
  WHERE tipo_accion IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) Helper para marcar una sesión como restore/import
--    Uso:
--      SELECT public.set_auditoria_suspendida(true);
--      ... restore ...
--      SELECT public.set_auditoria_suspendida(false);
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_auditoria_suspendida(p_suspendida boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.auditoria_suspendida', CASE WHEN p_suspendida THEN 'true' ELSE 'false' END, true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_auditoria_suspendida(boolean) FROM PUBLIC;

COMMENT ON FUNCTION public.set_auditoria_suspendida(boolean) IS
  'Suspende/reanuda la auditoría en la sesión actual. Útil para restores o cargas masivas.';

-- ---------------------------------------------------------------------------
-- 3) Función genérica de auditoría
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auditoria_registrar_fila()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_tipo varchar(10);
  v_id uuid;
  v_empresa_id uuid;
  v_app_id text;
  v_sucursal_id uuid;
  v_sucursal_nombre varchar(255);
  v_usuario_id uuid;
  v_usuario_nombre varchar(255);
  v_detalle text;
  v_skip boolean := false;
BEGIN
  -- -------------------------------------------------------------------------
  -- A) Permitir desactivar auditoría en restores/imports masivos
  -- -------------------------------------------------------------------------
  BEGIN
    v_skip := COALESCE(current_setting('app.auditoria_suspendida', true), 'false') = 'true';
  EXCEPTION
    WHEN OTHERS THEN
      v_skip := false;
  END;

  IF v_skip THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- B) Evitar registrar UPDATE sin cambios reales
  -- -------------------------------------------------------------------------
  IF TG_OP = 'UPDATE' AND to_jsonb(OLD) = to_jsonb(NEW) THEN
    RETURN NEW;
  END IF;

  -- -------------------------------------------------------------------------
  -- C) Preparar OLD / NEW
  -- -------------------------------------------------------------------------
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_tipo := 'DELETE';
    v_id := OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_tipo := 'UPDATE';
    v_id := NEW.id;
  ELSE
    v_old := NULL;
    v_new := to_jsonb(NEW);
    v_tipo := 'INSERT';
    v_id := NEW.id;
  END IF;

  -- -------------------------------------------------------------------------
  -- D) Captura segura de auth.uid()
  -- -------------------------------------------------------------------------
  BEGIN
    v_usuario_id := auth.uid();
  EXCEPTION
    WHEN OTHERS THEN
      v_usuario_id := NULL;
  END;

  -- -------------------------------------------------------------------------
  -- E) Resolver empresa_id, app_id, sucursal_id de forma defensiva
  -- -------------------------------------------------------------------------
  BEGIN
    v_empresa_id := COALESCE(
      NULLIF(v_new->>'empresa_id', '')::uuid,
      NULLIF(v_old->>'empresa_id', '')::uuid
    );
  EXCEPTION
    WHEN OTHERS THEN
      v_empresa_id := NULL;
  END;

  v_app_id := COALESCE(
    NULLIF(v_new->>'app_id', ''),
    NULLIF(v_old->>'app_id', ''),
    'prestamos'
  );

  BEGIN
    v_sucursal_id := COALESCE(
      NULLIF(v_new->>'sucursal_id', '')::uuid,
      NULLIF(v_old->>'sucursal_id', '')::uuid
    );
  EXCEPTION
    WHEN OTHERS THEN
      v_sucursal_id := NULL;
  END;

  -- -------------------------------------------------------------------------
  -- F) Resolver nombre de sucursal (sin romper la operación)
  -- -------------------------------------------------------------------------
  v_sucursal_nombre := NULL;
  IF v_sucursal_id IS NOT NULL THEN
    BEGIN
      SELECT s.nombre
      INTO v_sucursal_nombre
      FROM public.sucursales s
      WHERE s.id = v_sucursal_id
      LIMIT 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_sucursal_nombre := NULL;
    END;
  END IF;

  -- -------------------------------------------------------------------------
  -- G) Resolver nombre de usuario (sin romper la operación)
  -- -------------------------------------------------------------------------
  v_usuario_nombre := NULL;
  IF v_usuario_id IS NOT NULL THEN
    BEGIN
      SELECT p.nombre_completo
      INTO v_usuario_nombre
      FROM public.perfiles p
      WHERE p.user_id = v_usuario_id
        AND COALESCE(p.activo, true) = true
      LIMIT 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_usuario_nombre := NULL;
    END;
  END IF;

  -- -------------------------------------------------------------------------
  -- H) Detalle legible
  -- -------------------------------------------------------------------------
  v_detalle := format(
    '%s: %s registro %s',
    TG_TABLE_NAME,
    v_tipo,
    COALESCE(v_id::text, '')
  );

  -- -------------------------------------------------------------------------
  -- I) Insert de auditoría
  --    Muy importante: si falla la auditoría, no romper el negocio.
  -- -------------------------------------------------------------------------
  BEGIN
    INSERT INTO public.actividad_logs (
      usuario_id,
      usuario_nombre,
      sucursal_id,
      sucursal_nombre,
      empresa_id,
      compania_id,
      app_id,
      accion,
      detalle,
      entidad_tipo,
      entidad_id,
      old_data,
      new_data,
      tipo_accion,
      fecha_hora
    ) VALUES (
      v_usuario_id,
      v_usuario_nombre,
      v_sucursal_id,
      v_sucursal_nombre,
      v_empresa_id,
      CASE WHEN v_empresa_id IS NOT NULL THEN v_empresa_id::text ELSE NULL END,
      v_app_id,
      'Auditoría base de datos',
      v_detalle,
      TG_TABLE_NAME,
      v_id,
      v_old,
      v_new,
      v_tipo,
      clock_timestamp()
    );
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.auditoria_registrar_fila() FROM PUBLIC;

COMMENT ON FUNCTION public.auditoria_registrar_fila() IS
  'Trigger genérico de auditoría, tolerante a fallos, preparado para producción y restauraciones masivas.';

-- ---------------------------------------------------------------------------
-- 4) Re-crear triggers
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS tr_auditoria_clientes ON public.clientes;
CREATE TRIGGER tr_auditoria_clientes
AFTER INSERT OR UPDATE OR DELETE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.auditoria_registrar_fila();

DROP TRIGGER IF EXISTS tr_auditoria_ventas ON public.ventas;
CREATE TRIGGER tr_auditoria_ventas
AFTER INSERT OR UPDATE OR DELETE ON public.ventas
FOR EACH ROW
EXECUTE FUNCTION public.auditoria_registrar_fila();

DROP TRIGGER IF EXISTS tr_auditoria_pagos ON public.pagos;
CREATE TRIGGER tr_auditoria_pagos
AFTER INSERT OR UPDATE OR DELETE ON public.pagos
FOR EACH ROW
EXECUTE FUNCTION public.auditoria_registrar_fila();

DROP TRIGGER IF EXISTS tr_auditoria_sucursales ON public.sucursales;
CREATE TRIGGER tr_auditoria_sucursales
AFTER INSERT OR UPDATE OR DELETE ON public.sucursales
FOR EACH ROW
EXECUTE FUNCTION public.auditoria_registrar_fila();

COMMIT;

-- ---------------------------------------------------------------------------
-- 5) Vista de solo auditoría automática
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'historial_movimientos'
  ) THEN
    EXECUTE $v$
      CREATE VIEW public.historial_movimientos AS
      SELECT
        id,
        old_data AS "OLD_DATA",
        new_data AS "NEW_DATA",
        usuario_id AS "MODIFICADO_POR",
        tipo_accion AS "TIPO_ACCION",
        entidad_tipo AS tabla,
        entidad_id AS registro_id,
        empresa_id,
        fecha_hora,
        accion,
        detalle
      FROM public.actividad_logs
      WHERE tipo_accion IS NOT NULL
    $v$;

    COMMENT ON VIEW public.historial_movimientos IS
      'Vista de auditoría automática por triggers.';
  END IF;
END $$;
