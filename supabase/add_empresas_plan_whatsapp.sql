-- Plan WhatsApp ($20/mes) - control de acceso a QR y notificaciones automáticas
-- Ejecutar en Supabase > SQL Editor.

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS plan_whatsapp boolean DEFAULT false;

COMMENT ON COLUMN empresas.plan_whatsapp IS 'True si la empresa pagó el plan ($20/mes). Habilita el botón Generar QR en /dashboard/whatsapp-connections. Al marcar manualmente o tras pago Stripe: UPDATE empresas SET plan_whatsapp = true [, whatsapp_enabled = true] WHERE id = ?;';

-- Ejemplo para activar manualmente tras pago: UPDATE empresas SET plan_whatsapp = true, whatsapp_enabled = true WHERE id = 'uuid-empresa';
