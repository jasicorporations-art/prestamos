-- Función para verificar si una empresa ya está registrada
-- Busca en la tabla empresas y en user_metadata de auth.users
-- Ejecutar este script en Supabase SQL Editor

CREATE OR REPLACE FUNCTION verificar_empresa_disponible(nombre_empresa TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  empresa_existe BOOLEAN := FALSE;
  nombre_normalizado TEXT;
BEGIN
  -- Normalizar el nombre (trim, lowercase)
  nombre_normalizado := LOWER(TRIM(nombre_empresa));
  
  -- Verificar en tabla empresas si existe
  SELECT EXISTS(
    SELECT 1 
    FROM empresas 
    WHERE LOWER(TRIM(nombre)) = nombre_normalizado
  ) INTO empresa_existe;
  
  -- Si ya existe en tabla empresas, retornar false
  IF empresa_existe THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar en user_metadata de auth.users
  SELECT EXISTS(
    SELECT 1 
    FROM auth.users 
    WHERE LOWER(TRIM((raw_user_meta_data->>'compania')::TEXT)) = nombre_normalizado
  ) INTO empresa_existe;
  
  -- Retornar false si existe, true si no existe
  RETURN NOT empresa_existe;
END;
$$;

-- Comentario para documentación
COMMENT ON FUNCTION verificar_empresa_disponible IS 'Verifica si una empresa ya está registrada en la tabla empresas o en user_metadata de usuarios. Retorna TRUE si está disponible, FALSE si ya existe.';

-- Dar permisos para que los usuarios autenticados puedan usar esta función
GRANT EXECUTE ON FUNCTION verificar_empresa_disponible TO authenticated;

