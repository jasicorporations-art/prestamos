-- Fix: Permitir ver sucursal principal al registrarse (antes de tener perfil)
-- El usuario no tiene perfil aún cuando consulta sucursales tras crear empresa,
-- por eso get_user_empresa_id() devuelve NULL y RLS bloqueaba el SELECT.
-- Ejecutar en Supabase SQL Editor

-- Política: Usuario puede ver sucursales de empresas que él creó (user_id en empresas)
-- Necesaria para el flujo de registro: crear empresa → trigger crea sucursal → consultar sucursal → crear perfil
DROP POLICY IF EXISTS "sucursales_select_empresa_owner" ON sucursales;
CREATE POLICY "sucursales_select_empresa_owner"
  ON sucursales
  FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT id::text FROM empresas WHERE user_id = auth.uid()
    )
  );
