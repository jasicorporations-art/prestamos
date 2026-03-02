-- Script para verificar el estado de RLS en las tablas de cajas
-- Ejecuta este script en Supabase SQL Editor

-- Verificar que las tablas existen y el estado de RLS
SELECT 
  tablename,
  rowsecurity as "RLS Habilitado"
FROM pg_tables 
WHERE tablename IN ('cajas', 'movimientos_caja')
ORDER BY tablename;

-- Verificar la estructura de la tabla cajas
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'cajas'
ORDER BY ordinal_position;

-- Si RLS está habilitado y quieres deshabilitarlo, ejecuta:
-- ALTER TABLE cajas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE movimientos_caja DISABLE ROW LEVEL SECURITY;

-- Verificar si hay políticas RLS activas en las tablas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('cajas', 'movimientos_caja');

