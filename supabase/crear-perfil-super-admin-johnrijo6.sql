-- ========================================
-- Crear perfil Super Admin para johnrijo6@gmail.com
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor)
-- ========================================
-- Este script:
-- 1. Añade política RLS para que usuarios puedan leer su propio perfil (user_id = auth.uid())
-- 2. Crea el perfil super_admin si no existe (usa service role, bypass RLS)

BEGIN;

-- 0) Plan Infinito en auth.users (user_metadata)
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
  'planType', 'INFINITO',
  'isActive', true,
  'isLifetime', true,
  'expires_at', '2125-01-01',
  'compania', 'SISTEMA'
)
WHERE email = 'johnrijo6@gmail.com';

-- 1) Política: permitir que cada usuario lea su propio perfil (evita bloqueos por get_user_empresa_id cuando no hay perfil aún)
DROP POLICY IF EXISTS "perfiles_select_own" ON perfiles;
CREATE POLICY "perfiles_select_own"
  ON perfiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2) Crear perfil super_admin para johnrijo6@gmail.com si no existe
INSERT INTO perfiles (user_id, nombre_completo, rol, empresa_id, compania_id, activo, has_whatsapp_premium, premium_until)
SELECT 
  u.id,
  COALESCE(NULLIF(TRIM((u.raw_user_meta_data->>'nombre') || ' ' || (u.raw_user_meta_data->>'apellido')), ''), 'Super Admin'),
  'super_admin',
  'SISTEMA',
  'SISTEMA',
  true,
  true,
  CURRENT_DATE + INTERVAL '365 days'
FROM auth.users u
WHERE u.email = 'johnrijo6@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = u.id);

-- 3) Si ya existía un perfil, actualizarlo a super_admin
UPDATE perfiles
SET 
  rol = 'super_admin',
  has_whatsapp_premium = true,
  premium_until = CURRENT_DATE + INTERVAL '365 days',
  empresa_id = COALESCE(empresa_id, 'SISTEMA'),
  compania_id = COALESCE(compania_id, 'SISTEMA')
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'johnrijo6@gmail.com');

COMMIT;

-- Verificar (ejecutar aparte si quieres comprobar):
-- SELECT u.email, p.rol, p.empresa_id, p.activo
-- FROM auth.users u
-- LEFT JOIN perfiles p ON p.user_id = u.id
-- WHERE u.email = 'johnrijo6@gmail.com';
