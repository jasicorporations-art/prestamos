-- Anti-duplicado de envío de recibos por email (misma venta + mismo monto en 60s)
-- Ejecutar en Supabase SQL Editor si usas la deduplicación en /api/enviar-recibo-email

CREATE TABLE IF NOT EXISTS public.recibo_email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL,
  monto numeric(14, 2) NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  pago_ids text
);

CREATE INDEX IF NOT EXISTS idx_recibo_email_dedupe_lookup
  ON public.recibo_email_send_log (venta_id, monto, sent_at DESC);

COMMENT ON TABLE public.recibo_email_send_log IS
  'Registro de envíos de recibo por email para evitar duplicados en 60s (venta_id + monto).';

ALTER TABLE public.recibo_email_send_log ENABLE ROW LEVEL SECURITY;
