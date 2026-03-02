-- Asignar ruta a perfiles (empleados)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS ruta_id UUID REFERENCES rutas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_perfiles_ruta ON perfiles(ruta_id);
COMMENT ON COLUMN perfiles.ruta_id IS 'Ruta de cobro asignada al empleado (para Mi Ruta de Hoy)';
