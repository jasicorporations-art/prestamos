-- Agregar campos de suscripción a los usuarios de Supabase Auth
-- Nota: Estos campos se guardan en user_metadata, no en una tabla separada
-- Este script es solo para referencia/documentación

-- Los campos planType e isActive se guardan automáticamente en user_metadata
-- cuando se actualiza el usuario mediante:
-- supabase.auth.updateUser({ data: { planType: 'BRONCE', isActive: true } })

-- Para verificar los usuarios y sus planes, puedes ejecutar:
-- SELECT 
--   id,
--   email,
--   raw_user_meta_data->>'planType' as plan_type,
--   raw_user_meta_data->>'isActive' as is_active
-- FROM auth.users;

-- Para actualizar un usuario manualmente (desde Supabase Dashboard):
-- 1. Ve a Authentication > Users
-- 2. Selecciona el usuario
-- 3. En "User Metadata", agrega:
--    {
--      "planType": "BRONCE",
--      "isActive": true
--    }

-- O ejecuta este script para actualizar todos los usuarios existentes a plan BRONCE:
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'planType', COALESCE(raw_user_meta_data->>'planType', 'BRONCE'),
    'isActive', COALESCE((raw_user_meta_data->>'isActive')::boolean, true)
  )
WHERE raw_user_meta_data->>'planType' IS NULL;

