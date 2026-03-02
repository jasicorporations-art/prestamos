-- ================================================================
-- PASO 5: Tabla CLIENTES + RLS
-- ================================================================
-- empresa_id UUID REFERENCES empresas(id)
-- sucursal_id UUID REFERENCES sucursales(id)
-- ================================================================

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  nombre_completo VARCHAR(255) NOT NULL,
  cedula VARCHAR(50) NOT NULL,
  celular TEXT,
  direccion TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Columnas adicionales
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nombre_garante VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email_garante VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion_garante TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefono_garante TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS fecha_compra DATE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS numero_prestamo_cliente VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS url_id_frontal TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS url_id_trasera TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS url_contrato TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS latitud_negocio DOUBLE PRECISION;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS longitud_negocio DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_sucursal ON clientes(sucursal_id);

DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clientes_authenticated" ON clientes;
DROP POLICY IF EXISTS "clientes_policy" ON clientes;
CREATE POLICY "clientes_authenticated" ON clientes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
