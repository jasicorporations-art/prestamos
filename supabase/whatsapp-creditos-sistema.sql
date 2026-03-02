-- ========================================
-- Sistema de Créditos de Notificación WhatsApp
-- 1 crédito = 1 mensaje. Plan base: 750 créditos/mes. Extensión: 200 créditos.
-- Ejecutar en Supabase SQL Editor (requiere esquema UUID: empresas, is_super_admin)
-- ========================================

BEGIN;

-- 1) Añadir creditos_extension a whatsapp_consumo_mensual (si existe)
ALTER TABLE whatsapp_consumo_mensual ADD COLUMN IF NOT EXISTS creditos_extension INT NOT NULL DEFAULT 0;

-- 2) Cambiar whatsapp_status a 'Cupo Agotado' (valor interno; UI muestra mensaje amigable)
-- Los registros existentes con 'necesita whatsapp pro' se actualizan
UPDATE whatsapp_consumo_mensual SET whatsapp_status = 'Cupo Agotado' WHERE whatsapp_status = 'necesita whatsapp pro';

-- 3) Tabla de recargas (paquetes de extensión comprados)
CREATE TABLE IF NOT EXISTS whatsapp_recargas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  stripe_session_id TEXT,
  creditos INT NOT NULL,
  monto_usd DECIMAL(10,2) NOT NULL,
  costo_proveedor_usd DECIMAL(10,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_recargas_empresa ON whatsapp_recargas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_recargas_created ON whatsapp_recargas(created_at);

-- 4) Cola de mensajes fallidos (Sin Créditos)
CREATE TABLE IF NOT EXISTS whatsapp_cola_mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  venta_id UUID,
  pago_id UUID,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'fallido_sin_creditos',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_cola_empresa_status ON whatsapp_cola_mensajes(empresa_id, status);

-- RLS
ALTER TABLE whatsapp_recargas ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_cola_mensajes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_recargas_super_admin" ON whatsapp_recargas;
CREATE POLICY "whatsapp_recargas_super_admin" ON whatsapp_recargas FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "whatsapp_cola_super_admin" ON whatsapp_cola_mensajes;
CREATE POLICY "whatsapp_cola_super_admin" ON whatsapp_cola_mensajes FOR ALL USING (public.is_super_admin());

COMMIT;
