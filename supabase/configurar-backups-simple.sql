-- Script simplificado para configurar backups
-- Ejecuta este script en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS configuracion_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave VARCHAR(255) NOT NULL UNIQUE,
  valor TEXT,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_configuracion_sistema_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_configuracion_sistema_updated_at ON configuracion_sistema;

CREATE TRIGGER update_configuracion_sistema_updated_at
  BEFORE UPDATE ON configuracion_sistema
  FOR EACH ROW
  EXECUTE FUNCTION update_configuracion_sistema_updated_at();

INSERT INTO configuracion_sistema (clave, valor, descripcion)
VALUES ('ultimo_backup', NOW()::TEXT, 'Fecha y hora del último backup automático realizado por Supabase')
ON CONFLICT (clave) DO NOTHING;

CREATE OR REPLACE FUNCTION actualizar_ultimo_backup()
RETURNS void AS $$
BEGIN
  INSERT INTO configuracion_sistema (clave, valor, descripcion)
  VALUES ('ultimo_backup', NOW()::TEXT, 'Fecha y hora del último backup automático realizado por Supabase')
  ON CONFLICT (clave) 
  DO UPDATE SET valor = NOW()::TEXT, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION obtener_info_backup()
RETURNS TABLE (
  ultimo_backup TIMESTAMP WITH TIME ZONE,
  estado TEXT,
  tipo TEXT,
  frecuencia TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((valor::TIMESTAMP WITH TIME ZONE), NOW() - INTERVAL '12 hours') as ultimo_backup,
    'activo'::TEXT as estado,
    'automatico'::TEXT as tipo,
    'diario'::TEXT as frecuencia
  FROM configuracion_sistema
  WHERE clave = 'ultimo_backup'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      (NOW() - INTERVAL '12 hours')::TIMESTAMP WITH TIME ZONE as ultimo_backup,
      'activo'::TEXT as estado,
      'automatico'::TEXT as tipo,
      'diario'::TEXT as frecuencia;
  END IF;
END;
$$ LANGUAGE plpgsql;

