-- Script para agregar campo tour_completado a la tabla perfiles
-- Este campo controla si el usuario ha completado el tour guiado

BEGIN;

-- 1. Agregar columna tour_completado (BOOLEAN, NOT NULL, default false)
ALTER TABLE perfiles
ADD COLUMN IF NOT EXISTS tour_completado BOOLEAN NOT NULL DEFAULT false;

-- 2. Agregar comentario a la columna
COMMENT ON COLUMN perfiles.tour_completado IS 'Indica si el usuario ha completado el tour guiado interactivo';

COMMIT;

-- Verificar que la columna se creó correctamente
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'perfiles'
-- AND column_name = 'tour_completado';

