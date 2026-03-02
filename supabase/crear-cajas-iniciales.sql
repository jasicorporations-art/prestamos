-- Crear una caja inicial por sucursal (por fecha actual)
-- Ejecutar en Supabase SQL Editor y luego API → Reload schema

BEGIN;

-- Insertar cajas para sucursales que aún no tienen caja hoy
INSERT INTO cajas (
  sucursal_id,
  usuario_id,
  monto_apertura,
  monto_cierre_esperado,
  estado,
  fecha,
  created_at,
  updated_at,
  empresa_id,
  app_id
)
SELECT
  s.id AS sucursal_id,
  COALESCE(
    (SELECT p.user_id FROM perfiles p WHERE p.activo = true AND p.empresa_id = s.empresa_id ORDER BY p.created_at ASC LIMIT 1),
    (SELECT p.user_id FROM perfiles p WHERE p.empresa_id = s.empresa_id ORDER BY p.created_at ASC LIMIT 1),
    (SELECT p.user_id FROM perfiles p WHERE p.activo = true ORDER BY p.created_at ASC LIMIT 1),
    (SELECT p.user_id FROM perfiles p ORDER BY p.created_at ASC LIMIT 1)
  ) AS usuario_id,
  0 AS monto_apertura,
  0 AS monto_cierre_esperado,
  'Cerrada' AS estado,
  CURRENT_DATE AS fecha,
  NOW() AS created_at,
  NOW() AS updated_at,
  s.empresa_id,
  'electro' AS app_id
FROM sucursales s
LEFT JOIN cajas c
  ON c.sucursal_id = s.id
  AND c.fecha = CURRENT_DATE
WHERE c.id IS NULL
  AND (s.app_id = 'electro' OR s.app_id IS NULL);

COMMIT;
