-- Solución cuando aparece: "No se encontró perfil para tu usuario" al enviar recibo por WhatsApp
-- Reemplaza abajo TU_USER_ID (UUID de Supabase > Authentication > Users) y TU_EMAIL (el email con el que inicias sesión).

-- 1) Vincular tu usuario de Auth al perfil (si el perfil existe con ese email pero sin user_id, o tiene otro user_id)
UPDATE perfiles
SET user_id = 'TU_USER_ID'
WHERE email = 'TU_EMAIL';

-- 2) Activar WhatsApp Premium para ese usuario (IMPORTANTE: es user_id con guión bajo, no "user id")
UPDATE perfiles
SET has_whatsapp_premium = true,
    premium_until = NULL
WHERE user_id = 'TU_USER_ID';

-- Verificar (debe devolver una fila con has_whatsapp_premium = true):
-- SELECT id, user_id, email, has_whatsapp_premium, premium_until FROM perfiles WHERE user_id = 'TU_USER_ID';

-- Si el UPDATE de la línea 5 no afectó ninguna fila, no existe un perfil con ese email.
-- Entonces crea el perfil desde el usuario de Auth (descomenta y ajusta el email):
/*
INSERT INTO perfiles (user_id, email, nombre_completo, rol, activo, has_whatsapp_premium, premium_until)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email), 'vendedor', true, true, NULL
FROM auth.users
WHERE id = 'TU_USER_ID'
ON CONFLICT (user_id) DO UPDATE SET has_whatsapp_premium = true, premium_until = NULL;
*/
