-- Script para VERIFICAR si las columnas de documentos existen
-- Ejecuta esto primero en Supabase SQL Editor

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'clientes' 
  AND column_name IN ('url_id_frontal', 'url_id_trasera', 'url_contrato')
ORDER BY column_name;

-- Si no devuelve 3 filas, las columnas NO existen y necesitas ejecutar:
-- supabase/agregar-campos-documentos-clientes.sql

