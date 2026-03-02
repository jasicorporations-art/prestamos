-- RLS y aislamiento de pagos por empresa
-- Ejecutar en Supabase SQL Editor y luego API → Reload schema

BEGIN;

-- 1) Asegurar columnas de empresa/app
ALTER TABLE pagos
ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(255);

ALTER TABLE pagos
ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);

ALTER TABLE pagos
ADD COLUMN IF NOT EXISTS app_id TEXT;

-- 2) Backfill usando ventas
UPDATE pagos p
SET empresa_id = v.empresa_id
FROM ventas v
WHERE p.venta_id = v.id AND p.empresa_id IS NULL;

UPDATE pagos p
SET compania_id = v.compania_id
FROM ventas v
WHERE p.venta_id = v.id AND p.compania_id IS NULL;

UPDATE pagos p
SET app_id = v.app_id
FROM ventas v
WHERE p.venta_id = v.id AND p.app_id IS NULL;

-- Forzar app_id electro si aún falta
UPDATE pagos
SET app_id = 'electro'
WHERE app_id IS NULL;

-- 3) Función para obtener empresa del usuario actual
CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS VARCHAR(255)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id VARCHAR(255);
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM perfiles
  WHERE user_id = auth.uid() AND activo = true
  LIMIT 1;
  RETURN v_empresa_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_empresa_id() TO authenticated;

-- 4) RLS para pagos
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pagos_select_empresa" ON pagos;
DROP POLICY IF EXISTS "pagos_insert_empresa" ON pagos;
DROP POLICY IF EXISTS "pagos_update_empresa" ON pagos;
DROP POLICY IF EXISTS "pagos_delete_empresa" ON pagos;

CREATE POLICY "pagos_select_empresa"
  ON pagos
  FOR SELECT
  TO authenticated
  USING (
    (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND app_id = 'electro'
  );

CREATE POLICY "pagos_insert_empresa"
  ON pagos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND app_id = 'electro'
  );

CREATE POLICY "pagos_update_empresa"
  ON pagos
  FOR UPDATE
  TO authenticated
  USING (
    (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND app_id = 'electro'
  )
  WITH CHECK (
    (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND app_id = 'electro'
  );

CREATE POLICY "pagos_delete_empresa"
  ON pagos
  FOR DELETE
  TO authenticated
  USING (
    (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND app_id = 'electro'
  );

COMMIT;
-- Script para arreglar problemas de RLS en la tabla pagos
-- Ejecutar este script en Supabase SQL Editor

-- 1. Verificar estado actual de RLS
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'pagos';

-- 2. Ver políticas existentes
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'pagos';

-- 3. Deshabilitar RLS temporalmente para permitir inserciones
-- (Solo si no hay políticas que permitan INSERT)
ALTER TABLE pagos DISABLE ROW LEVEL SECURITY;

-- 4. Alternativa: Si prefieres mantener RLS habilitado, crear políticas permisivas
-- Descomentar estas líneas si quieres usar políticas en lugar de deshabilitar RLS:

-- ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

-- -- Política para permitir SELECT a usuarios autenticados de la misma empresa
-- CREATE POLICY "pagos_select_policy" ON pagos
--   FOR SELECT
--   TO authenticated
--   USING (
--     empresa_id IN (
--       SELECT empresa_id FROM perfiles 
--       WHERE user_id = auth.uid() AND activo = true
--     )
--     OR empresa_id IS NULL
--   );

-- -- Política para permitir INSERT a usuarios autenticados
-- CREATE POLICY "pagos_insert_policy" ON pagos
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     empresa_id IN (
--       SELECT empresa_id FROM perfiles 
--       WHERE user_id = auth.uid() AND activo = true
--     )
--     OR empresa_id IS NULL
--   );

-- -- Política para permitir UPDATE a usuarios autenticados de la misma empresa
-- CREATE POLICY "pagos_update_policy" ON pagos
--   FOR UPDATE
--   TO authenticated
--   USING (
--     empresa_id IN (
--       SELECT empresa_id FROM perfiles 
--       WHERE user_id = auth.uid() AND activo = true
--     )
--   )
--   WITH CHECK (
--     empresa_id IN (
--       SELECT empresa_id FROM perfiles 
--       WHERE user_id = auth.uid() AND activo = true
--     )
--   );

-- -- Política para permitir DELETE a usuarios autenticados de la misma empresa
-- CREATE POLICY "pagos_delete_policy" ON pagos
--   FOR DELETE
--   TO authenticated
--   USING (
--     empresa_id IN (
--       SELECT empresa_id FROM perfiles 
--       WHERE user_id = auth.uid() AND activo = true
--     )
--   );

-- 5. Verificar que RLS está deshabilitado
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'pagos';

