-- Activar WhatsApp Evolution para josemanuel@gmail.com (pruebas).
-- Ejecutar en Supabase > SQL Editor.

-- 1) Asegurar columnas (por si no se corriaron las migraciones)
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS has_evolution_whatsapp boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_until_evolution date,
  ADD COLUMN IF NOT EXISTS has_whatsapp_premium boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_until date;

-- 2) Activar Evolution + WhatsApp Premium (para ver la página Recordatorios y opciones Evolution/QR)
UPDATE perfiles p
SET has_evolution_whatsapp = true,
    premium_until_evolution = NULL,
    has_whatsapp_premium = true,
    premium_until = NULL
FROM auth.users u
WHERE p.user_id = u.id
  AND u.email = 'josemanuel@gmail.com';

-- 3) Verificar (has_evolution_whatsapp y has_whatsapp_premium en true)
SELECT p.id, p.user_id, p.nombre_completo, p.rol,
       p.has_whatsapp_premium, p.premium_until,
       p.has_evolution_whatsapp, p.premium_until_evolution,
       p.empresa_id
FROM perfiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'josemanuel@gmail.com';
