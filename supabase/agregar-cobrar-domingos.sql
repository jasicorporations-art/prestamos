-- Configuración de Domingos: Si false, las cuotas que caigan en domingo se mueven al lunes
-- Ejecutar en Supabase SQL Editor

ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS cobrar_domingos BOOLEAN DEFAULT false;

COMMENT ON COLUMN sucursales.cobrar_domingos IS 'Si true, se cobra en domingo. Si false, las cuotas que caigan en domingo se mueven automáticamente al lunes.';
