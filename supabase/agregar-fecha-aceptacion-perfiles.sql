-- Agregar columnas de aceptación de términos a perfiles
-- Ejecutar en Supabase SQL Editor si faltan columnas legales

ALTER TABLE public.perfiles
ADD COLUMN IF NOT EXISTS terminos_aceptados BOOLEAN DEFAULT false;

ALTER TABLE public.perfiles
ADD COLUMN IF NOT EXISTS fecha_aceptacion TIMESTAMPTZ;

ALTER TABLE public.perfiles
ADD COLUMN IF NOT EXISTS privacidad_fecha_aceptacion TIMESTAMPTZ;

ALTER TABLE public.perfiles
ADD COLUMN IF NOT EXISTS privacidad_version TEXT;

ALTER TABLE public.perfiles
ADD COLUMN IF NOT EXISTS privacidad_ip TEXT;

ALTER TABLE public.perfiles
ADD COLUMN IF NOT EXISTS ip_registro TEXT;
