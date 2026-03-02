-- Centro de Comando JasiCorp: empresas status, system_logs, rol super_admin
-- Ejecutar en Supabase SQL Editor

-- 1) Estado de mantenimiento por tenant (empresas)
ALTER TABLE empresas
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

ALTER TABLE empresas DROP CONSTRAINT IF EXISTS empresas_status_check;
ALTER TABLE empresas ADD CONSTRAINT empresas_status_check CHECK (status IN ('active', 'inactive'));
UPDATE empresas SET status = 'active' WHERE status IS NULL;
ALTER TABLE empresas ALTER COLUMN status SET NOT NULL;
ALTER TABLE empresas ALTER COLUMN status SET DEFAULT 'active';

COMMENT ON COLUMN empresas.status IS 'active = operación normal; inactive = modo mantenimiento (usuarios ven mensaje al loguearse)';

-- 2) Tabla system_logs para correlación de errores
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint TEXT,
  error_message TEXT,
  correlation_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_tenant ON system_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_correlation ON system_logs(correlation_id);

COMMENT ON TABLE system_logs IS 'Logs de errores con correlation_id para rastrear sesión del error';

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas si existen para evitar errores en ejecuciones repetidas
DROP POLICY IF EXISTS "Authenticated can insert system_logs" ON system_logs;
DROP POLICY IF EXISTS "Authenticated can read system_logs" ON system_logs;

CREATE POLICY "Authenticated can insert system_logs"
  ON system_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can read system_logs"
  ON system_logs FOR SELECT TO authenticated USING (true);

-- 3) Rol super_admin en perfiles (permitir Admin, Vendedor y super_admin)
ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;
-- Solo añadir si la columna rol tiene valores válidos
DO $$
BEGIN
  -- Actualizar valores inválidos primero (si los hay)
  UPDATE perfiles SET rol = 'Admin' WHERE rol IS NULL OR rol NOT IN ('Admin', 'Vendedor', 'super_admin');
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignorar si falla
END $$;

ALTER TABLE perfiles ADD CONSTRAINT perfiles_rol_check CHECK (rol IN ('Admin', 'Vendedor', 'super_admin'));
