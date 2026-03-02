-- Crear perfiles faltantes para usuarios de ELECTRO
-- Ejecutar en Supabase SQL Editor y luego API → Reload schema

BEGIN;

-- Asegurar columnas necesarias
ALTER TABLE perfiles
ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(255);

ALTER TABLE perfiles
ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);

ALTER TABLE perfiles
ADD COLUMN IF NOT EXISTS app_id TEXT;

-- Insertar perfiles faltantes para usuarios ELECTRO
WITH usuarios_electro AS (
  SELECT
    u.id,
    u.raw_user_meta_data,
    u.created_at,
    ROW_NUMBER() OVER (ORDER BY u.created_at ASC) AS rn
  FROM auth.users u
  WHERE
    UPPER(COALESCE(u.raw_user_meta_data->>'app_allowed','')) LIKE '%ELECTRO%'
    OR UPPER(COALESCE(u.raw_user_meta_data->>'app_id','')) = 'ELECTRO'
)
INSERT INTO perfiles (
  user_id,
  nombre_completo,
  rol,
  empresa_id,
  compania_id,
  app_id,
  activo,
  created_at,
  updated_at
)
SELECT
  u.id AS user_id,
  NULLIF(TRIM(
    COALESCE(u.raw_user_meta_data->>'nombre','') || ' ' ||
    COALESCE(u.raw_user_meta_data->>'apellido','')
  ), '') AS nombre_completo,
  CASE WHEN u.rn = 1 THEN 'Admin' ELSE 'Vendedor' END AS rol,
  u.raw_user_meta_data->>'compania' AS empresa_id,
  u.raw_user_meta_data->>'compania' AS compania_id,
  COALESCE(u.raw_user_meta_data->>'app_id', 'electro') AS app_id,
  true AS activo,
  NOW() AS created_at,
  NOW() AS updated_at
FROM usuarios_electro u
LEFT JOIN perfiles p ON p.user_id = u.id
WHERE p.id IS NULL
;

COMMIT;
