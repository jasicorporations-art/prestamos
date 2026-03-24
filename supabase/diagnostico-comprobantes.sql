-- DIAGNÓSTICO: ejecutar en Supabase SQL Editor y compartir el resultado

-- 1. Ver qué hay en foto_comprobante (últimas 5 notificaciones)
SELECT
  id,
  foto_comprobante,
  estado,
  id_empresa,
  empresa_id,
  created_at
FROM pagos_pendientes_verificacion
ORDER BY created_at DESC
LIMIT 5;

-- 2. Ver si el bucket existe y si es público
SELECT id, name, public, created_at
FROM storage.buckets
WHERE name = 'comprobantes_pagos';

-- 3. Ver archivos en el bucket (últimos 10)
SELECT name, bucket_id, created_at, metadata
FROM storage.objects
WHERE bucket_id = 'comprobantes_pagos'
ORDER BY created_at DESC
LIMIT 10;
