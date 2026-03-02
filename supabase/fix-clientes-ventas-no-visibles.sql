-- ========================================
-- Solución: Clientes y préstamos no se muestran
-- ========================================
-- Ejecutar en Supabase SQL Editor
-- 
-- Este script corrige datos donde falta empresa_id, compania_id o app_id,
-- que causan que no se muestren en la app.

-- 1. Asegurar que empresa_id y compania_id estén sincronizados
-- Si tienes compania_id pero no empresa_id, copiar
UPDATE clientes SET empresa_id = compania_id WHERE (empresa_id IS NULL OR trim(empresa_id) = '') AND compania_id IS NOT NULL;
UPDATE motores  SET empresa_id = compania_id WHERE (empresa_id IS NULL OR trim(empresa_id) = '') AND compania_id IS NOT NULL;
UPDATE ventas   SET empresa_id = compania_id WHERE (empresa_id IS NULL OR trim(empresa_id) = '') AND compania_id IS NOT NULL;
UPDATE pagos    SET empresa_id = compania_id WHERE (empresa_id IS NULL OR trim(empresa_id) = '') AND compania_id IS NOT NULL;

-- Si tienes empresa_id pero no compania_id, copiar
UPDATE clientes SET compania_id = empresa_id WHERE (compania_id IS NULL OR trim(compania_id) = '') AND empresa_id IS NOT NULL;
UPDATE motores  SET compania_id = empresa_id WHERE (compania_id IS NULL OR trim(compania_id) = '') AND empresa_id IS NOT NULL;
UPDATE ventas   SET compania_id = empresa_id WHERE (compania_id IS NULL OR trim(compania_id) = '') AND empresa_id IS NOT NULL;
UPDATE pagos    SET compania_id = empresa_id WHERE (compania_id IS NULL OR trim(compania_id) = '') AND empresa_id IS NOT NULL;

-- 2. Rellenar app_id donde falte (para que withAppIdFilter no filtre los datos)
-- IMPORTANTE: Cambia 'prestamos' por tu NEXT_PUBLIC_APP_ID si es diferente
UPDATE clientes SET app_id = COALESCE(app_id, 'prestamos') WHERE app_id IS NULL;
UPDATE motores  SET app_id = COALESCE(app_id, 'prestamos') WHERE app_id IS NULL;
UPDATE ventas   SET app_id = COALESCE(app_id, 'prestamos') WHERE app_id IS NULL;
UPDATE pagos    SET app_id = COALESCE(app_id, 'prestamos') WHERE app_id IS NULL;

-- 3. Copiar empresa_id/compania_id desde PAGOS a VENTAS vinculadas
-- (Los pagos sí se muestran porque tienen empresa_id; las ventas pueden tenerlo NULL)
UPDATE ventas v
SET 
  empresa_id = COALESCE(v.empresa_id, p.empresa_id),
  compania_id = COALESCE(v.compania_id, p.compania_id),
  app_id = COALESCE(v.app_id, p.app_id, 'prestamos')
FROM (
  SELECT DISTINCT ON (venta_id) venta_id, empresa_id, compania_id, app_id
  FROM pagos
  WHERE (empresa_id IS NOT NULL OR compania_id IS NOT NULL)
  ORDER BY venta_id, created_at DESC NULLS LAST
) p
WHERE p.venta_id = v.id
  AND (v.empresa_id IS NULL OR v.compania_id IS NULL);

-- Copiar desde ventas a clientes (ventas ya corregidas arriba)
UPDATE clientes c
SET 
  empresa_id = COALESCE(c.empresa_id, v.empresa_id),
  compania_id = COALESCE(c.compania_id, v.compania_id),
  app_id = COALESCE(c.app_id, v.app_id, 'prestamos')
FROM (
  SELECT DISTINCT ON (cliente_id) cliente_id, empresa_id, compania_id, app_id
  FROM ventas
  WHERE (empresa_id IS NOT NULL OR compania_id IS NOT NULL) AND cliente_id IS NOT NULL
  ORDER BY cliente_id, fecha_venta DESC NULLS LAST
) v
WHERE v.cliente_id = c.id
  AND (c.empresa_id IS NULL OR c.compania_id IS NULL);

-- 4. Asignar empresa_id/compania_id a registros huérfanos (ambos NULL)
-- Usa la primera empresa de la tabla empresas como fallback
UPDATE clientes c
SET empresa_id = sub.empresa_id, compania_id = sub.empresa_id, app_id = COALESCE(c.app_id, 'prestamos')
FROM (SELECT id::text AS empresa_id FROM empresas LIMIT 1) sub
WHERE c.empresa_id IS NULL AND c.compania_id IS NULL;

UPDATE ventas v
SET empresa_id = sub.empresa_id, compania_id = sub.empresa_id, app_id = COALESCE(v.app_id, 'prestamos')
FROM (SELECT id::text AS empresa_id FROM empresas LIMIT 1) sub
WHERE v.empresa_id IS NULL AND v.compania_id IS NULL;

-- 5. Verificar perfiles: asegurar que empresa_id/compania_id coincidan con los datos
-- Ver perfiles con empresa_id o compania_id (para diagnóstico)
-- SELECT id, user_id, nombre_completo, rol, empresa_id, compania_id FROM perfiles WHERE activo = true;
