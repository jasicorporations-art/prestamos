-- ================================================================
-- Índices para optimizar el registro de pagos y listados
-- Ejecutar una sola vez en Supabase > SQL Editor si no existen.
-- ================================================================
-- pagos.venta_id: búsquedas por venta y actualización de saldo.
-- ventas.empresa_id / ventas.cliente_id: filtros por empresa y cliente.
-- ventas(empresa_id, created_at DESC): listados recientes por empresa.
-- ================================================================

-- Índices para pagos
CREATE INDEX IF NOT EXISTS idx_pagos_venta
ON pagos(venta_id);

-- Índices para ventas
CREATE INDEX IF NOT EXISTS idx_ventas_empresa_id
ON ventas(empresa_id);

CREATE INDEX IF NOT EXISTS idx_ventas_cliente_id
ON ventas(cliente_id);

-- Índice optimizado para listados (ventas recientes por empresa)
CREATE INDEX IF NOT EXISTS idx_ventas_empresa_created
ON ventas(empresa_id, created_at DESC);
