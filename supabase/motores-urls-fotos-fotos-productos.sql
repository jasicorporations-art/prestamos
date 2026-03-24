-- Columna urls_fotos en motores (fotos en Storage bucket fotos_productos).
-- Ejecutar en Supabase SQL Editor.

BEGIN;

ALTER TABLE public.motores
ADD COLUMN IF NOT EXISTS urls_fotos text[];

UPDATE public.motores
SET urls_fotos = '{}'::text[]
WHERE urls_fotos IS NULL;

ALTER TABLE public.motores
ALTER COLUMN urls_fotos SET DEFAULT '{}'::text[];

ALTER TABLE public.motores
ALTER COLUMN urls_fotos SET NOT NULL;

COMMENT ON COLUMN public.motores.urls_fotos IS
'URLs públicas de imágenes en Storage (bucket fotos_productos). Rutas sugeridas: {empresa_id}/{venta_id|motor_id}/';

COMMIT;

-- Bucket: POST /api/storage/ensure-fotos-productos-bucket
-- o en Dashboard > Storage: bucket fotos_productos, público.
