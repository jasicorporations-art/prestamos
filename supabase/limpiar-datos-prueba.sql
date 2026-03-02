-- Script para limpiar todos los datos de prueba
-- ⚠️ ADVERTENCIA: Este script eliminará TODOS los datos de las tablas
-- Ejecutar en Supabase SQL Editor

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
  (SELECT COUNT(*) FROM pagos) as total_pagos,
  (SELECT COUNT(*) FROM ventas) as total_ventas,
  (SELECT COUNT(*) FROM clientes) as total_clientes,
  (SELECT COUNT(*) FROM motores) as total_motores;

-- Deberías ver todos los conteos en 0






