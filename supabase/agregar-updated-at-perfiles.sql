-- Añadir columna updated_at a perfiles (para auditoría al actualizar usuario)
-- Ejecutar en Supabase SQL Editor si obtienes error "Could not find the 'updated_at' column of 'perfiles'"

ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
COMMENT ON COLUMN perfiles.updated_at IS 'Última actualización del perfil';

-- Opcional: actualizar filas existentes
UPDATE perfiles SET updated_at = COALESCE(updated_at, created_at) WHERE updated_at IS NULL;
