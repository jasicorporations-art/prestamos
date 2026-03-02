-- PARTE 2 de 3: Backfill de datos
-- Ejecutar después de PARTE 1.

BEGIN;

UPDATE perfiles p SET empresa_id = resolve_empresa_uuid(COALESCE(p.empresa_id, p.compania_id))
WHERE (p.empresa_id IS NULL OR p.empresa_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
  AND (p.empresa_id IS NOT NULL OR p.compania_id IS NOT NULL);

UPDATE perfiles p SET compania_id = empresa_id WHERE compania_id IS NULL OR compania_id != empresa_id;

UPDATE ventas v SET empresa_id = COALESCE(v.empresa_id, p.empresa_id), compania_id = COALESCE(v.compania_id, p.compania_id), app_id = COALESCE(v.app_id, p.app_id)
FROM (SELECT DISTINCT ON (venta_id) venta_id, empresa_id, compania_id, app_id FROM pagos WHERE empresa_id IS NOT NULL OR compania_id IS NOT NULL ORDER BY venta_id, created_at DESC NULLS LAST) p
WHERE p.venta_id = v.id AND (v.empresa_id IS NULL OR v.compania_id IS NULL);

UPDATE ventas v SET empresa_id = resolve_empresa_uuid(v.empresa_id)
WHERE v.empresa_id IS NOT NULL AND v.empresa_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

UPDATE ventas v SET compania_id = empresa_id WHERE compania_id IS NULL OR compania_id != empresa_id;

UPDATE clientes c SET empresa_id = COALESCE(c.empresa_id, v.empresa_id), compania_id = COALESCE(c.compania_id, v.compania_id), app_id = COALESCE(c.app_id, v.app_id)
FROM (SELECT DISTINCT ON (cliente_id) cliente_id, empresa_id, compania_id, app_id FROM ventas WHERE (empresa_id IS NOT NULL OR compania_id IS NOT NULL) AND cliente_id IS NOT NULL ORDER BY cliente_id, fecha_venta DESC NULLS LAST) v
WHERE v.cliente_id = c.id AND (c.empresa_id IS NULL OR c.compania_id IS NULL);

UPDATE motores m SET empresa_id = COALESCE(m.empresa_id, v.empresa_id), compania_id = COALESCE(m.compania_id, v.compania_id), app_id = COALESCE(m.app_id, v.app_id)
FROM ventas v WHERE v.motor_id = m.id AND (m.empresa_id IS NULL OR m.compania_id IS NULL);

UPDATE clientes c SET empresa_id = resolve_empresa_uuid(c.empresa_id)
WHERE c.empresa_id IS NOT NULL AND c.empresa_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

UPDATE clientes c SET compania_id = empresa_id WHERE compania_id IS NULL OR compania_id != empresa_id;

UPDATE motores m SET empresa_id = resolve_empresa_uuid(m.empresa_id)
WHERE m.empresa_id IS NOT NULL AND m.empresa_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

UPDATE motores m SET compania_id = empresa_id WHERE compania_id IS NULL OR compania_id != empresa_id;

UPDATE clientes c SET empresa_id = sub.eid, compania_id = sub.eid, app_id = COALESCE(c.app_id, 'prestamos')
FROM (SELECT id::text AS eid FROM empresas LIMIT 1) sub WHERE c.empresa_id IS NULL AND c.compania_id IS NULL;

UPDATE ventas v SET empresa_id = sub.eid, compania_id = sub.eid, app_id = COALESCE(v.app_id, 'prestamos')
FROM (SELECT id::text AS eid FROM empresas LIMIT 1) sub WHERE v.empresa_id IS NULL AND v.compania_id IS NULL;

UPDATE pagos p SET empresa_id = sub.eid, compania_id = sub.eid, app_id = COALESCE(p.app_id, 'prestamos')
FROM (SELECT id::text AS eid FROM empresas LIMIT 1) sub WHERE p.empresa_id IS NULL AND p.compania_id IS NULL;

COMMIT;
