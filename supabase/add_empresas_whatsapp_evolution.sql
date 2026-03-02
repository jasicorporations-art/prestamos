-- Empresas: WhatsApp Evolution ($20) - habilitación y instancia
-- Ejecutar en Supabase > SQL Editor.

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_instance text;

COMMENT ON COLUMN empresas.whatsapp_enabled IS 'True si la empresa pagó por WhatsApp Evolution ($20). Solo se envían mensajes si es true.';
COMMENT ON COLUMN empresas.whatsapp_instance IS 'Nombre de la instancia Evolution API para esta empresa (ej: empresa-{id}).';
