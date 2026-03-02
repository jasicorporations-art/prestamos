-- Activar WhatsApp Premium para un usuario (por user_id o por email)
-- Ejecutar en Supabase SQL Editor. Reemplaza 'TU_USER_ID' o el email según el caso.

-- Opción 1: Por user_id (cópialo desde Authentication > Users en Supabase - es un UUID, NO el email)
UPDATE perfiles
SET has_whatsapp_premium = true,
    premium_until = NULL  -- NULL = vitalicio; o usa una fecha ej. '2026-12-31'
WHERE user_id = 'TU_USER_ID_AQUI';

-- Opción 2: Por email del usuario (si no tienes el user_id)
-- UPDATE perfiles
-- SET has_whatsapp_premium = true,
--     premium_until = NULL
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'tu@email.com' LIMIT 1);

-- Verificar: debe devolver al menos una fila con has_whatsapp_premium = true
-- SELECT id, user_id, has_whatsapp_premium, premium_until, empresa_id, compania_id FROM perfiles WHERE user_id = 'TU_USER_ID';
