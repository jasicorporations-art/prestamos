BEGIN;

CREATE TABLE IF NOT EXISTS public.personas_central (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula text NOT NULL UNIQUE,
  nombre_completo text,
  telefono text,
  foto_perfil_url text,
  solicitudes_pendientes_globales integer NOT NULL DEFAULT 0 CHECK (solicitudes_pendientes_globales >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.personas_central_rechazos_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL REFERENCES public.personas_central(id) ON DELETE CASCADE,
  empresa_id uuid,
  solicitud_id uuid,
  motivo_rechazo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personas_central_rechazos_persona_fecha
  ON public.personas_central_rechazos_historial(persona_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_personas_central_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_touch_personas_central_updated_at ON public.personas_central;
CREATE TRIGGER tr_touch_personas_central_updated_at
BEFORE UPDATE ON public.personas_central
FOR EACH ROW
EXECUTE FUNCTION public.touch_personas_central_updated_at();

COMMIT;
