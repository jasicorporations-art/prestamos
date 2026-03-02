-- Agregar campos faltantes a la tabla clientes (para importación y formularios)
-- Compatible con esquema UUID: clientes.empresa_id, clientes.sucursal_id son UUID
-- Ejecutar en Supabase SQL Editor si la importación falla por columnas inexistentes

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nombre_garante VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email_garante VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion_garante TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefono_garante TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS fecha_compra DATE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS numero_prestamo_cliente VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS url_id_frontal TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS url_id_trasera TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS url_contrato TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS latitud_negocio DOUBLE PRECISION;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS longitud_negocio DOUBLE PRECISION;



