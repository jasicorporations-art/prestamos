-- Actualiza la función registrar_actividad para incluir empresa_id (UUID)
-- Compatible con rebuild: actividad_logs tiene usuario_id, usuario_nombre, empresa_id, accion, detalle, entidad_tipo, entidad_id
-- Ejecutar en Supabase SQL Editor y luego API → Reload schema

BEGIN;

CREATE OR REPLACE FUNCTION registrar_actividad(
  p_usuario_id UUID,
  p_usuario_nombre VARCHAR(255),
  p_sucursal_id UUID,
  p_sucursal_nombre VARCHAR(255),
  p_accion VARCHAR(255),
  p_detalle TEXT DEFAULT NULL,
  p_entidad_tipo VARCHAR(50) DEFAULT NULL,
  p_entidad_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
  v_empresa_id UUID;
BEGIN
  -- Obtener empresa desde sucursal si existe
  IF p_sucursal_id IS NOT NULL THEN
    SELECT empresa_id INTO v_empresa_id
    FROM sucursales WHERE id = p_sucursal_id LIMIT 1;
  END IF;

  -- Si no hay empresa, intentar desde perfil del usuario
  IF v_empresa_id IS NULL AND p_usuario_id IS NOT NULL THEN
    SELECT empresa_id INTO v_empresa_id
    FROM perfiles WHERE user_id = p_usuario_id LIMIT 1;
  END IF;

  INSERT INTO actividad_logs (
    usuario_id,
    usuario_nombre,
    accion,
    detalle,
    entidad_tipo,
    entidad_id,
    empresa_id
  ) VALUES (
    p_usuario_id,
    p_usuario_nombre,
    p_accion,
    p_detalle,
    p_entidad_tipo,
    p_entidad_id,
    v_empresa_id
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
