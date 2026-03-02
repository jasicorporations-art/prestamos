-- ========================================
-- SISTEMA DE ABONOS PARCIALES Y MORA
-- ========================================
-- Tarea 1: Mora abonada para rastrear pagos de mora
-- Tarea 2: Campos para abonos parciales con autorización admin

BEGIN;

-- 1. Mora abonada en ventas (para restar del total de cargos al calcular)
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS mora_abonada DECIMAL(12,2) DEFAULT 0;
COMMENT ON COLUMN ventas.mora_abonada IS 'Total de mora ya pagada por el cliente (se resta al calcular cargos pendientes)';

-- 2. Campos en pagos para abonos parciales
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS es_abono_parcial BOOLEAN DEFAULT false;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS autorizado_por_admin BOOLEAN DEFAULT false;
COMMENT ON COLUMN pagos.es_abono_parcial IS 'True si el pago no cubre la cuota completa';
COMMENT ON COLUMN pagos.autorizado_por_admin IS 'True si un admin autorizó este abono parcial';

-- 3. Índice para consultas de abonos por venta
CREATE INDEX IF NOT EXISTS idx_pagos_es_abono_parcial ON pagos(venta_id) WHERE es_abono_parcial = true;

COMMIT;
