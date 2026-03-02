-- Tabla de pagos que las empresas (Dealers) realizan a la plataforma JasiCorp
-- Mensualidades, Setup, Updates, WhatsApp, etc. NO confundir con pagos (cuotas de clientes)
-- Solo el Super Admin consulta esta tabla para "Mis Ganancias (SaaS)"

CREATE TABLE IF NOT EXISTS pagos_plataforma (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id TEXT NOT NULL,
  monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
  concepto TEXT NOT NULL CHECK (concepto IN ('mensualidad', 'setup', 'update', 'whatsapp', 'otro')),
  referencia TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_plataforma_empresa ON pagos_plataforma(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagos_plataforma_created ON pagos_plataforma(created_at);

COMMENT ON TABLE pagos_plataforma IS 'Ingresos de la plataforma JasiCorp: cobros a empresas (mensualidad, setup, updates). No filtrar por compania_id en el panel Super Admin.';
