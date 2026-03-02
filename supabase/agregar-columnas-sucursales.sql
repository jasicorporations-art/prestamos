-- Agregar columnas faltantes a sucursales (para poder crear sucursales desde la app)
-- Ejecutar en Supabase SQL Editor

BEGIN;

-- cobrar_domingos: usado por el formulario de sucursales
ALTER TABLE public.sucursales
ADD COLUMN IF NOT EXISTS cobrar_domingos BOOLEAN DEFAULT false;

-- normalizar valores existentes
UPDATE public.sucursales
SET cobrar_domingos = false
WHERE cobrar_domingos IS NULL;

-- app_id: enviado desde la app (withAppIdData)
ALTER TABLE public.sucursales
ADD COLUMN IF NOT EXISTS app_id TEXT;

-- índice opcional para performance
CREATE INDEX IF NOT EXISTS idx_sucursales_app_id
ON public.sucursales(app_id);

COMMIT;
