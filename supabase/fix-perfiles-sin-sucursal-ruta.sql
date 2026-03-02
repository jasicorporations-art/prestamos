-- Asignar sucursal y ruta a perfiles que no tienen
-- Ejecutar en Supabase SQL Editor
-- Usa tabla empresas para matchear: perfiles.empresa_id puede ser UUID o nombre de empresa

-- 0) Crear sucursal y ruta para empresas que no tienen (por si el trigger no corrió)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);

INSERT INTO sucursales (nombre, direccion, telefono, empresa_id, activa)
SELECT 'Principal', COALESCE(trim(e.direccion), ''), COALESCE(trim(e.telefono), ''), e.id::text, true
FROM empresas e
WHERE NOT EXISTS (SELECT 1 FROM sucursales s WHERE s.empresa_id = e.id::text);

INSERT INTO rutas (sucursal_id, nombre, descripcion, activa)
SELECT s.id, 'Ruta A', 'Ruta de cobro creada automáticamente.', true
FROM sucursales s
WHERE NOT EXISTS (SELECT 1 FROM rutas r WHERE r.sucursal_id = s.id);

-- 1) Ver perfiles sin sucursal o sin ruta
SELECT p.id, p.user_id, p.nombre_completo, p.empresa_id, p.compania_id, p.sucursal_id, p.ruta_id
FROM perfiles p
WHERE p.sucursal_id IS NULL OR p.ruta_id IS NULL;

-- 2) Actualizar: asignar sucursal principal y Ruta A (vía tabla empresas para matchear UUID o nombre)
UPDATE perfiles p
SET
  sucursal_id = COALESCE(p.sucursal_id, sub.sucursal_id),
  ruta_id = COALESCE(p.ruta_id, sub.ruta_id),
  empresa_id = sub.empresa_id
FROM (
  SELECT DISTINCT ON (p2.id)
    p2.id AS perfil_id,
    s.id AS sucursal_id,
    r.id AS ruta_id,
    e.id::text AS empresa_id
  FROM perfiles p2
  INNER JOIN empresas e ON (
    e.id::text = COALESCE(trim(p2.empresa_id), trim(p2.compania_id))
    OR e.nombre = COALESCE(trim(p2.empresa_id), trim(p2.compania_id))
  )
  INNER JOIN sucursales s ON s.empresa_id = e.id::text
  LEFT JOIN rutas r ON r.sucursal_id = s.id
  WHERE (p2.sucursal_id IS NULL OR p2.ruta_id IS NULL)
    AND COALESCE(trim(p2.empresa_id), trim(p2.compania_id)) IS NOT NULL
    AND trim(COALESCE(p2.empresa_id, p2.compania_id)) != ''
  ORDER BY p2.id, s.created_at ASC NULLS LAST, r.created_at ASC NULLS LAST
) AS sub
WHERE p.id = sub.perfil_id
  AND sub.sucursal_id IS NOT NULL;

-- 3) Perfiles con empresa_id/compania_id vacío: intentar matchear por user_id (empresa.user_id)
UPDATE perfiles p
SET
  sucursal_id = COALESCE(p.sucursal_id, sub.sucursal_id),
  ruta_id = COALESCE(p.ruta_id, sub.ruta_id),
  empresa_id = COALESCE(NULLIF(trim(p.empresa_id), ''), sub.empresa_id)
FROM (
  SELECT DISTINCT ON (p2.id)
    p2.id AS perfil_id,
    s.id AS sucursal_id,
    r.id AS ruta_id,
    e.id::text AS empresa_id
  FROM perfiles p2
  INNER JOIN empresas e ON e.user_id = p2.user_id
  INNER JOIN sucursales s ON s.empresa_id = e.id::text
  LEFT JOIN rutas r ON r.sucursal_id = s.id
  WHERE (p2.sucursal_id IS NULL OR p2.ruta_id IS NULL)
    AND (COALESCE(trim(p2.empresa_id), trim(p2.compania_id)) IS NULL OR trim(COALESCE(p2.empresa_id, p2.compania_id)) = '')
  ORDER BY p2.id, s.created_at ASC NULLS LAST, r.created_at ASC NULLS LAST
) AS sub
WHERE p.id = sub.perfil_id
  AND sub.sucursal_id IS NOT NULL;

-- 4) Verificar resultado
SELECT p.id, p.nombre_completo, p.empresa_id, p.sucursal_id, p.ruta_id,
       s.nombre AS sucursal_nombre, r.nombre AS ruta_nombre
FROM perfiles p
LEFT JOIN sucursales s ON s.id = p.sucursal_id
LEFT JOIN rutas r ON r.id = p.ruta_id
ORDER BY p.created_at DESC
LIMIT 30;