-- Modificar restricción de cédula para que sea única por compañía
-- Ejecutar este script en Supabase SQL Editor

-- Paso 1: Eliminar la restricción UNIQUE existente de cédula
ALTER TABLE clientes 
DROP CONSTRAINT IF EXISTS clientes_cedula_key;

-- Paso 2: Crear un índice único compuesto (compania_id, cedula)
-- Esto permite que diferentes compañías tengan clientes con la misma cédula
-- pero una compañía no puede tener dos clientes con la misma cédula

-- Primero, asegurarse de que compania_id existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clientes' AND column_name = 'compania_id'
  ) THEN
    ALTER TABLE clientes 
    ADD COLUMN compania_id VARCHAR(255);
  END IF;
END $$;

-- Paso 3: Para clientes existentes sin compañía, asignarles una compañía temporal
-- (Esto es solo para datos existentes, los nuevos clientes tendrán compañía automáticamente)
UPDATE clientes 
SET compania_id = 'DEFAULT' 
WHERE compania_id IS NULL;

-- Paso 4: Hacer compania_id NOT NULL para nuevos registros
-- (No podemos hacerlo directamente si hay NULLs, así que usamos un valor por defecto)
ALTER TABLE clientes 
ALTER COLUMN compania_id SET DEFAULT 'DEFAULT';

-- Paso 5: Crear índice único compuesto (compania_id, cedula)
-- Esto garantiza que dentro de una compañía, no haya cédulas duplicadas
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_compania_cedula_unique 
ON clientes(compania_id, cedula);

-- Paso 6: Crear un índice adicional para mejorar búsquedas por cédula
CREATE INDEX IF NOT EXISTS idx_clientes_cedula ON clientes(cedula);

-- NOTA: Si prefieres que la cédula sea completamente única (sin considerar compañía),
-- no ejecutes este script y mantén la restricción original.
-- Este script permite que diferentes compañías tengan clientes con la misma cédula.

