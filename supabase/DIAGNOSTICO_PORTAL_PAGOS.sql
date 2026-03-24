-- =============================================================================
-- DIAGNOSTICO: Por qué no se ven pagos en el portal de cliente
-- Ejecutar en Supabase → SQL Editor
-- Reemplaza 'TU-EMPRESA-UUID' con el UUID real de la empresa
-- =============================================================================

-- 1) Ver todas las empresas registradas
SELECT id, nombre, created_at
FROM empresas
ORDER BY created_at DESC
LIMIT 10;

-- 2) Ver clientes de la empresa (reemplaza el UUID)
-- SELECT id, nombre_completo, cedula, empresa_id
-- FROM clientes
-- WHERE empresa_id = 'TU-EMPRESA-UUID'
-- ORDER BY created_at DESC LIMIT 20;

-- 3) Ver ventas de los clientes
-- SELECT v.id, v.cliente_id, c.nombre_completo, v.empresa_id,
--        v.saldo_pendiente, v.status, v.fecha_venta
-- FROM ventas v
-- JOIN clientes c ON c.id = v.cliente_id
-- WHERE v.empresa_id = 'TU-EMPRESA-UUID'
-- ORDER BY v.fecha_venta DESC LIMIT 20;

-- 4) Ver pagos registrados
-- SELECT p.id, p.venta_id, p.monto, p.fecha_pago, p.empresa_id
-- FROM pagos p
-- WHERE p.empresa_id = 'TU-EMPRESA-UUID'
-- ORDER BY p.fecha_pago DESC LIMIT 20;

-- 5) Ver notificaciones pendientes del portal
-- SELECT n.id, n.id_prestamo, n.id_cliente, n.monto,
--        n.estado, n.fecha_notificacion, n.id_empresa, n.empresa_id
-- FROM pagos_pendientes_verificacion n
-- WHERE n.id_empresa = 'TU-EMPRESA-UUID'
--    OR n.empresa_id = 'TU-EMPRESA-UUID'
-- ORDER BY n.fecha_notificacion DESC LIMIT 20;

-- ── DIAGNÓSTICO RÁPIDO SIN UUID ──────────────────────────────────────────────
-- Ejecuta esto para ver el estado general:

SELECT
  'empresas' as tabla, COUNT(*)::text as total FROM empresas
UNION ALL
SELECT 'clientes', COUNT(*)::text FROM clientes
UNION ALL
SELECT 'ventas', COUNT(*)::text FROM ventas
UNION ALL
SELECT 'pagos', COUNT(*)::text FROM pagos
UNION ALL
SELECT 'pagos_pendientes_verificacion', COUNT(*)::text FROM pagos_pendientes_verificacion;

-- ── VER COLUMNAS DE LA TABLA PAGOS ──────────────────────────────────────────
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pagos'
ORDER BY ordinal_position;

-- ── VER COLUMNAS DE LA TABLA VENTAS ─────────────────────────────────────────
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ventas'
ORDER BY ordinal_position;

-- ── VER COLUMNAS DE pagos_pendientes_verificacion ───────────────────────────
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pagos_pendientes_verificacion'
ORDER BY ordinal_position;

-- ── VERIFICAR PAGOS HUERFANOS (pagos sin venta con empresa) ─────────────────
-- Si este query devuelve filas, hay pagos con empresa_id diferente al de las ventas
SELECT p.id, p.venta_id, p.empresa_id as pago_empresa_id,
       v.empresa_id as venta_empresa_id, p.monto, p.fecha_pago
FROM pagos p
LEFT JOIN ventas v ON v.id = p.venta_id
WHERE p.empresa_id IS DISTINCT FROM v.empresa_id
LIMIT 20;
