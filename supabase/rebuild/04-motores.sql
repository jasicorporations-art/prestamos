-- ================================================================
-- PASO 4: Tabla MOTORES + RLS
-- ================================================================
-- empresa_id UUID REFERENCES empresas(id)
-- ================================================================

CREATE TABLE motores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  marca VARCHAR(255) NOT NULL,
  modelo VARCHAR(255),
  año INTEGER,
  color VARCHAR(255),
  matricula VARCHAR(255) NOT NULL,
  numero_chasis VARCHAR(255) NOT NULL,
  precio_venta DECIMAL(12, 2) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'Disponible' CHECK (estado IN ('Disponible', 'Vendido')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE motores ADD COLUMN IF NOT EXISTS cantidad INTEGER DEFAULT 1;
ALTER TABLE motores ADD COLUMN IF NOT EXISTS numero_chasis_real VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_motores_estado ON motores(estado);
CREATE INDEX IF NOT EXISTS idx_motores_empresa ON motores(empresa_id);

DROP TRIGGER IF EXISTS update_motores_updated_at ON motores;
CREATE TRIGGER update_motores_updated_at BEFORE UPDATE ON motores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE motores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "motores_authenticated" ON motores;
DROP POLICY IF EXISTS "motores_policy" ON motores;
CREATE POLICY "motores_authenticated" ON motores FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
