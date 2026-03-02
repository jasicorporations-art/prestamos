-- Script para registrar aceptación legal y versionado de documentos
BEGIN;

-- 0) Requisito para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Campos adicionales en perfiles (en public)
ALTER TABLE IF EXISTS public.perfiles
  ADD COLUMN IF NOT EXISTS terminos_version TEXT;

ALTER TABLE IF EXISTS public.perfiles
  ADD COLUMN IF NOT EXISTS privacidad_aceptada BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.perfiles
  ADD COLUMN IF NOT EXISTS privacidad_version TEXT;

ALTER TABLE IF EXISTS public.perfiles
  ADD COLUMN IF NOT EXISTS privacidad_fecha_aceptacion TIMESTAMPTZ;

ALTER TABLE IF EXISTS public.perfiles
  ADD COLUMN IF NOT EXISTS privacidad_ip TEXT;

-- (Opcional pero útil, porque tú ya tienes terminos_aceptados/fecha_aceptacion en tu esquema)
ALTER TABLE IF EXISTS public.perfiles
  ADD COLUMN IF NOT EXISTS terminos_aceptados BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.perfiles
  ADD COLUMN IF NOT EXISTS fecha_aceptacion TIMESTAMPTZ;

-- 2) Tabla historial de aceptaciones
CREATE TABLE IF NOT EXISTS public.legal_aceptaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  documento TEXT NOT NULL CHECK (documento IN ('terminos', 'privacidad')),
  version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.legal_aceptaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_aceptaciones_select_own ON public.legal_aceptaciones;
CREATE POLICY legal_aceptaciones_select_own
  ON public.legal_aceptaciones FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS legal_aceptaciones_insert_own ON public.legal_aceptaciones;
CREATE POLICY legal_aceptaciones_insert_own
  ON public.legal_aceptaciones FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3) Versionado de documentos legales
-- Si ya existe, solo asegura columnas e índice
CREATE TABLE IF NOT EXISTS public.legal_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento TEXT CHECK (documento IN ('terminos', 'privacidad')),
  version TEXT NOT NULL,
  effective_date DATE,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.legal_document_versions
  ADD COLUMN IF NOT EXISTS effective_date DATE;

ALTER TABLE public.legal_document_versions
  ADD COLUMN IF NOT EXISTS summary TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS legal_document_versions_unique
  ON public.legal_document_versions (documento, version);

ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_document_versions_select_all ON public.legal_document_versions;
CREATE POLICY legal_document_versions_select_all
  ON public.legal_document_versions FOR SELECT
  TO authenticated
  USING (true);

-- Seeds idempotentes
INSERT INTO public.legal_document_versions (documento, version, effective_date, summary)
VALUES
  ('terminos', '2026-01-23', '2026-01-23'::date, 'Versión inicial con cláusulas de uso, responsabilidad y jurisdicción.'),
  ('privacidad', '2026-01-23', '2026-01-23'::date, 'Versión inicial con datos recopilados, uso, seguridad y derechos.')
ON CONFLICT (documento, version) DO NOTHING;

-- 4) Trigger: NO forzar aceptación a TRUE.
-- Solo normaliza timestamps si ya vienen aceptados.
CREATE OR REPLACE FUNCTION public.validar_aceptacion_legal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.terminos_aceptados IS TRUE AND NEW.fecha_aceptacion IS NULL THEN
    NEW.fecha_aceptacion := NOW();
  END IF;

  IF NEW.privacidad_aceptada IS TRUE AND NEW.privacidad_fecha_aceptacion IS NULL THEN
    NEW.privacidad_fecha_aceptacion := NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validar_terminos_insert ON public.perfiles;
CREATE TRIGGER trigger_validar_terminos_insert
  BEFORE INSERT ON public.perfiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_aceptacion_legal();

COMMIT;
