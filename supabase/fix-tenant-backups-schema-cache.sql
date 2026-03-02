-- Solución al error: "Could not find the 'backup_data' column of 'tenant_backups' in the schema cache"
-- Ejecutar en Supabase > SQL Editor (una sola vez).

-- 1) Asegurar que la columna backup_data exista
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

-- 2) Forzar que PostgREST recargue el esquema (actualiza la caché)
NOTIFY pgrst, 'reload schema';
