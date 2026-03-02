-- ========================================
-- GEOLOCALIZACIÓN: Ubicación negocio y cobros
-- ========================================
-- Ejecutar en Supabase SQL Editor

BEGIN;

-- 1. Ubicación del negocio (cliente) - para "Guardar Ubicación" y "Cómo llegar"
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS latitud_negocio DECIMAL(10, 7);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS longitud_negocio DECIMAL(10, 7);
COMMENT ON COLUMN clientes.latitud_negocio IS 'Latitud GPS del negocio/domicilio del cliente';
COMMENT ON COLUMN clientes.longitud_negocio IS 'Longitud GPS del negocio/domicilio del cliente';

-- 2. Ubicación del cobro (pagos) - dónde se hizo el movimiento
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS latitud_cobro DECIMAL(10, 7);
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS longitud_cobro DECIMAL(10, 7);
COMMENT ON COLUMN pagos.latitud_cobro IS 'Latitud GPS donde se registró el cobro (null = sin señal)';
COMMENT ON COLUMN pagos.longitud_cobro IS 'Longitud GPS donde se registró el cobro (null = sin señal)';

COMMIT;
