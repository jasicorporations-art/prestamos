-- ================================================================
-- FIX: Evitar recursión en políticas al hacer JOIN perfiles+sucursales
-- ================================================================
-- La política sucursales_select_perfil usa (SELECT app_id FROM perfiles...)
-- Cuando la app hace: perfiles?select=*,sucursal:sucursales(*)
-- se evalúa RLS de sucursales, que lee perfiles → recursión infinita.
--
-- Solución: Simplificar sucursales_select_perfil para NO usar subquery
-- a perfiles. Usar solo get_user_empresa_id() (SECURITY DEFINER bypasea RLS).
-- Para app_id: permitir sucursales con app_id NULL o que coincida (sin leer perfiles).
-- ================================================================

BEGIN;

DROP POLICY IF EXISTS "sucursales_select_perfil" ON sucursales;

-- Política simplificada: sin SELECT FROM perfiles (evita recursión)
-- Usuarios ven sucursales de su empresa. Sin filtro app_id aquí (el cliente lo aplica).
CREATE POLICY "sucursales_select_perfil"
  ON sucursales
  FOR SELECT
  TO authenticated
  USING (
    empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()
  );

COMMIT;
