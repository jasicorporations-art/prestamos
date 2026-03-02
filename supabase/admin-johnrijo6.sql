-- ========================================
-- Super Admin + Plan Infinito + WhatsApp Premium
-- Usuarios: johnrijo6@gmail.com, admin@jasicorporations.com
-- ========================================
-- Ejecutar en Supabase SQL Editor
-- Requiere permisos sobre auth.users

BEGIN;

-- 1) Plan Infinito en auth.users (user_metadata)
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
  'planType', 'INFINITO',
  'isActive', true,
  'isLifetime', true,
  'expires_at', '2125-01-01'
)
WHERE email IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com');

-- 2) Super Admin + WhatsApp Premium en perfiles
UPDATE perfiles
SET 
  rol = 'super_admin',
  has_whatsapp_premium = true,
  premium_until = CURRENT_DATE + INTERVAL '365 days'
WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com'));

-- Crear perfil si no existe (empresa_id NULL para super_admin - esquema UUID)
INSERT INTO perfiles (user_id, nombre_completo, email, rol, empresa_id, activo, has_whatsapp_premium, premium_until)
SELECT 
  u.id,
  COALESCE(NULLIF(TRIM((u.raw_user_meta_data->>'nombre') || ' ' || (u.raw_user_meta_data->>'apellido')), ''), 'Super Admin'),
  u.email,
  'super_admin',
  NULL,
  true,
  true,
  CURRENT_DATE + INTERVAL '365 days'
FROM auth.users u
WHERE u.email IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com')
  AND NOT EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = u.id);

COMMIT;

-- Verificar resultado (ejecutar aparte si quieres comprobar):
-- SELECT u.email, u.raw_user_meta_data->>'planType' as plan, p.rol, p.has_whatsapp_premium, p.premium_until
-- FROM auth.users u
-- LEFT JOIN perfiles p ON p.user_id = u.id
-- WHERE u.email IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com');
