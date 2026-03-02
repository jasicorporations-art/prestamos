-- Migración: Agregar tipo_plazo y campos de frecuencia a la vista mi_ruta_de_hoy
-- para habilitar el filtrado dinámico de "Mi Ruta de Hoy"
-- Ejecutar en Supabase SQL Editor

CREATE OR REPLACE VIEW mi_ruta_de_hoy AS
SELECT 
  v.id,
  v.numero_prestamo,
  v.monto_total,
  v.saldo_pendiente,
  v.cantidad_cuotas,
  v.fecha_venta,
  v.tipo_plazo,
  v.dia_pago_mensual,
  v.dia_pago_semanal,
  v.fecha_inicio_quincenal,
  v.ruta_id,
  v.orden_visita,
  v.status,
  v.sucursal_id,
  v.compania_id,
  v.empresa_id,
  v.app_id,
  r.nombre AS ruta_nombre,
  r.sucursal_id AS ruta_sucursal_id,
  c.id AS cliente_id,
  c.nombre_completo AS cliente_nombre,
  c.cedula AS cliente_cedula,
  c.celular AS cliente_celular,
  c.direccion AS cliente_direccion,
  m.id AS motor_id,
  m.marca AS motor_marca,
  m.modelo AS motor_modelo,
  m.matricula AS motor_matricula
FROM ventas v
LEFT JOIN rutas r ON v.ruta_id = r.id
LEFT JOIN clientes c ON v.cliente_id = c.id
LEFT JOIN motores m ON v.motor_id = m.id
WHERE v.status = 'active'
  AND (v.saldo_pendiente IS NULL OR v.saldo_pendiente > 0)
  AND v.ruta_id IS NOT NULL
ORDER BY v.ruta_id, v.orden_visita ASC NULLS LAST;
