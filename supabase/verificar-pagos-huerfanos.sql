-- Script para verificar pagos que tienen actividad registrada pero no aparecen en consultas
-- Esto ayuda a identificar pagos que se insertaron pero tienen problemas con empresa_id/sucursal_id

-- 1. Ver todos los pagos recientes con sus metadatos
SELECT 
  p.id,
  p.venta_id,
  p.monto,
  p.fecha_pago,
  p.numero_cuota,
  p.empresa_id,
  p.compania_id,
  p.sucursal_id,
  p.usuario_que_cobro,
  p.sucursal_donde_se_cobro,
  p.created_at,
  v.empresa_id as venta_empresa_id,
  v.sucursal_id as venta_sucursal_id
FROM pagos p
LEFT JOIN ventas v ON p.venta_id = v.id
ORDER BY p.created_at DESC
LIMIT 50;

-- 2. Ver actividades de pagos recientes
SELECT 
  al.id,
  al.fecha_hora,
  al.usuario_nombre,
  al.sucursal_nombre,
  al.accion,
  al.detalle,
  al.entidad_id,
  al.entidad_tipo
FROM actividad_logs al
WHERE al.entidad_tipo = 'pago'
  AND al.accion LIKE '%pago%'
ORDER BY al.fecha_hora DESC
LIMIT 50;

-- 3. Buscar actividades que NO tienen pago correspondiente
SELECT 
  al.id as actividad_id,
  al.fecha_hora,
  al.usuario_nombre,
  al.sucursal_nombre,
  al.accion,
  al.detalle,
  al.entidad_id as pago_id_esperado,
  CASE 
    WHEN p.id IS NULL THEN '❌ PAGO NO ENCONTRADO'
    ELSE '✅ Pago existe'
  END as estado
FROM actividad_logs al
LEFT JOIN pagos p ON al.entidad_id = p.id
WHERE al.entidad_tipo = 'pago'
  AND al.accion LIKE '%pago%'
  AND p.id IS NULL
ORDER BY al.fecha_hora DESC;

-- 4. Verificar pagos con empresa_id o sucursal_id NULL o incorrectos
SELECT 
  p.id,
  p.venta_id,
  p.monto,
  p.empresa_id,
  p.sucursal_id,
  v.empresa_id as venta_empresa_id,
  v.sucursal_id as venta_sucursal_id,
  CASE 
    WHEN p.empresa_id IS NULL THEN '⚠️ empresa_id NULL'
    WHEN p.empresa_id != v.empresa_id THEN '⚠️ empresa_id no coincide con venta'
    ELSE '✅ OK'
  END as estado_empresa,
  CASE 
    WHEN p.sucursal_id IS NULL THEN '⚠️ sucursal_id NULL'
    ELSE '✅ OK'
  END as estado_sucursal
FROM pagos p
LEFT JOIN ventas v ON p.venta_id = v.id
WHERE p.empresa_id IS NULL 
   OR p.sucursal_id IS NULL
   OR (v.empresa_id IS NOT NULL AND p.empresa_id != v.empresa_id)
ORDER BY p.created_at DESC
LIMIT 50;

-- 5. Contar pagos por empresa_id y sucursal_id
SELECT 
  empresa_id,
  sucursal_id,
  COUNT(*) as total_pagos,
  SUM(monto) as total_monto
FROM pagos
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY empresa_id, sucursal_id
ORDER BY total_pagos DESC;

