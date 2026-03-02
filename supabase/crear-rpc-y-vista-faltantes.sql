-- ========================================
-- Crear RPC y vista faltantes (404)
-- ========================================
-- Ejecutar en Supabase SQL Editor
-- Soluciona: get_clientes_creados_total 404, movimientos_caja_resumen 404

-- 1. Columna clientes_creados_total en empresas (si no existe)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS clientes_creados_total INTEGER DEFAULT 0;

-- 2. RPC get_clientes_creados_total
-- Retorna 0 si p_empresa_id es 'SISTEMA' o vacío (super_admin)
CREATE OR REPLACE FUNCTION public.get_clientes_creados_total(p_empresa_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_tiene_acceso BOOLEAN;
BEGIN
  IF p_empresa_id IS NULL OR trim(p_empresa_id) = '' OR trim(p_empresa_id) = 'SISTEMA' THEN
    RETURN 0;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND (p.empresa_id = p_empresa_id OR p.compania_id = p_empresa_id)
  ) OR EXISTS (
    SELECT 1 FROM empresas e WHERE e.id::text = p_empresa_id AND e.user_id = auth.uid()
  ) INTO v_tiene_acceso;

  IF NOT v_tiene_acceso THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(clientes_creados_total, 0) INTO v_total
  FROM empresas
  WHERE id::text = p_empresa_id OR nombre = p_empresa_id
  LIMIT 1;

  RETURN COALESCE(v_total, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_clientes_creados_total(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clientes_creados_total(TEXT) TO service_role;

-- 3. Vista movimientos_caja_resumen (requiere tabla movimientos_caja)
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
