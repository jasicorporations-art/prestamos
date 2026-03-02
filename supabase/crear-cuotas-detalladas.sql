-- Tabla de cuotas detalladas para amortización francesa
-- Ejecutar este script en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS cuotas_detalladas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  numero_cuota INT NOT NULL,
  fecha_pago DATE NOT NULL,
  cuota_fija NUMERIC(12, 2) NOT NULL,
  interes_mes NUMERIC(12, 2) NOT NULL,
  abono_capital NUMERIC(12, 2) NOT NULL,
  saldo_pendiente NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  app_id TEXT
);

-- Asegurar que app_id existe (por si la tabla ya existía sin ella)
ALTER TABLE cuotas_detalladas ADD COLUMN IF NOT EXISTS app_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cuotas_detalladas_unique
  ON cuotas_detalladas (venta_id, numero_cuota);
CREATE INDEX IF NOT EXISTS idx_cuotas_detalladas_fecha
  ON cuotas_detalladas (fecha_pago);
CREATE INDEX IF NOT EXISTS idx_cuotas_detalladas_app_id
  ON cuotas_detalladas (app_id);

COMMENT ON TABLE cuotas_detalladas IS 'Cuotas detalladas generadas por amortización francesa';
