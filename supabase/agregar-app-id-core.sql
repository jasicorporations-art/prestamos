-- Agregar app_id a tablas core para filtros multi-tenant
-- Ejecutar en Supabase SQL Editor y luego API → Reload schema

BEGIN;

ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS app_id TEXT;

ALTER TABLE motores
ADD COLUMN IF NOT EXISTS app_id TEXT;

ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS app_id TEXT;

ALTER TABLE pagos
ADD COLUMN IF NOT EXISTS app_id TEXT;

ALTER TABLE sucursales
ADD COLUMN IF NOT EXISTS app_id TEXT;

-- Backfill con el app_id actual (ajusta si usas otro)
UPDATE clientes SET app_id = 'electro' WHERE app_id IS NULL;
UPDATE motores SET app_id = 'electro' WHERE app_id IS NULL;
UPDATE ventas SET app_id = 'electro' WHERE app_id IS NULL;
UPDATE pagos SET app_id = 'electro' WHERE app_id IS NULL;
UPDATE sucursales SET app_id = 'electro' WHERE app_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_app_id ON clientes(app_id);
CREATE INDEX IF NOT EXISTS idx_motores_app_id ON motores(app_id);
CREATE INDEX IF NOT EXISTS idx_ventas_app_id ON ventas(app_id);
CREATE INDEX IF NOT EXISTS idx_pagos_app_id ON pagos(app_id);
CREATE INDEX IF NOT EXISTS idx_sucursales_app_id ON sucursales(app_id);

COMMIT;
