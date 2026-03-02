-- Agregar campo número único de préstamo para clientes
-- Ejecutar este script en Supabase SQL Editor

-- Paso 1: Agregar columna numero_prestamo_cliente (si no existe)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clientes' AND column_name = 'numero_prestamo_cliente'
  ) THEN
    ALTER TABLE clientes 
    ADD COLUMN numero_prestamo_cliente VARCHAR(255);
  END IF;
END $$;

-- Paso 2: Actualizar clientes existentes con números de préstamo si no tienen
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

-- Paso 3: Si hay duplicados, corregirlos incrementando el número
DO $$
DECLARE
  max_numero INTEGER;
BEGIN
  -- Obtener el número más alto existente
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(numero_prestamo_cliente FROM 'CLI-(\d+)') AS INTEGER)), 
    0
  ) INTO max_numero
  FROM clientes
  WHERE numero_prestamo_cliente IS NOT NULL;
  
  -- Si hay duplicados, actualizar los que están después del máximo
  -- Usar CTE para poder usar ROW_NUMBER en UPDATE
  WITH duplicados_ordenados AS (
    SELECT 
      c1.id,
      ROW_NUMBER() OVER (ORDER BY c1.created_at) as numero_fila
    FROM clientes c1
    WHERE c1.numero_prestamo_cliente IN (
      SELECT numero_prestamo_cliente
      FROM clientes
      GROUP BY numero_prestamo_cliente
      HAVING COUNT(*) > 1
    )
    AND c1.id NOT IN (
      SELECT MIN(id)
      FROM clientes
      GROUP BY numero_prestamo_cliente
      HAVING COUNT(*) > 1
    )
  )
  UPDATE clientes c1
  SET numero_prestamo_cliente = 'CLI-' || LPAD(
    (max_numero + dup.numero_fila)::text,
    4,
    '0'
  )
  FROM duplicados_ordenados dup
  WHERE c1.id = dup.id;
END $$;

-- Paso 4: Agregar constraint UNIQUE (eliminar primero si existe)
ALTER TABLE clientes 
DROP CONSTRAINT IF EXISTS clientes_numero_prestamo_cliente_key;

ALTER TABLE clientes 
ADD CONSTRAINT clientes_numero_prestamo_cliente_key 
UNIQUE (numero_prestamo_cliente);

-- Paso 5: Crear índice para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_clientes_numero_prestamo ON clientes(numero_prestamo_cliente);

