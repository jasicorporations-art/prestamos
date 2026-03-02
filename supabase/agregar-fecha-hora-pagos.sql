-- Agregar columna fecha_hora a pagos (opcional, para ordenamiento más preciso)
-- Si tu tabla pagos no tiene esta columna, ejecuta este script en Supabase SQL Editor

ALTER TABLE pagos ADD COLUMN IF NOT EXISTS fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Opcional: actualizar registros existentes para que fecha_hora = created_at
UPDATE pagos SET fecha_hora = COALESCE(created_at, NOW()) WHERE fecha_hora IS NULL;
