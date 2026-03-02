-- Crear tabla para gestionar códigos de registro únicos
-- Cada código solo puede usarse una vez
-- Ejecutar este script en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS codigos_registro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(255) NOT NULL UNIQUE,
  usado BOOLEAN NOT NULL DEFAULT FALSE,
  usado_por_email VARCHAR(255), -- Email del usuario que usó el código
  usado_en TIMESTAMP WITH TIME ZONE, -- Fecha y hora en que se usó
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notas TEXT, -- Notas opcionales sobre el código (ej: "Para usuario X")
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas por código
CREATE INDEX IF NOT EXISTS idx_codigos_registro_codigo ON codigos_registro(codigo);
CREATE INDEX IF NOT EXISTS idx_codigos_registro_usado ON codigos_registro(usado);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_codigos_registro_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_codigos_registro_updated_at_trigger ON codigos_registro;
CREATE TRIGGER update_codigos_registro_updated_at_trigger
  BEFORE UPDATE ON codigos_registro
  FOR EACH ROW
  EXECUTE FUNCTION update_codigos_registro_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE codigos_registro IS 'Tabla para gestionar códigos de registro únicos. Cada código solo puede usarse una vez.';
COMMENT ON COLUMN codigos_registro.codigo IS 'El código de registro único';
COMMENT ON COLUMN codigos_registro.usado IS 'Indica si el código ya fue usado';
COMMENT ON COLUMN codigos_registro.usado_por_email IS 'Email del usuario que usó este código';
COMMENT ON COLUMN codigos_registro.usado_en IS 'Fecha y hora en que se usó el código';

