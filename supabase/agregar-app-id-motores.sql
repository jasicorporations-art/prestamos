-- Agregar app_id a motores (compatibilidad con importación/legacy)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.motores
ADD COLUMN IF NOT EXISTS app_id TEXT;
