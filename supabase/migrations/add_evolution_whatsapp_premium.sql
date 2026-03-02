-- WhatsApp Evolution como producto de pago ($30): activación por empresa/usuario.
-- Ejecutar en Supabase > SQL Editor si la tabla perfiles no tiene estas columnas.

ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS has_evolution_whatsapp boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_until_evolution date;

COMMENT ON COLUMN perfiles.has_evolution_whatsapp IS 'True si la empresa/usuario pagó por usar Evolution API para WhatsApp.';
COMMENT ON COLUMN perfiles.premium_until_evolution IS 'Fecha hasta la cual tiene vigente Evolution WhatsApp (NULL = vitalicio).';
