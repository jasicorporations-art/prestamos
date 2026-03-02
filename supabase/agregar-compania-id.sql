-- Agregar campo compania_id a todas las tablas para sistema multi-tenant
-- Ejecutar este script en Supabase SQL Editor

-- Paso 1: Agregar columna compania_id a clientes
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);

-- Paso 2: Agregar columna compania_id a motores
ALTER TABLE motores 
ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);

-- Paso 3: Agregar columna compania_id a ventas
ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);

-- Paso 4: Agregar columna compania_id a pagos (a través de ventas)
-- Los pagos heredan la compañía de la venta, pero la agregamos para consultas directas
ALTER TABLE pagos 
ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);

-- Paso 5: Crear índices para mejorar el rendimiento de consultas por compañía
CREATE INDEX IF NOT EXISTS idx_clientes_compania ON clientes(compania_id);
CREATE INDEX IF NOT EXISTS idx_motores_compania ON motores(compania_id);
CREATE INDEX IF NOT EXISTS idx_ventas_compania ON ventas(compania_id);
CREATE INDEX IF NOT EXISTS idx_pagos_compania ON pagos(compania_id);

-- Paso 6: Función para actualizar compania_id en pagos cuando se crea una venta
CREATE OR REPLACE FUNCTION actualizar_compania_pago()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar compania_id en pagos basado en la venta
  UPDATE pagos
  SET compania_id = NEW.compania_id
  WHERE venta_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Paso 7: Trigger para actualizar compania_id en pagos cuando se crea/actualiza una venta
DROP TRIGGER IF EXISTS trigger_actualizar_compania_pago ON ventas;
CREATE TRIGGER trigger_actualizar_compania_pago
  AFTER INSERT OR UPDATE ON ventas
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_compania_pago();

-- Paso 8: Función para actualizar compania_id en pagos cuando se inserta un pago
CREATE OR REPLACE FUNCTION actualizar_compania_pago_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Obtener compania_id de la venta relacionada
  SELECT compania_id INTO NEW.compania_id
  FROM ventas
  WHERE id = NEW.venta_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Paso 9: Trigger para actualizar compania_id en pagos cuando se inserta un pago
DROP TRIGGER IF EXISTS trigger_actualizar_compania_pago_insert ON pagos;
CREATE TRIGGER trigger_actualizar_compania_pago_insert
  BEFORE INSERT ON pagos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_compania_pago_insert();

