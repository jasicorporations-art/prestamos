-- Hace que get_user_empresa_id() devuelva empresa o compañía del perfil del usuario.
-- Así, admin/historial puede mostrar logs a vendedores y admins que tengan solo compania_id.
-- Ejecutar en Supabase SQL Editor.

CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS VARCHAR(255)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_val VARCHAR(255);
BEGIN
  SELECT COALESCE(p.empresa_id, p.compania_id) INTO v_val
  FROM perfiles p
  WHERE p.user_id = auth.uid() AND (p.activo = true OR p.activo IS NULL)
  LIMIT 1;
  RETURN v_val;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_empresa_id() TO authenticated;
