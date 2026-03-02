-- Agrega columna whatsapp_activo a clientes para controlar envío de WhatsApp (amortización, etc.)
-- Solo se envía WhatsApp si whatsapp_activo = true y el cliente tiene teléfono válido E.164.

ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS whatsapp_activo boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN clientes.whatsapp_activo IS 'Si true, el cliente puede recibir notificaciones por WhatsApp (amortización, recordatorios).';
