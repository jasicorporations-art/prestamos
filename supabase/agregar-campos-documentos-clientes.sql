-- Agregar columnas para URLs de documentos en la tabla clientes
-- Ejecutar este script en el SQL Editor de Supabase

ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS url_id_frontal TEXT,
ADD COLUMN IF NOT EXISTS url_id_trasera TEXT,
ADD COLUMN IF NOT EXISTS url_contrato TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN clientes.url_id_frontal IS 'URL del documento de identificación frontal';
COMMENT ON COLUMN clientes.url_id_trasera IS 'URL del documento de identificación trasera';
COMMENT ON COLUMN clientes.url_contrato IS 'URL del contrato firmado';

