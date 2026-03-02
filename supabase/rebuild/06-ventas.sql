-- ================================================================
-- PASO 6: Tabla VENTAS (préstamos/créditos) + RLS
-- ================================================================
-- empresa_id UUID REFERENCES empresas(id)
-- Referencias: motores, clientes, sucursales
-- ================================================================

CREATE TABLE ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  motor_id UUID NOT NULL REFERENCES motores(id) ON DELETE RESTRICT,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  monto_total DECIMAL(12, 2) NOT NULL,
  saldo_pendiente DECIMAL(12, 2) NOT NULL,
  cantidad_cuotas INTEGER NOT NULL CHECK (cantidad_cuotas > 0),
  fecha_venta TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Columnas adicionales
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS numero_prestamo TEXT;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS porcentaje_interes DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS tipo_interes VARCHAR(20) DEFAULT 'interes';
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS metodo_interes VARCHAR(20) DEFAULT 'sobre_saldo';
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS tipo_calculo_interes TEXT DEFAULT 'interes_fijo';
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS descuento_contado DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS gastos_de_cierre DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS tipo_pago VARCHAR(20) DEFAULT 'financiamiento';
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS plazo_meses INTEGER;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS tipo_plazo VARCHAR(20) DEFAULT 'mensual';
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS dia_pago_semanal INTEGER;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fecha_inicio_quincenal DATE;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS dia_pago_mensual INTEGER;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS proxima_fecha_pago TIMESTAMPTZ;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_tipo_calculo_interes_check') THEN
    ALTER TABLE ventas ADD CONSTRAINT ventas_tipo_calculo_interes_check CHECK (tipo_calculo_interes IN ('sobre_saldo', 'interes_fijo'));
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_motor ON ventas(motor_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_empresa ON ventas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ventas_sucursal ON ventas(sucursal_id);

DROP TRIGGER IF EXISTS update_ventas_updated_at ON ventas;
CREATE TRIGGER update_ventas_updated_at BEFORE UPDATE ON ventas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ventas_authenticated" ON ventas;
DROP POLICY IF EXISTS "ventas_policy" ON ventas;
CREATE POLICY "ventas_authenticated" ON ventas FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
