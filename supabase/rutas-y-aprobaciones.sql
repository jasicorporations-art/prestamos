-- ========================================
-- RUTAS DE COBRO Y FLUJOS DE APROBACIÓN
-- ========================================
-- Ejecutar en Supabase SQL Editor
-- Este script implementa rutas de cobro, status de préstamos y solicitudes de renovación

BEGIN;

-- 1. Crear tabla RUTAS (vinculada a sucursales)
CREATE TABLE IF NOT EXISTS rutas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rutas_sucursal ON rutas(sucursal_id);

-- 2. Agregar columnas a VENTAS (préstamos): ruta_id, orden_visita, status
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS ruta_id UUID REFERENCES rutas(id) ON DELETE SET NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS orden_visita INTEGER DEFAULT 0;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
  CHECK (status IN ('pending', 'active', 'rejected', 'completed'));

-- Para ventas existentes sin status, asignar 'active' (préstamos ya activos)
UPDATE ventas SET status = 'active' WHERE status IS NULL;

-- Establecer NOT NULL para nuevas filas (mantener default)
ALTER TABLE ventas ALTER COLUMN status SET DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_ventas_ruta ON ventas(ruta_id);
CREATE INDEX IF NOT EXISTS idx_ventas_status ON ventas(status);
CREATE INDEX IF NOT EXISTS idx_ventas_orden_visita ON ventas(ruta_id, orden_visita);

-- 3. Crear tabla SOLICITUDES_CAMBIO (renovaciones pendientes de aprobación)
CREATE TABLE IF NOT EXISTS solicitudes_cambio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'renovacion' CHECK (tipo IN ('renovacion', 'nuevo')),
  monto_solicitado DECIMAL(10, 2),
  plazo_solicitado INTEGER,
  datos_extra JSONB,
  solicitado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  empresa_id VARCHAR(255),
  compania_id VARCHAR(255),
  app_id TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'aprobada', 'rechazada')),
  aprobado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_status ON solicitudes_cambio(status);
CREATE INDEX IF NOT EXISTS idx_solicitudes_venta ON solicitudes_cambio(venta_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_created ON solicitudes_cambio(created_at DESC);

-- 4. Vista "Mi Ruta de Hoy": préstamos activos ordenados por orden_visita
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

COMMENT ON VIEW mi_ruta_de_hoy IS 'Préstamos activos en ruta de cobro, ordenados por orden_visita';

-- 5. Función para aprobar préstamo: cambiar status a active y generar movimiento de salida
CREATE OR REPLACE FUNCTION aprobar_prestamo(p_venta_id UUID, p_usuario_id UUID DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  v_venta RECORD;
  v_caja_id UUID;
  v_sucursal_id UUID;
  v_monto DECIMAL(10,2);
BEGIN
  -- Obtener venta
  SELECT * INTO v_venta FROM ventas WHERE id = p_venta_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no encontrada: %', p_venta_id;
  END IF;

  -- Actualizar status a active
  UPDATE ventas SET status = 'active', updated_at = NOW() WHERE id = p_venta_id;

  -- Generar movimiento de salida de dinero (desembolso del préstamo)
  -- Buscar caja abierta de la sucursal
  v_sucursal_id := COALESCE(v_venta.sucursal_id, (SELECT sucursal_id FROM rutas WHERE id = v_venta.ruta_id LIMIT 1));
  v_monto := v_venta.monto_total;

  IF v_sucursal_id IS NOT NULL AND v_monto > 0 THEN
    SELECT id INTO v_caja_id FROM cajas 
    WHERE sucursal_id = v_sucursal_id AND estado = 'Abierta' AND fecha = CURRENT_DATE 
    LIMIT 1;
    
    IF v_caja_id IS NOT NULL THEN
      INSERT INTO movimientos_caja (caja_id, sucursal_id, usuario_id, tipo, monto, concepto, fecha_hora)
      VALUES (
        v_caja_id,
        v_sucursal_id,
        COALESCE(p_usuario_id, auth.uid()),
        'Salida',
        v_monto,
        'Desembolso préstamo #' || COALESCE(v_venta.numero_prestamo, p_venta_id::text),
        NOW()
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Asignar ruta a perfiles (para que cada empleado tenga su ruta en Mi Ruta de Hoy)
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS ruta_id UUID REFERENCES rutas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_perfiles_ruta ON perfiles(ruta_id);
COMMENT ON COLUMN perfiles.ruta_id IS 'Ruta de cobro asignada al empleado (para Mi Ruta de Hoy)';

-- 7. Habilitar Realtime para badge del Panel Admin (solicitudes y préstamos pendientes)
-- Si falla, habilitar manualmente en Dashboard > Database > Replication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE solicitudes_cambio;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Realtime: añade solicitudes_cambio manualmente en Dashboard si es necesario';
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE ventas;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Realtime: ventas puede estar ya en la publicación';
END $$;

COMMIT;
