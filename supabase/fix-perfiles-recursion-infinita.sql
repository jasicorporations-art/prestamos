-- ================================================================
-- FIX: Recursión infinita en políticas de perfiles
-- ================================================================
-- Error: "infinite recursion detected in policy for relation perfiles"
--
-- Causa: perfiles_select_empresa usa get_user_empresa_id(), que lee
-- de perfiles → al evaluar la política se vuelve a leer perfiles → recursión.
--
-- Solución: Eliminar políticas que referencian get_user_empresa_id()
-- y usar solo user_id = auth.uid() (no causa recursión).
-- ================================================================

BEGIN;

-- Eliminar TODAS las políticas de perfiles que puedan causar recursión
DROP POLICY IF EXISTS "perfiles_select_empresa" ON perfiles;
DROP POLICY IF EXISTS "perfiles_insert_empresa" ON perfiles;
DROP POLICY IF EXISTS "perfiles_update_empresa" ON perfiles;
DROP POLICY IF EXISTS "perfiles_delete_empresa" ON perfiles;
DROP POLICY IF EXISTS "perfiles_select_own" ON perfiles;
DROP POLICY IF EXISTS "perfiles_select_super_admin" ON perfiles;
DROP POLICY IF EXISTS "perfiles_insert_own" ON perfiles;
DROP POLICY IF EXISTS "perfiles_update_own" ON perfiles;

-- Solo políticas que NO referencian perfiles ni get_user_empresa_id()
-- Usuario lee su propio perfil (necesario para login)
CREATE POLICY "perfiles_select_own"
  ON perfiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Usuario puede insertar su propio perfil (registro)
CREATE POLICY "perfiles_insert_own"
  ON perfiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Usuario puede actualizar su propio perfil
CREATE POLICY "perfiles_update_own"
  ON perfiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- No usar políticas que referencien get_user_empresa_id() ni is_admin_or_super_admin()
-- en perfiles: ambas leen perfiles y pueden causar recursión según el rol del owner.
-- Con perfiles_select_own/insert/update cada usuario gestiona solo su perfil (suficiente para login).

COMMIT;
