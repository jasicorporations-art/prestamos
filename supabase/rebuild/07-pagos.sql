-- ================================================================
-- PASO 7: Tabla PAGOS + RLS
-- ================================================================
-- empresa_id UUID REFERENCES empresas(id)
-- Referencias: ventas
-- ================================================================

CREATE TABLE pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
  fecha_pago TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  usuario_que_cobro UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sucursal_donde_se_cobro UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  latitud_cobro DOUBLE PRECISION,
  longitud_cobro DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Columnas adicionales
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS numero_cuota INTEGER;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS monto_a_mora DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS es_abono BOOLEAN DEFAULT false;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS autorizado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pagos_venta ON pagos(venta_id);
CREATE INDEX IF NOT EXISTS idx_pagos_empresa ON pagos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagos_latitud_longitud ON pagos(latitud_cobro, longitud_cobro) WHERE latitud_cobro IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pagos_usuario_cobro ON pagos(usuario_que_cobro);

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pagos_authenticated" ON pagos;
DROP POLICY IF EXISTS "pagos_policy" ON pagos;
CREATE POLICY "pagos_authenticated" ON pagos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
