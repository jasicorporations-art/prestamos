-- Solución al error: column "empresa_id" does not exist
-- Ejecutar en Supabase SQL Editor ANTES de usar restauración de backups.
-- Añade empresa_id y app_id a clientes, motores, ventas y pagos si no existen.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['clientes', 'motores', 'ventas', 'pagos']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'empresa_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN empresa_id TEXT', t);
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'app_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN app_id TEXT', t);
    END IF;
  END LOOP;
END $$;
