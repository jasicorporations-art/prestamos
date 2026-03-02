-- Script SIMPLE para configurar Storage - Ejecuta este si el otro no funciona
-- Ejecutar este script en Supabase SQL Editor

-- IMPORTANTE: Este script hace el bucket completamente público (menos seguro pero más simple)
-- Solo usa esto si necesitas una solución rápida

-- Paso 1: Eliminar políticas existentes del bucket (si las hay)
DO $$ 
BEGIN
  -- Intentar eliminar políticas existentes
  DROP POLICY IF EXISTS "Permitir subida de documentos a usuarios autenticados" ON storage.objects;
  DROP POLICY IF EXISTS "Permitir lectura de documentos a usuarios autenticados" ON storage.objects;
  DROP POLICY IF EXISTS "Permitir actualización de documentos a usuarios autenticados" ON storage.objects;
  DROP POLICY IF EXISTS "Permitir eliminación de documentos a usuarios autenticados" ON storage.objects;
  DROP POLICY IF EXISTS "Permitir acceso público a documentos-dealers" ON storage.objects;
EXCEPTION
  WHEN others THEN
    -- Si hay error, continuar (las políticas pueden no existir)
    NULL;
END $$;

-- Paso 2: Crear política única que permite todo (INSERT, SELECT, UPDATE, DELETE)
CREATE POLICY "Permitir acceso completo a documentos-dealers"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'documentos-dealers')
WITH CHECK (bucket_id = 'documentos-dealers');

