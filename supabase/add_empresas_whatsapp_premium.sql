-- Empresas: plan premium WhatsApp (solo con esto = true se puede generar QR)
-- Ejecutar en Supabase > SQL Editor.

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS whatsapp_premium boolean DEFAULT false;

COMMENT ON COLUMN empresas.whatsapp_premium IS 'True si la empresa tiene plan premium WhatsApp. Solo entonces se permite generar el código QR en /dashboard/whatsapp-connections.';
