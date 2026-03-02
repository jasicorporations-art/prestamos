-- ================================================================
-- POLÍTICAS DE STORAGE SEGURAS (Aislamiento por Empresa)
-- ================================================================
-- Ejecutar en Supabase SQL Editor
-- Requiere: bucket 'documentos-dealers' creado en Storage (Public: Yes)
-- Requiere: funciones is_super_admin() y get_user_empresa_id() (paso 10 del rebuild)
--
-- Estructura de rutas: {empresa_id}/{cliente_id}/{archivo}
-- Ejemplo: a1b2c3d4-.../e5f6g7h8-.../identificacion_frontal_123.webp
-- ================================================================

-- Eliminar políticas antiguas (si existen)
DROP POLICY IF EXISTS "Permitir subida de documentos a usuarios autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura de documentos a usuarios autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización de documentos a usuarios autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación de documentos a usuarios autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Lectura segmentada por empresa" ON storage.objects;
DROP POLICY IF EXISTS "Subida segmentada por empresa" ON storage.objects;
DROP POLICY IF EXISTS "Actualización segmentada por empresa" ON storage.objects;
DROP POLICY IF EXISTS "Eliminación segmentada por empresa" ON storage.objects;

-- 1. LECTURA (Select): solo archivos en carpeta de su empresa, o super_admin ve todo
CREATE POLICY "Lectura segmentada por empresa"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos-dealers'
  AND (
    public.is_super_admin()
    OR (storage.foldername(name))[1] = public.get_user_empresa_id()::text
  )
);

-- 2. SUBIDA (Insert): el archivo debe ir en carpeta que coincida con empresa_id
CREATE POLICY "Subida segmentada por empresa"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documentos-dealers'
  AND (
    public.is_super_admin()
    OR (storage.foldername(name))[1] = public.get_user_empresa_id()::text
  )
);

-- 3. ACTUALIZACIÓN (Update): solo archivos de su empresa
CREATE POLICY "Actualización segmentada por empresa"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documentos-dealers'
  AND (
    public.is_super_admin()
    OR (storage.foldername(name))[1] = public.get_user_empresa_id()::text
  )
)
WITH CHECK (
  bucket_id = 'documentos-dealers'
  AND (
    public.is_super_admin()
    OR (storage.foldername(name))[1] = public.get_user_empresa_id()::text
  )
);

-- 4. ELIMINACIÓN (Delete): solo archivos de su empresa
CREATE POLICY "Eliminación segmentada por empresa"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documentos-dealers'
  AND (
    public.is_super_admin()
    OR (storage.foldername(name))[1] = public.get_user_empresa_id()::text
  )
);

-- ================================================================
-- NOTA: La app debe subir con ruta {empresa_id}/{cliente_id}/{archivo}
-- Ejemplo: documentosService.uploadDocumento(..., path: `${empresaId}/${clienteId}/${fileName}`)
-- ================================================================
