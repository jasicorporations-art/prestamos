-- Permitir que Admin cree y actualice perfiles de usuarios de su empresa
-- Sin esto, el upsert en crearUsuario falla por RLS y el perfil queda con el rol del trigger
-- Ejecutar en Supabase SQL Editor

DROP POLICY IF EXISTS "perfiles_insert_admin_empresa" ON perfiles;
DROP POLICY IF EXISTS "perfiles_update_admin_empresa" ON perfiles;

-- Política: Admin puede INSERTAR perfiles para usuarios de su empresa
-- (super_admin con empresa NULL puede crear en cualquier empresa)
CREATE POLICY "perfiles_insert_admin_empresa"
  ON perfiles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles p
      WHERE p.user_id = auth.uid()
        AND p.rol IN ('Admin', 'super_admin')
        AND (
          (p.rol = 'super_admin' AND p.empresa_id IS NULL)
          OR (p.empresa_id = perfiles.empresa_id OR p.compania_id = perfiles.empresa_id OR p.empresa_id = perfiles.compania_id)
        )
    )
  );

-- Política: Admin puede ACTUALIZAR perfiles de usuarios de su empresa
CREATE POLICY "perfiles_update_admin_empresa"
  ON perfiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles p
      WHERE p.user_id = auth.uid()
        AND p.rol IN ('Admin', 'super_admin')
        AND (
          (p.rol = 'super_admin' AND p.empresa_id IS NULL)
          OR (p.empresa_id = perfiles.empresa_id OR p.compania_id = perfiles.empresa_id OR p.empresa_id = perfiles.compania_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles p
      WHERE p.user_id = auth.uid()
        AND p.rol IN ('Admin', 'super_admin')
        AND (
          (p.rol = 'super_admin' AND p.empresa_id IS NULL)
          OR (p.empresa_id = perfiles.empresa_id OR p.compania_id = perfiles.empresa_id OR p.empresa_id = perfiles.compania_id)
        )
    )
  );
