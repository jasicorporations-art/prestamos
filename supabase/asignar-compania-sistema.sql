-- ========================================
-- Crear empresa "Sistema" y asignarla a super admins
-- Usuarios: johnrijo6@gmail.com, admin@jasicorporations.com
-- ========================================
-- Ejecutar en Supabase SQL Editor (después de admin-johnrijo6.sql)
-- Requiere que los usuarios existan en auth.users

BEGIN;

-- 1) Crear empresa "Sistema" si no existe (user_id del primer super admin como propietario)
INSERT INTO empresas (id, nombre, user_id, email, activo)
SELECT 
  gen_random_uuid(),
  'Sistema',
  COALESCE(
    (SELECT id FROM auth.users WHERE email = 'johnrijo6@gmail.com' LIMIT 1),
    (SELECT id FROM auth.users WHERE email = 'admin@jasicorporations.com' LIMIT 1)
  ),
  'admin@jasicorporations.com',
  true
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com'))
  AND NOT EXISTS (SELECT 1 FROM empresas WHERE LOWER(nombre) = 'sistema');

-- 2) Si ya existía "Sistema" con otro id, usar el existente; si no, el insert anterior creó uno
-- Obtener el id de la empresa Sistema
DO $$
DECLARE
  v_empresa_id UUID;
BEGIN
  SELECT id INTO v_empresa_id FROM empresas WHERE LOWER(nombre) = 'sistema' LIMIT 1;
  
  IF v_empresa_id IS NOT NULL THEN
    -- Asignar empresa_id a ambos super admins
    UPDATE perfiles
    SET empresa_id = v_empresa_id
    WHERE user_id IN (
      SELECT id FROM auth.users 
      WHERE email IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com')
    );
  END IF;
END $$;

COMMIT;

-- Verificar resultado (ejecutar aparte si quieres comprobar):
-- SELECT u.email, p.rol, e.nombre as empresa
-- FROM auth.users u
-- LEFT JOIN perfiles p ON p.user_id = u.id
-- LEFT JOIN empresas e ON e.id = p.empresa_id
-- WHERE u.email IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com');
