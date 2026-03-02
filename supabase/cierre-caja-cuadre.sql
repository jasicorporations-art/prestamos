-- ========================================
-- SISTEMA DE CIERRE DE CAJA Y CUADRE DIARIO
-- ========================================
-- Ejecutar este script en Supabase SQL Editor
-- Este script implementa el sistema de gestión de cajas por sucursal

-- 1. Crear tabla de Cajas
CREATE TABLE IF NOT EXISTS cajas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  monto_apertura DECIMAL(10, 2) NOT NULL DEFAULT 0,
  monto_cierre_esperado DECIMAL(10, 2) NOT NULL DEFAULT 0,
  monto_cierre_real DECIMAL(10, 2),
  diferencia DECIMAL(10, 2), -- Positivo = sobrante, Negativo = faltante
  estado VARCHAR(20) NOT NULL DEFAULT 'Abierta' CHECK (estado IN ('Abierta', 'Cerrada')),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla de Movimientos de Caja
CREATE TABLE IF NOT EXISTS movimientos_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_id UUID NOT NULL REFERENCES cajas(id) ON DELETE CASCADE,
  sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Entrada', 'Salida')),
  monto DECIMAL(10, 2) NOT NULL,
  concepto VARCHAR(255) NOT NULL, -- Ej: "Pago de luz", "Compra de café", "Aporte de capital"
  observaciones TEXT,
  fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_cajas_sucursal ON cajas(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_cajas_fecha ON cajas(fecha);
CREATE INDEX IF NOT EXISTS idx_cajas_estado ON cajas(estado);
CREATE INDEX IF NOT EXISTS idx_cajas_usuario ON cajas(usuario_id);

-- Índice único parcial: solo una caja abierta por sucursal y fecha
CREATE UNIQUE INDEX IF NOT EXISTS idx_cajas_abierta_única 
ON cajas(sucursal_id, fecha) 
WHERE estado = 'Abierta';
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_caja ON movimientos_caja(caja_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_sucursal ON movimientos_caja(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_fecha ON movimientos_caja(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_tipo ON movimientos_caja(tipo);

-- 4. Trigger para actualizar updated_at en cajas
DROP TRIGGER IF EXISTS update_cajas_updated_at ON cajas;
CREATE TRIGGER update_cajas_updated_at BEFORE UPDATE ON cajas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Función para calcular el monto esperado de cierre
-- Esta función calcula: monto_apertura + ingresos_del_dia - salidas_del_dia
CREATE OR REPLACE FUNCTION calcular_monto_cierre_esperado(p_caja_id UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_monto_apertura DECIMAL(10, 2);
  v_ingresos DECIMAL(10, 2);
  v_salidas DECIMAL(10, 2);
  v_monto_esperado DECIMAL(10, 2);
BEGIN
  -- Obtener monto de apertura
  SELECT monto_apertura INTO v_monto_apertura
  FROM cajas
  WHERE id = p_caja_id;
  
  -- Calcular ingresos del día (pagos registrados en la caja)
  -- Considerar pagos desde la apertura de la caja hasta el final del día
  SELECT COALESCE(SUM(monto), 0) INTO v_ingresos
  FROM pagos
  WHERE sucursal_donde_se_cobro = (
    SELECT sucursal_id FROM cajas WHERE id = p_caja_id
  )
  AND DATE(fecha_hora) = (
    SELECT fecha FROM cajas WHERE id = p_caja_id
  )
  AND (fecha_hora >= (
    SELECT created_at FROM cajas WHERE id = p_caja_id
  ) OR created_at IS NULL);
  
  -- Calcular salidas manuales del día
  SELECT COALESCE(SUM(
    CASE WHEN tipo = 'Salida' THEN monto ELSE 0 END
  ), 0) INTO v_salidas
  FROM movimientos_caja
  WHERE caja_id = p_caja_id;
  
  -- Calcular monto esperado
  v_monto_esperado := v_monto_apertura + v_ingresos - v_salidas;
  
  RETURN v_monto_esperado;
END;
$$ LANGUAGE plpgsql;

-- 6. Función para actualizar automáticamente monto_cierre_esperado
CREATE OR REPLACE FUNCTION actualizar_monto_cierre_esperado()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar todas las cajas abiertas del día cuando se registra un pago
  UPDATE cajas
  SET monto_cierre_esperado = calcular_monto_cierre_esperado(id),
      updated_at = NOW()
  WHERE estado = 'Abierta'
  AND sucursal_id = NEW.sucursal_donde_se_cobro
  AND fecha = CURRENT_DATE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para actualizar monto_cierre_esperado cuando se registra un pago
DROP TRIGGER IF EXISTS trigger_actualizar_monto_cierre ON pagos;
CREATE TRIGGER trigger_actualizar_monto_cierre
  AFTER INSERT ON pagos
  FOR EACH ROW
  WHEN (NEW.sucursal_donde_se_cobro IS NOT NULL)
  EXECUTE FUNCTION actualizar_monto_cierre_esperado();

-- 8. Función para actualizar monto_cierre_esperado cuando se crea un movimiento de caja
CREATE OR REPLACE FUNCTION actualizar_monto_cierre_por_movimiento()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cajas
  SET monto_cierre_esperado = calcular_monto_cierre_esperado(NEW.caja_id),
      updated_at = NOW()
  WHERE id = NEW.caja_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger para actualizar cuando se crea un movimiento
DROP TRIGGER IF EXISTS trigger_actualizar_monto_por_movimiento ON movimientos_caja;
CREATE TRIGGER trigger_actualizar_monto_por_movimiento
  AFTER INSERT OR UPDATE OR DELETE ON movimientos_caja
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_monto_cierre_por_movimiento();

-- 10. Crear funciones auxiliares para políticas RLS (deben crearse ANTES de las políticas)

-- Función auxiliar para obtener sucursal_id del usuario actual (evita recursión)
-- SECURITY DEFINER permite que la función ejecute con permisos de superusuario
DROP FUNCTION IF EXISTS get_user_sucursal_id() CASCADE;
CREATE OR REPLACE FUNCTION get_user_sucursal_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_sucursal_id UUID;
BEGIN
  -- Deshabilitar RLS temporalmente dentro de la función para evitar recursión
  SELECT sucursal_id INTO v_sucursal_id
  FROM perfiles
  WHERE user_id = auth.uid() AND activo = true
  LIMIT 1;
  RETURN v_sucursal_id;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

-- Función auxiliar para verificar si el usuario es Admin (evita recursión)
DROP FUNCTION IF EXISTS is_user_admin() CASCADE;
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_rol VARCHAR(50);
BEGIN
  -- Deshabilitar RLS temporalmente dentro de la función para evitar recursión
  SELECT rol INTO v_rol
  FROM perfiles
  WHERE user_id = auth.uid() AND activo = true
  LIMIT 1;
  RETURN COALESCE(v_rol = 'Admin', false);
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$;

-- Comentarios para las funciones
COMMENT ON FUNCTION get_user_sucursal_id() IS 'Obtiene la sucursal_id del usuario actual autenticado';
COMMENT ON FUNCTION is_user_admin() IS 'Verifica si el usuario actual es Admin';

-- 11. Configurar ROW LEVEL SECURITY (RLS) para las tablas de cajas
-- Primero, asegurar que perfiles y sucursales tengan RLS configurado correctamente

-- Habilitar RLS en perfiles si no está habilitado (necesario para que las políticas de cajas funcionen)
ALTER TABLE IF EXISTS perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sucursales ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes de perfiles si existen (para evitar errores)
DROP POLICY IF EXISTS "Users can view their own profile" ON perfiles;
DROP POLICY IF EXISTS "Users can view profiles of their empresa" ON perfiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON perfiles;

-- Política: Los usuarios pueden ver su propio perfil (sin recursión)
CREATE POLICY "Users can view their own profile"
  ON perfiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- IMPORTANTE: Para evitar recursión infinita, solo permitimos que los usuarios vean su propio perfil.
-- Las políticas de otras tablas que necesiten verificar perfiles deben usar funciones SECURITY DEFINER
-- o las consultas deben hacerse en el cliente después de obtener el perfil del usuario actual.

-- Por ahora, deshabilitamos RLS en perfiles para permitir que las consultas funcionen.
-- En producción, considera usar funciones SECURITY DEFINER para operaciones administrativas.
-- Alternativamente, puedes mantener RLS solo para INSERT/UPDATE/DELETE, no para SELECT.
ALTER TABLE IF EXISTS perfiles DISABLE ROW LEVEL SECURITY;

-- O si prefieres mantener RLS habilitado pero solo con la política básica:
-- ALTER TABLE IF EXISTS perfiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own profile"
--   ON perfiles
--   FOR SELECT
--   TO authenticated
--   USING (user_id = auth.uid());

-- Eliminar políticas existentes de sucursales si existen
DROP POLICY IF EXISTS "Users can view sucursales of their empresa" ON sucursales;

-- IMPORTANTE: Para evitar recursión infinita en las políticas de cajas que dependen de perfiles,
-- deshabilitamos RLS en sucursales temporalmente, o usamos una política simple.
-- Las sucursales se filtran por empresa_id en el código de la aplicación.

-- Por ahora, deshabilitamos RLS en sucursales para permitir que las consultas funcionen.
-- En producción, considera usar funciones SECURITY DEFINER o filtrar en el código de la aplicación.
ALTER TABLE IF EXISTS sucursales DISABLE ROW LEVEL SECURITY;

-- O si prefieres mantener RLS habilitado, necesitarías una función SECURITY DEFINER:
-- CREATE OR REPLACE FUNCTION get_user_empresa_id()
-- RETURNS VARCHAR(255)
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- STABLE
-- AS $$
-- DECLARE
--   v_empresa_id VARCHAR(255);
-- BEGIN
--   SELECT empresa_id INTO v_empresa_id
--   FROM perfiles
--   WHERE user_id = auth.uid() AND activo = true
--   LIMIT 1;
--   RETURN v_empresa_id;
-- END;
-- $$;
-- 
-- CREATE POLICY "Users can view sucursales of their empresa"
--   ON sucursales
--   FOR SELECT
--   TO authenticated
--   USING (empresa_id = get_user_empresa_id());

-- Habilitar RLS en las tablas de cajas
-- TEMPORALMENTE DESHABILITADO para debugging - habilitar después de probar
-- IMPORTANTE: Asegurarse de que RLS esté deshabilitado para que las consultas funcionen

-- Deshabilitar RLS explícitamente (por si acaso está habilitado)
ALTER TABLE IF EXISTS cajas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS movimientos_caja DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS esté deshabilitado (solo para información, no afecta el funcionamiento)
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('cajas', 'movimientos_caja');

-- Eliminar políticas existentes si existen (para evitar errores)
DROP POLICY IF EXISTS "Users can view cajas of their sucursal" ON cajas;
DROP POLICY IF EXISTS "Users can insert cajas in their sucursal" ON cajas;
DROP POLICY IF EXISTS "Users can update cajas of their sucursal" ON cajas;
DROP POLICY IF EXISTS "Admins can view all cajas" ON cajas;
DROP POLICY IF EXISTS "Users can view movimientos of their caja" ON movimientos_caja;
DROP POLICY IF EXISTS "Users can insert movimientos in their caja" ON movimientos_caja;
DROP POLICY IF EXISTS "Users can update movimientos of their caja" ON movimientos_caja;
DROP POLICY IF EXISTS "Users can delete movimientos of their caja" ON movimientos_caja;

-- Política: Los usuarios pueden ver las cajas de su sucursal
-- Usa funciones SECURITY DEFINER para evitar recursión infinita
-- NOTA: Estas políticas están comentadas porque RLS está deshabilitado temporalmente
-- Descomentar y habilitar RLS cuando estés listo para usar políticas

-- CREATE POLICY "Users can view cajas of their sucursal"
--   ON cajas
--   FOR SELECT
--   TO authenticated
--   USING (
--     (get_user_sucursal_id() IS NOT NULL AND sucursal_id = get_user_sucursal_id())
--     OR is_user_admin() = true
--   );

-- Política: Los administradores pueden ver todas las cajas
-- (Ya está cubierta por la política anterior, pero la dejamos por claridad)
-- Nota: Esta política se combina con la anterior usando OR

-- Política: Los usuarios pueden insertar cajas en su sucursal
CREATE POLICY "Users can insert cajas in their sucursal"
  ON cajas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND (sucursal_id = get_user_sucursal_id() OR is_user_admin())
  );

-- Política: Los usuarios pueden actualizar cajas de su sucursal
CREATE POLICY "Users can update cajas of their sucursal"
  ON cajas
  FOR UPDATE
  TO authenticated
  USING (
    sucursal_id = get_user_sucursal_id() OR is_user_admin()
  )
  WITH CHECK (
    sucursal_id = get_user_sucursal_id() OR is_user_admin()
  );

-- Política: Los usuarios pueden ver movimientos de sus cajas
CREATE POLICY "Users can view movimientos of their caja"
  ON movimientos_caja
  FOR SELECT
  TO authenticated
  USING (
    caja_id IN (
      SELECT id FROM cajas
      WHERE sucursal_id = get_user_sucursal_id() OR is_user_admin()
    )
  );

-- Política: Los usuarios pueden insertar movimientos en sus cajas
CREATE POLICY "Users can insert movimientos in their caja"
  ON movimientos_caja
  FOR INSERT
  TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND caja_id IN (
      SELECT id FROM cajas
      WHERE (sucursal_id = get_user_sucursal_id() OR is_user_admin())
      AND estado = 'Abierta'
    )
  );

-- Política: Los usuarios pueden actualizar movimientos de sus cajas
CREATE POLICY "Users can update movimientos of their caja"
  ON movimientos_caja
  FOR UPDATE
  TO authenticated
  USING (
    caja_id IN (
      SELECT id FROM cajas
      WHERE sucursal_id = get_user_sucursal_id() OR is_user_admin()
    )
  )
  WITH CHECK (
    caja_id IN (
      SELECT id FROM cajas
      WHERE sucursal_id = get_user_sucursal_id() OR is_user_admin()
    )
  );

-- Política: Los usuarios pueden eliminar movimientos de sus cajas (si la caja está abierta)
CREATE POLICY "Users can delete movimientos of their caja"
  ON movimientos_caja
  FOR DELETE
  TO authenticated
  USING (
    caja_id IN (
      SELECT id FROM cajas
      WHERE (sucursal_id = get_user_sucursal_id() OR is_user_admin())
      AND estado = 'Abierta'
    )
  );

-- 11. Comentarios para documentación
COMMENT ON TABLE cajas IS 'Registro de apertura y cierre de caja por sucursal';
COMMENT ON TABLE movimientos_caja IS 'Registro de entradas y salidas manuales de efectivo';
COMMENT ON COLUMN cajas.monto_apertura IS 'Monto con el que se abre la caja al inicio del día';
COMMENT ON COLUMN cajas.monto_cierre_esperado IS 'Monto esperado en caja (apertura + ingresos - salidas)';
COMMENT ON COLUMN cajas.monto_cierre_real IS 'Monto real contado físicamente al cerrar';
COMMENT ON COLUMN cajas.diferencia IS 'Diferencia entre esperado y real (positivo = sobrante, negativo = faltante)';
COMMENT ON COLUMN movimientos_caja.tipo IS 'Entrada: dinero que entra a la caja, Salida: dinero que sale';
COMMENT ON COLUMN movimientos_caja.concepto IS 'Descripción del movimiento (ej: "Pago de luz", "Aporte de capital")';

-- VERIFICACIÓN FINAL: Asegurar que RLS esté deshabilitado en cajas
-- Esto es importante para evitar el error 406
DO $$
BEGIN
  -- Intentar deshabilitar RLS en cajas si existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cajas') THEN
    ALTER TABLE cajas DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS deshabilitado en tabla cajas';
  END IF;
  
  -- Intentar deshabilitar RLS en movimientos_caja si existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movimientos_caja') THEN
    ALTER TABLE movimientos_caja DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS deshabilitado en tabla movimientos_caja';
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error al deshabilitar RLS: %', SQLERRM;
END $$;

-- Script completado
-- NOTA: RLS está deshabilitado temporalmente para permitir que las consultas funcionen.
-- Cuando estés listo para habilitar seguridad, ejecuta:
-- ALTER TABLE cajas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE movimientos_caja ENABLE ROW LEVEL SECURITY;
-- Y descomenta las políticas en este script.

