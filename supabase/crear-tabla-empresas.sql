-- Crear tabla de empresas para garantizar unicidad
-- Ejecutar este script en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS empresas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_empresas_nombre ON empresas(LOWER(nombre));
CREATE INDEX IF NOT EXISTS idx_empresas_user_id ON empresas(user_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (para evitar errores)
DROP POLICY IF EXISTS "Users can view their own company" ON empresas;
DROP POLICY IF EXISTS "Users can insert their own company" ON empresas;

-- Política: Los usuarios solo pueden ver su propia empresa
CREATE POLICY "Users can view their own company"
  ON empresas
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden insertar su propia empresa
CREATE POLICY "Users can insert their own company"
  ON empresas
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comentarios para documentación
COMMENT ON TABLE empresas IS 'Tabla para almacenar empresas registradas y garantizar unicidad';
COMMENT ON COLUMN empresas.nombre IS 'Nombre único de la empresa (case-insensitive)';
COMMENT ON COLUMN empresas.user_id IS 'ID del usuario que creó la empresa';
COMMENT ON COLUMN empresas.email IS 'Email del usuario que creó la empresa';

