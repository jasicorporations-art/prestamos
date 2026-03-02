-- ============================================================
-- CREAR TABLA tenant_backups (para guardar backups en la nube)
-- ============================================================
-- Ejecutar en Supabase > SQL Editor.
-- Sin esta tabla, "Descargar y guardar en la nube" no guarda nada.
-- ============================================================

-- 0) Asegurar que perfiles tenga compania_id (para políticas RLS que usan empresa_id o compania_id)
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS compania_id TEXT;

-- 1) Tabla para guardar backups (manuales y pre-restauración)
CREATE TABLE IF NOT EXISTS tenant_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  backup_data JSONB NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'manual' CHECK (tipo IN ('manual', 'pre_restauracion')),
  nombre TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1b) Columnas nombre y datos (algunas instalaciones las usan; la app las envía/lee)
ALTER TABLE tenant_backups ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE tenant_backups ADD COLUMN IF NOT EXISTS datos JSONB;
-- Si hay NOT NULL y falla el insert: ALTER TABLE tenant_backups ALTER COLUMN nombre DROP NOT NULL; (y lo mismo para datos si aplica)

-- 2) Asegurar columna backup_data (imprescindible; si falta, la API da "Could not find backup_data in schema cache")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_backups' AND column_name = 'backup_data'
  ) THEN
    ALTER TABLE tenant_backups ADD COLUMN backup_data JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE tenant_backups ALTER COLUMN backup_data SET NOT NULL;
  END IF;
END $$;

-- 3) Asegurar columna created_at (por si la tabla ya existía sin ella)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_backups' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE tenant_backups ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 4) Columna app_id (para filtrar por aplicación/PWA)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_backups' AND column_name = 'app_id'
  ) THEN
    ALTER TABLE tenant_backups ADD COLUMN app_id TEXT;
  END IF;
END $$;

-- 4) Índices
CREATE INDEX IF NOT EXISTS idx_tenant_backups_tenant ON tenant_backups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_backups_created ON tenant_backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_backups_app_tenant ON tenant_backups(app_id, tenant_id);

-- 6) Permisos: permitir a usuarios autenticados insertar y leer
GRANT SELECT, INSERT ON tenant_backups TO authenticated;
GRANT SELECT, INSERT ON tenant_backups TO anon;

-- 6) RLS: cada usuario solo ve e inserta backups de su empresa (empresa_id o compania_id en perfiles)
ALTER TABLE tenant_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_backups_select_own ON tenant_backups;
CREATE POLICY tenant_backups_select_own ON tenant_backups
  FOR SELECT USING (
    tenant_id = (SELECT empresa_id FROM perfiles WHERE user_id = auth.uid() LIMIT 1)
    OR tenant_id = (SELECT compania_id FROM perfiles WHERE user_id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS tenant_backups_insert_own ON tenant_backups;
CREATE POLICY tenant_backups_insert_own ON tenant_backups
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT empresa_id FROM perfiles WHERE user_id = auth.uid() LIMIT 1)
    OR tenant_id = (SELECT compania_id FROM perfiles WHERE user_id = auth.uid() LIMIT 1)
  );

COMMENT ON TABLE tenant_backups IS 'Backups por tenant. tipo: manual | pre_restauracion. Sin esta tabla no se guardan backups en la nube.';

-- 8) Forzar recarga del esquema en PostgREST (evita error "Could not find backup_data in schema cache")
NOTIFY pgrst, 'reload schema';
