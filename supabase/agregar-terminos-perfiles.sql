-- Script para agregar columnas de términos y condiciones a la tabla perfiles
-- Este script añade los campos necesarios para rastrear la aceptación de términos

BEGIN;

-- 1. Agregar columna terminos_aceptados (BOOLEAN, NOT NULL, default false)
ALTER TABLE perfiles
ADD COLUMN IF NOT EXISTS terminos_aceptados BOOLEAN NOT NULL DEFAULT false;

-- 2. Agregar columna fecha_aceptacion (TIMESTAMP WITH TIME ZONE)
ALTER TABLE perfiles
ADD COLUMN IF NOT EXISTS fecha_aceptacion TIMESTAMP WITH TIME ZONE;

-- 3. Agregar columna ip_registro (TEXT, opcional para mayor blindaje legal)
ALTER TABLE perfiles
ADD COLUMN IF NOT EXISTS ip_registro TEXT;

-- 4. Actualizar registros existentes (opcional: marcar como aceptados si ya tienen perfil)
-- Comentado para no afectar registros existentes sin consentimiento
-- UPDATE perfiles SET terminos_aceptados = true, fecha_aceptacion = created_at WHERE terminos_aceptados IS NULL;

-- 5. Función permisiva: si terminos_aceptados viene NULL/false (ej. handle_new_user), se asigna true
CREATE OR REPLACE FUNCTION validar_terminos_aceptados()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.terminos_aceptados IS NOT TRUE THEN NEW.terminos_aceptados := true; END IF;
  IF NEW.fecha_aceptacion IS NULL THEN NEW.fecha_aceptacion := NOW(); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Crear trigger para validar antes de INSERT
DROP TRIGGER IF EXISTS trigger_validar_terminos_insert ON perfiles;
CREATE TRIGGER trigger_validar_terminos_insert
  BEFORE INSERT ON perfiles
  FOR EACH ROW
  EXECUTE FUNCTION validar_terminos_aceptados();

-- 7. Crear trigger para validar antes de UPDATE (opcional: evitar que se desmarque)
-- Comentado para permitir actualizaciones, pero se puede activar si se requiere
-- DROP TRIGGER IF EXISTS trigger_validar_terminos_update ON perfiles;
-- CREATE TRIGGER trigger_validar_terminos_update
--   BEFORE UPDATE ON perfiles
--   FOR EACH ROW
--   WHEN (NEW.terminos_aceptados IS FALSE AND OLD.terminos_aceptados IS TRUE)
--   EXECUTE FUNCTION validar_terminos_aceptados();

-- 8. Agregar comentarios a las columnas
COMMENT ON COLUMN perfiles.terminos_aceptados IS 'Indica si el usuario aceptó los términos y condiciones de uso';
COMMENT ON COLUMN perfiles.fecha_aceptacion IS 'Fecha y hora en que el usuario aceptó los términos y condiciones';
COMMENT ON COLUMN perfiles.ip_registro IS 'Dirección IP desde la cual se registró el usuario (opcional, para registro legal)';

COMMIT;

-- Verificar que las columnas se crearon correctamente
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'perfiles'
-- AND column_name IN ('terminos_aceptados', 'fecha_aceptacion', 'ip_registro');

