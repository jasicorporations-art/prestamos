-- ========================================
-- RESUMEN DE MOVIMIENTOS DE CAJA
-- ========================================
-- Ejecutar este script en Supabase SQL Editor
-- Crea una vista con totales diarios/semanales/mensuales/anuales

CREATE OR REPLACE VIEW movimientos_caja_resumen AS
SELECT
  m.*,
  p.nombre_completo AS usuario_nombre,
  u.email AS usuario_email,
  SUM(CASE WHEN m.tipo = 'Entrada' THEN m.monto ELSE 0 END)
    OVER (PARTITION BY m.sucursal_id, date_trunc('day', m.fecha_hora)) AS ingresos_dia,
  SUM(CASE WHEN m.tipo = 'Salida' THEN m.monto ELSE 0 END)
    OVER (PARTITION BY m.sucursal_id, date_trunc('day', m.fecha_hora)) AS salidas_dia,
  SUM(CASE WHEN m.tipo = 'Entrada' THEN m.monto ELSE 0 END)
    OVER (PARTITION BY m.sucursal_id, date_trunc('week', m.fecha_hora)) AS ingresos_semana,
  SUM(CASE WHEN m.tipo = 'Salida' THEN m.monto ELSE 0 END)
    OVER (PARTITION BY m.sucursal_id, date_trunc('week', m.fecha_hora)) AS salidas_semana,
  SUM(CASE WHEN m.tipo = 'Entrada' THEN m.monto ELSE 0 END)
    OVER (PARTITION BY m.sucursal_id, date_trunc('month', m.fecha_hora)) AS ingresos_mes,
  SUM(CASE WHEN m.tipo = 'Salida' THEN m.monto ELSE 0 END)
    OVER (PARTITION BY m.sucursal_id, date_trunc('month', m.fecha_hora)) AS salidas_mes,
  SUM(CASE WHEN m.tipo = 'Entrada' THEN m.monto ELSE 0 END)
    OVER (PARTITION BY m.sucursal_id, date_trunc('year', m.fecha_hora)) AS ingresos_anio,
  SUM(CASE WHEN m.tipo = 'Salida' THEN m.monto ELSE 0 END)
    OVER (PARTITION BY m.sucursal_id, date_trunc('year', m.fecha_hora)) AS salidas_anio
FROM movimientos_caja m
LEFT JOIN perfiles p ON p.user_id = m.usuario_id
LEFT JOIN auth.users u ON u.id = m.usuario_id;

COMMENT ON VIEW movimientos_caja_resumen IS 'Movimientos de caja con usuario y totales por periodo';
