-- Tabla para deduplicar recordatorios de pago
-- Ejecutar en Supabase SQL Editor (requiere clientes, ventas)

CREATE TABLE IF NOT EXISTS recordatorios_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  prestamo_id UUID REFERENCES ventas(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  fecha_recordatorio DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Evitar envíos duplicados por cliente y fecha
CREATE UNIQUE INDEX IF NOT EXISTS idx_recordatorios_pago_unico
  ON recordatorios_pago (cliente_id, fecha_recordatorio);

CREATE INDEX IF NOT EXISTS idx_recordatorios_pago_empresa ON recordatorios_pago(empresa_id);

ALTER TABLE recordatorios_pago ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recordatorios_pago_empresa" ON recordatorios_pago;
CREATE POLICY "recordatorios_pago_empresa" ON recordatorios_pago
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM perfiles WHERE user_id = auth.uid()));

-- Super admin: acceso total
DROP POLICY IF EXISTS "recordatorios_pago_super_admin" ON recordatorios_pago;
CREATE POLICY "recordatorios_pago_super_admin" ON recordatorios_pago
  FOR ALL TO authenticated
  USING (public.is_super_admin());

COMMENT ON TABLE recordatorios_pago IS 'Deduplicación de recordatorios de pago enviados';
COMMENT ON COLUMN recordatorios_pago.fecha_recordatorio IS 'Fecha del recordatorio (YYYY-MM-DD)';
