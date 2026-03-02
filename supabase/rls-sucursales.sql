-- ========================================
-- RLS para tabla SUCURSALES
-- ========================================
-- Ejecutar en Supabase SQL Editor
-- Requisitos: tabla sucursales, perfiles, función get_user_empresa_id()

-- 0. Asegurar que existan las columnas empresa_id y app_id
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(255);
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS app_id TEXT;

-- 1. Habilitar RLS
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas existentes (para recrear limpias)
DROP POLICY IF EXISTS "sucursales_select_empresa_owner" ON sucursales;
DROP POLICY IF EXISTS "sucursales_select_perfil" ON sucursales;
DROP POLICY IF EXISTS "sucursales_insert_admin" ON sucursales;
DROP POLICY IF EXISTS "sucursales_update_admin" ON sucursales;
DROP POLICY IF EXISTS "sucursales_delete_admin" ON sucursales;

-- 3. Política SELECT: usuarios ven sucursales si empresa_id/compania_id coincide con su perfil
--    y app_id coincide o es NULL (legacy)
CREATE POLICY "sucursales_select_perfil"
  ON sucursales
  FOR SELECT
  TO authenticated
  USING (
    (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
    AND (
      app_id IS NULL
      OR app_id = (SELECT app_id FROM perfiles WHERE user_id = auth.uid() AND activo = true LIMIT 1)
      OR (SELECT app_id FROM perfiles WHERE user_id = auth.uid() AND activo = true LIMIT 1) IS NULL
    )
  );

-- Fallback: usuarios que crearon la empresa (flujo registro sin perfil aún)
CREATE POLICY "sucursales_select_empresa_owner"
  ON sucursales
  FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (SELECT id::text FROM empresas WHERE user_id = auth.uid())
  );

-- 4. Política INSERT: Admin o super_admin pueden crear sucursales para su empresa
-- En WITH CHECK las columnas empresa_id/compania_id se refieren a la fila que se inserta
CREATE POLICY "sucursales_insert_admin"
  ON sucursales
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles p
      WHERE p.user_id = auth.uid()
        AND p.rol IN ('Admin', 'super_admin')
        AND (p.activo = true OR p.activo IS NULL)
        AND (
          empresa_id = COALESCE(p.empresa_id, p.compania_id)
          OR compania_id = COALESCE(p.empresa_id, p.compania_id)
          OR (p.rol = 'super_admin' AND (p.empresa_id IS NULL OR p.empresa_id = 'SISTEMA'))
        )
    )
  );

-- 5. Política UPDATE: Admin o super_admin pueden actualizar sucursales de su empresa
CREATE POLICY "sucursales_update_admin"
  ON sucursales
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles p
      WHERE p.user_id = auth.uid()
        AND p.rol IN ('Admin', 'super_admin')
        AND (p.activo = true OR p.activo IS NULL)
        AND (
          sucursales.empresa_id = COALESCE(p.empresa_id, p.compania_id)
          OR sucursales.compania_id = COALESCE(p.empresa_id, p.compania_id)
          OR (p.rol = 'super_admin' AND (p.empresa_id IS NULL OR p.empresa_id = 'SISTEMA'))
        )
    )
  );

-- 6. Política DELETE: Admin o super_admin pueden desactivar (soft delete) o eliminar
CREATE POLICY "sucursales_delete_admin"
  ON sucursales
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles p
      WHERE p.user_id = auth.uid()
        AND p.rol IN ('Admin', 'super_admin')
        AND (p.activo = true OR p.activo IS NULL)
        AND (
          sucursales.empresa_id = COALESCE(p.empresa_id, p.compania_id)
          OR sucursales.compania_id = COALESCE(p.empresa_id, p.compania_id)
          OR (p.rol = 'super_admin' AND (p.empresa_id IS NULL OR p.empresa_id = 'SISTEMA'))
        )
    )
  );

-- Verificar: función get_user_empresa_id debe existir
-- Si no existe, ejecutar antes: supabase/fix-get-user-empresa-id.sql
