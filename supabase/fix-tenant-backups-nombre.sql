-- Si recibes: null value in column "nombre" of relation "tenant_backups" violates not-null constraint
-- La app ya envía "nombre" al guardar; este script es por si quieres que la columna sea opcional.

ALTER TABLE tenant_backups ADD COLUMN IF NOT EXISTS nombre TEXT;
UPDATE tenant_backups SET nombre = 'Backup ' || id::text WHERE nombre IS NULL;
ALTER TABLE tenant_backups ALTER COLUMN nombre DROP NOT NULL;
