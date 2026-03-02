-- Tabla solicitudes_cambio (renovaciones pendientes de aprobación)
-- Esquema UUID: empresa_id REFERENCES empresas(id)
-- Ejecutar en Supabase SQL Editor (requiere ventas, sucursales, empresas)

BEGIN;

CREATE TABLE IF NOT EXISTS solicitudes_cambio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'renovacion' CHECK (tipo IN ('renovacion', 'nuevo')),
  monto_solicitado DECIMAL(10, 2),
  plazo_solicitado INTEGER,
  datos_extra JSONB,
  solicitado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'aprobada', 'rechazada')),
  aprobado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_status ON solicitudes_cambio(status);
CREATE INDEX IF NOT EXISTS idx_solicitudes_venta ON solicitudes_cambio(venta_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_empresa ON solicitudes_cambio(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_created ON solicitudes_cambio(created_at DESC);

ALTER TABLE solicitudes_cambio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solicitudes_cambio_empresa" ON solicitudes_cambio;
CREATE POLICY "solicitudes_cambio_empresa" ON solicitudes_cambio
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "solicitudes_cambio_super_admin" ON solicitudes_cambio;
CREATE POLICY "solicitudes_cambio_super_admin" ON solicitudes_cambio
  FOR ALL TO authenticated
  USING (public.is_super_admin());

COMMENT ON TABLE solicitudes_cambio IS 'Solicitudes de renovación o nuevo crédito pendientes de aprobación';

-- Migrar empresa_id de VARCHAR a UUID si la tabla se creó con esquema antiguo
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'solicitudes_cambio'
    AND column_name = 'empresa_id' AND data_type = 'character varying'
  ) THEN
    ALTER TABLE solicitudes_cambio DROP COLUMN IF EXISTS compania_id;
    ALTER TABLE solicitudes_cambio DROP COLUMN IF EXISTS app_id;
    ALTER TABLE solicitudes_cambio DROP CONSTRAINT IF EXISTS solicitudes_cambio_empresa_id_fkey;
    ALTER TABLE solicitudes_cambio ALTER COLUMN empresa_id TYPE UUID USING NULLIF(TRIM(empresa_id), '')::uuid;
    ALTER TABLE solicitudes_cambio ADD CONSTRAINT solicitudes_cambio_empresa_id_fkey
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Migración empresa_id: %', SQLERRM;
END $$;

COMMIT;
