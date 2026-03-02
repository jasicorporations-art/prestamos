-- =====================================================
-- 1) Ver todas las empresas (para copiar nombre exacto o id)
-- =====================================================
SELECT id, nombre, email, user_id, created_at
FROM empresas
ORDER BY nombre;

-- =====================================================
-- 2) Buscar empresa por nombre parecido a "ian prestamos"
-- =====================================================
SELECT id, nombre
FROM empresas
WHERE nombre ILIKE '%ian%prestamos%'
   OR nombre ILIKE '%ian prestamos%'
   OR trim(lower(nombre)) = 'ian prestamos';

-- =====================================================
-- 3) Asignar por ID de empresa (reemplaza EMPRESA_ID_UUID con el id que salió arriba)
-- =====================================================
-- UPDATE perfiles
-- SET empresa_id = 'EMPRESA_ID_UUID'
-- WHERE user_id = '221c5636-9ac6-4db6-8a2f-a34ad69937cb';

-- =====================================================
-- 4) O asignar por nombre (insensible a mayúsculas y espacios)
-- =====================================================
UPDATE perfiles
SET empresa_id = (SELECT id FROM empresas WHERE trim(lower(nombre)) = trim(lower('ian prestamos')) LIMIT 1)
WHERE user_id = '221c5636-9ac6-4db6-8a2f-a34ad69937cb';

-- Ver resultado
SELECT p.id, p.user_id, p.nombre_completo, p.empresa_id, e.nombre AS empresa_nombre
FROM perfiles p
LEFT JOIN empresas e ON e.id = p.empresa_id
WHERE p.user_id = '221c5636-9ac6-4db6-8a2f-a34ad69937cb';
