-- Agregar campo número único de préstamo para clientes (VERSIÓN SIMPLE)
-- Ejecutar este script en Supabase SQL Editor

-- Paso 1: Agregar columna numero_prestamo_cliente (sin UNIQUE primero)
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS numero_prestamo_cliente VARCHAR(255);

-- Paso 2: Actualizar clientes existentes con números de préstamo
-- Solo actualizar los que no tienen número asignado
-- Usar CTE (Common Table Expression) para poder usar ROW_NUMBER en UPDATE
WITH clientes_ordenados AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) as numero_fila
  FROM clientes
  WHERE numero_prestamo_cliente IS NULL
)
UPDATE clientes c
SET numero_prestamo_cliente = 'CLI-' || LPAD(
  co.numero_fila::text, 
  4, 
  '0'
)
FROM clientes_ordenados co
WHERE c.id = co.id;

-- Paso 3: Eliminar constraint UNIQUE si existe (para poder recrearlo)
ALTER TABLE clientes 
DROP CONSTRAINT IF EXISTS clientes_numero_prestamo_cliente_key;

-- Paso 4: Agregar constraint UNIQUE
ALTER TABLE clientes 
ADD CONSTRAINT clientes_numero_prestamo_cliente_key 
UNIQUE (numero_prestamo_cliente);

-- Paso 5: Crear índice para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_clientes_numero_prestamo ON clientes(numero_prestamo_cliente);

