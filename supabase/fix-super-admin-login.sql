-- ============================================================
-- FIX: Super Admin no puede entrar - diagnóstico y corrección
-- ============================================================
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1) Verificar que los usuarios existen y tienen perfil
SELECT 
  u.id,
  u.email,
  p.id AS perfil_id,
  p.rol,
  p.activo,
  p.app_id,
  p.empresa_id,
  p.compania_id
FROM auth.users u
LEFT JOIN perfiles p ON p.user_id = u.id
WHERE LOWER(u.email) IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com');

-- 2) Crear perfiles si no existen
INSERT INTO perfiles (user_id, rol, activo, nombre_completo, empresa_id, compania_id, app_id, terminos_aceptados, privacidad_aceptada, fecha_aceptacion, privacidad_fecha_aceptacion)
SELECT id, 'super_admin', true, 'Super Administrador', NULL, NULL, NULL, true, true, NOW(), NOW()
FROM auth.users
WHERE LOWER(email) IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com')
  AND id NOT IN (SELECT user_id FROM perfiles);

-- 3) Actualizar perfiles existentes: rol super_admin, app_id NULL (acceso a todas las apps)
UPDATE perfiles
SET 
  rol = 'super_admin',
  activo = true,
  app_id = NULL,
  empresa_id = NULL,
  compania_id = NULL,
  terminos_aceptados = true,
  privacidad_aceptada = true,
  fecha_aceptacion = COALESCE(fecha_aceptacion, NOW()),
  privacidad_fecha_aceptacion = COALESCE(privacidad_fecha_aceptacion, NOW())
WHERE user_id IN (
  SELECT id FROM auth.users WHERE LOWER(email) IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com')
);

-- 4) Asegurar política para leer propio perfil
DROP POLICY IF EXISTS "perfiles_select_own" ON perfiles;
CREATE POLICY "perfiles_select_own"
  ON perfiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5) Verificación final
SELECT u.email, p.rol, p.activo, p.app_id, 
  CASE WHEN p.app_id IS NULL THEN 'OK (acceso todas apps)' ELSE 'Revisar' END AS estado
FROM auth.users u
JOIN perfiles p ON p.user_id = u.id
WHERE LOWER(u.email) IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com');
