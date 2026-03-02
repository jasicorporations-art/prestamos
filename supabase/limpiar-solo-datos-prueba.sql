-- Script para limpiar solo datos de prueba (mantener estructura)
-- Este script borra todos los datos pero mantiene las tablas y estructura
-- Ejecutar en Supabase SQL Editor

-- ⚠️ ADVERTENCIA: Este script eliminará TODOS los datos
-- Si quieres mantener algunos datos, edita este script antes de ejecutarlo

BEGIN;

-- Borrar en orden (respetando foreign keys):
-- 1. Primero los pagos (dependen de ventas)
DELETE FROM pagos;

-- 2. Luego las ventas (dependen de motores y clientes)
DELETE FROM ventas;

-- 3. Después los clientes
DELETE FROM clientes;

-- 4. Finalmente los motores
DELETE FROM motores;

-- Verificar que se borraron todos los datos
SELECT 
  'Pagos eliminados: ' || (SELECT COUNT(*) FROM pagos)::text as resultado,
  'Ventas eliminadas: ' || (SELECT COUNT(*) FROM ventas)::text as resultado,
  'Clientes eliminados: ' || (SELECT COUNT(*) FROM clientes)::text as resultado,
  'Motores eliminados: ' || (SELECT COUNT(*) FROM motores)::text as resultado;

COMMIT;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Todos los datos han sido eliminados. Las tablas están vacías pero la estructura se mantiene.';
END $$;






