-- Función para obtener todas las compañías únicas de los usuarios registrados
-- Ejecutar este script en Supabase SQL Editor

CREATE OR REPLACE FUNCTION obtener_companias_disponibles()
RETURNS TABLE(nombre TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
    COALESCE(
      (raw_user_meta_data->>'compania')::TEXT,
      ''
    ) AS nombre
  FROM auth.users
  WHERE (raw_user_meta_data->>'compania') IS NOT NULL
    AND (raw_user_meta_data->>'compania') != ''
  ORDER BY nombre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos para que los usuarios anónimos puedan ejecutar esta función
GRANT EXECUTE ON FUNCTION obtener_companias_disponibles() TO anon;
GRANT EXECUTE ON FUNCTION obtener_companias_disponibles() TO authenticated;

