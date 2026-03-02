-- Script para verificar el estado de RLS en la tabla pagos
-- y verificar si hay políticas que bloqueen la inserción

-- 1. Verificar si RLS está habilitado en pagos
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'pagos';

-- 2. Ver todas las políticas de RLS en la tabla pagos
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'pagos';

-- 3. Verificar la estructura de la tabla pagos
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pagos'
ORDER BY ordinal_position;

-- 4. Verificar si hay pagos con empresa_id NULL
SELECT 
  COUNT(*) as total_pagos,
  COUNT(empresa_id) as pagos_con_empresa_id,
  COUNT(*) - COUNT(empresa_id) as pagos_sin_empresa_id,
  COUNT(sucursal_id) as pagos_con_sucursal_id,
  COUNT(*) - COUNT(sucursal_id) as pagos_sin_sucursal_id
FROM pagos
WHERE created_at >= NOW() - INTERVAL '7 days';

-- 5. Ver pagos recientes con problemas de empresa_id o sucursal_id
SELECT 
  p.id,
  p.venta_id,
  p.monto,
  p.empresa_id,
  p.sucursal_id,
  p.usuario_que_cobro,
  p.sucursal_donde_se_cobro,
  p.created_at,
  v.empresa_id as venta_empresa_id,
  v.sucursal_id as venta_sucursal_id,
  CASE 
    WHEN p.empresa_id IS NULL THEN '❌ empresa_id NULL'
    WHEN p.empresa_id != v.empresa_id THEN '⚠️ empresa_id no coincide'
    ELSE '✅ OK'
  END as estado
FROM pagos p
LEFT JOIN ventas v ON p.venta_id = v.id
WHERE p.created_at >= NOW() - INTERVAL '7 days'
  AND (p.empresa_id IS NULL OR p.sucursal_id IS NULL OR p.empresa_id != v.empresa_id)
ORDER BY p.created_at DESC
LIMIT 20;

-- 6. Si RLS está habilitado y está bloqueando, deshabilitarlo temporalmente
-- (Solo ejecutar si es necesario para debugging)
-- ALTER TABLE pagos DISABLE ROW LEVEL SECURITY;

-- 7. Verificar permisos de inserción (simular)
-- Esto mostrará si hay restricciones que impidan la inserción
SELECT 
  has_table_privilege('authenticated', 'pagos', 'INSERT') as puede_insertar,
  has_table_privilege('authenticated', 'pagos', 'SELECT') as puede_leer,
  has_table_privilege('authenticated', 'pagos', 'UPDATE') as puede_actualizar;

