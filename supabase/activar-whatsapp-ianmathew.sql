-- Activar WhatsApp Premium + Evolution para ianmathew@gmail.com (pruebas).
-- Ejecutar en Supabase > SQL Editor.

-- 1) Asegurar que existan las columnas de Evolution (por si no se corrió la migración)
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS has_evolution_whatsapp boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_until_evolution date;

-- 2) Activar WhatsApp Premium (Twilio/Recordatorios) y Evolution para este usuario
UPDATE perfiles
SET has_whatsapp_premium = true,
    premium_until = NULL,
    has_evolution_whatsapp = true,
    premium_until_evolution = NULL
WHERE email = 'ianmathew@gmail.com';

-- Si el perfil se identifica por user_id (y no tienes email en perfiles), usa esto en su lugar:
-- UPDATE perfiles
-- SET has_whatsapp_premium = true,
--     premium_until = NULL,
--     has_evolution_whatsapp = true,
--     premium_until_evolution = NULL
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ianmathew@gmail.com');

-- 3) Si no se actualizó ninguna fila, intentar por user_id desde auth.users
UPDATE perfiles p
SET has_whatsapp_premium = true,
    premium_until = NULL,
    has_evolution_whatsapp = true,
    premium_until_evolution = NULL
FROM auth.users u
WHERE p.user_id = u.id
  AND u.email = 'ianmathew@gmail.com';

-- Verificar (debe mostrar has_whatsapp_premium y has_evolution_whatsapp en true):
SELECT id, user_id, email, nombre_completo, rol,
       has_whatsapp_premium, premium_until,
       has_evolution_whatsapp, premium_until_evolution,
       empresa_id
FROM perfiles
WHERE email = 'ianmathew@gmail.com'
   OR user_id = (SELECT id FROM auth.users WHERE email = 'ianmathew@gmail.com');
