-- Políticas extra (staff JWT + nota service_role): ver
-- `storage-policies-comprobantes-pagos-service-admin.sql`
--
-- ============================================================
-- Storage: bucket comprobantes_pagos
-- Ejecutar en Supabase SQL Editor
--
-- Configura el bucket como público y agrega políticas para:
--   • upload: solo el service role (notificar-pago usa service role)
--   • lectura: pública (las rutas son UUIDs no adivinables)
-- ============================================================

-- 1. Asegurar que el bucket existe como público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprobantes_pagos',
  'comprobantes_pagos',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE
  SET public = true;

-- 2. Eliminar políticas antiguas del bucket (si existen)
DROP POLICY IF EXISTS "comprobantes_pagos_read" ON storage.objects;
DROP POLICY IF EXISTS "comprobantes_pagos_insert" ON storage.objects;
DROP POLICY IF EXISTS "comprobantes_pagos_delete" ON storage.objects;
DROP POLICY IF EXISTS "comprobantes_pagos_read_public" ON storage.objects;
DROP POLICY IF EXISTS "comprobantes_pagos_insert_auth" ON storage.objects;

-- 3. Lectura pública (bucket es público, esto es por consistencia)
CREATE POLICY "comprobantes_pagos_read_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'comprobantes_pagos');

-- 4. Subida: solo usuarios autenticados (el portal usa service role = bypasa esto,
--    pero por si acaso algún admin quiere subir manualmente)
CREATE POLICY "comprobantes_pagos_insert_auth"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comprobantes_pagos');
