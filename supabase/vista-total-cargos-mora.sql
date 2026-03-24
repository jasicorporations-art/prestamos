-- ========================================
-- VISTA: Total Cargos de Mora (Dashboard)
-- ========================================
-- El cálculo pesado se hace en el servidor; el dashboard solo lee una cifra.
-- Lógica: 3.7% por cada cuota vencida (no pagada), por venta activa con saldo > 0.
-- Mora pendiente = SUM(mora_generada - mora_abonada) por venta.
-- Ejecutar en Supabase SQL Editor.

BEGIN;

-- Eliminar vista si existe (para idempotencia)
DROP VIEW IF EXISTS vista_total_cargos_mora;

CREATE VIEW vista_total_cargos_mora AS
WITH ventas_activas AS (
  SELECT id, cantidad_cuotas, saldo_pendiente, fecha_venta, mora_abonada
  FROM ventas
  WHERE LOWER(COALESCE(status, 'active')) IN ('active', 'activo', 'en_mora')
    AND saldo_pendiente > 0
),
cuotas_pagadas AS (
  SELECT venta_id, numero_cuota
  FROM pagos
  WHERE numero_cuota IS NOT NULL
),
series_cuotas AS (
  SELECT v.id AS venta_id,
         v.cantidad_cuotas,
         v.saldo_pendiente,
         v.fecha_venta,
         v.mora_abonada,
         n.n AS numero_cuota
  FROM ventas_activas v
  CROSS JOIN LATERAL generate_series(1, v.cantidad_cuotas) AS n(n)
  WHERE NOT EXISTS (
    SELECT 1 FROM cuotas_pagadas cp
    WHERE cp.venta_id = v.id AND cp.numero_cuota = n.n
  )
),
cuotas_pendientes AS (
  SELECT venta_id, COUNT(*) AS cnt
  FROM series_cuotas
  GROUP BY venta_id
),
cuotas_con_datos AS (
  SELECT s.venta_id,
         s.numero_cuota,
         s.mora_abonada,
         COALESCE(
           (cd.fecha_pago)::date,
           ((s.fecha_venta AT TIME ZONE 'UTC')::date + (s.numero_cuota || ' months')::interval)::date
         ) AS fecha_vencimiento,
         COALESCE(
           cd.cuota_fija::numeric,
           ROUND((s.saldo_pendiente / cp.cnt)::numeric, 2)
         ) AS monto_cuota
  FROM series_cuotas s
  JOIN cuotas_pendientes cp ON cp.venta_id = s.venta_id
  LEFT JOIN cuotas_detalladas cd ON cd.venta_id = s.venta_id AND cd.numero_cuota = s.numero_cuota
),
mora_por_venta AS (
  SELECT venta_id,
         mora_abonada,
         ROUND(
           SUM(
             CASE
               WHEN CURRENT_DATE > fecha_vencimiento
               THEN (monto_cuota * 3.7 / 100)
               ELSE 0
             END
           )::numeric,
           2
         ) AS mora_generada
  FROM cuotas_con_datos
  GROUP BY venta_id, mora_abonada
)
SELECT COALESCE(
         ROUND(
           SUM(GREATEST(0, mora_generada - COALESCE(mora_abonada::numeric, 0)))::numeric,
           2
         ),
         0
       ) AS total_cargos_mora
FROM mora_por_venta;

COMMENT ON VIEW vista_total_cargos_mora IS 'Total de cargos de mora pendientes (mora generada - mora abonada) para TODAS las ventas activas. NO filtra por empresa/tenant. El Dashboard NO usa esta vista: usa getTotalMoraPendienteCartera() para mostrar solo la mora de la empresa del usuario. Si en el futuro se usa esta vista, crear una versión que filtre por empresa_id o usar RLS en ventas.';

COMMIT;
