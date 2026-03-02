-- ========================================
-- Sistema de Cupo por Saldo WhatsApp ($30 USD / 750 mensajes)
-- Ejecutar en Supabase SQL Editor
-- ========================================

BEGIN;

-- 1) Tabla de consumo mensual por empresa
CREATE TABLE IF NOT EXISTS whatsapp_consumo_mensual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id TEXT NOT NULL,
  periodo DATE NOT NULL,
  mensajes_enviados INT NOT NULL DEFAULT 0,
  whatsapp_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, periodo)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_consumo_empresa_periodo 
  ON whatsapp_consumo_mensual(empresa_id, periodo);

COMMENT ON TABLE whatsapp_consumo_mensual IS 'Consumo de mensajes WhatsApp por empresa y mes. 750 mensajes/mes, $0.025/mensaje, $15 ganancia fija.';

-- 2) RLS: solo super_admin puede leer
ALTER TABLE whatsapp_consumo_mensual ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_consumo_super_admin" ON whatsapp_consumo_mensual;
CREATE POLICY "whatsapp_consumo_super_admin"
  ON whatsapp_consumo_mensual FOR ALL
  USING (public.is_super_admin());

-- Nota: service_role de Supabase bypasea RLS, las APIs pueden insertar/actualizar sin política.

COMMIT;
