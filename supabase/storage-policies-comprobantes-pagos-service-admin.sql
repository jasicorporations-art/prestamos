-- ============================================================
-- Storage: permisos comprobantes_pagos (service_role + staff)
-- Ejecutar en Supabase SQL Editor después de crear el bucket.
-- ============================================================
--
-- 1) service_role
--    Las peticiones con la clave `service_role` (SUPABASE_SERVICE_ROLE_KEY)
--    BYPASAN RLS en `storage.objects`. No necesitas política extra para que
--    la API Next.js firme o lea objetos con el cliente admin.
--
-- 2) authenticated (admin / cobrador en `public.perfiles`)
--    Si en algún flujo el navegador usa el JWT del usuario contra Storage,
--    esta política permite SELECT además de la lectura `TO public` (si existe).
--
-- Ajusta `public.perfiles` si tu tabla o columnas difieren.
-- ============================================================

DROP POLICY IF EXISTS "comprobantes_pagos_select_authenticated_staff" ON storage.objects;

CREATE POLICY "comprobantes_pagos_select_authenticated_staff"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'comprobantes_pagos'
  AND EXISTS (
    SELECT 1
    FROM public.perfiles p
    WHERE p.user_id = auth.uid()
      AND COALESCE(p.activo, true) = true
      AND lower(regexp_replace(trim(COALESCE(p.rol, '')), '[[:space:]]+', '_', 'g'))
          IN ('admin', 'super_admin', 'cobrador')
  )
);

-- Opcional: permitir que staff suba/actualice desde el cliente (no suele hacer falta
-- si solo sube el portal con service_role).
-- DROP POLICY IF EXISTS "comprobantes_pagos_insert_authenticated_staff" ON storage.objects;
-- CREATE POLICY "comprobantes_pagos_insert_authenticated_staff"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (
--   bucket_id = 'comprobantes_pagos'
--   AND EXISTS (
--     SELECT 1 FROM public.perfiles p
--     WHERE p.user_id = auth.uid()
--     AND lower(regexp_replace(trim(COALESCE(p.rol, '')), '[[:space:]]+', '_', 'g'))
--         IN ('admin', 'super_admin', 'cobrador')
--   )
-- );
