-- Campos para WhatsApp Premium en perfiles
-- Ejecutar en Supabase SQL Editor

ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS has_whatsapp_premium BOOLEAN DEFAULT false;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS premium_until DATE;

COMMENT ON COLUMN perfiles.has_whatsapp_premium IS 'Si true, el usuario tiene activo el módulo de WhatsApp automático ($30/mes)';
COMMENT ON COLUMN perfiles.premium_until IS 'Fecha hasta la cual es válido el WhatsApp Premium (se extiende 30 días por cada pago)';

CREATE INDEX IF NOT EXISTS idx_perfiles_has_whatsapp_premium ON perfiles(has_whatsapp_premium);
CREATE INDEX IF NOT EXISTS idx_perfiles_premium_until ON perfiles(premium_until);
