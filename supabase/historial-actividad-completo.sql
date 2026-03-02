-- ================================================================
-- Historial de actividad: tabla, función y RLS
-- Ejecutar en Supabase SQL Editor para que los movimientos se registren
-- y se muestren en Admin > Historial.
-- ================================================================

BEGIN;

-- 1) Crear tabla si no existe (compatible con multiusuario y rebuild)
-- Referencia a sucursales solo si la tabla existe
CREATE TABLE IF NOT EXISTS actividad_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nombre VARCHAR(255),
  accion VARCHAR(255) NOT NULL,
  detalle TEXT,
  entidad_tipo VARCHAR(50),
  entidad_id UUID,
  fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2) Añadir columnas que pueden faltar (empresa_id, compania_id, app_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'actividad_logs' AND column_name = 'empresa_id') THEN
    ALTER TABLE actividad_logs ADD COLUMN empresa_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'actividad_logs' AND column_name = 'compania_id') THEN
    ALTER TABLE actividad_logs ADD COLUMN compania_id VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'actividad_logs' AND column_name = 'app_id') THEN
    ALTER TABLE actividad_logs ADD COLUMN app_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'actividad_logs' AND column_name = 'sucursal_id') THEN
    ALTER TABLE actividad_logs ADD COLUMN sucursal_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'actividad_logs' AND column_name = 'sucursal_nombre') THEN
    ALTER TABLE actividad_logs ADD COLUMN sucursal_nombre VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'actividad_logs' AND column_name = 'fecha_hora') THEN
    ALTER TABLE actividad_logs ADD COLUMN fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Índices para consultas del historial
CREATE INDEX IF NOT EXISTS idx_actividad_logs_usuario ON actividad_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_actividad_logs_fecha ON actividad_logs(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_actividad_logs_sucursal ON actividad_logs(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_actividad_logs_empresa ON actividad_logs(empresa_id);

-- 3) Función para obtener empresa del usuario actual (UUID o texto según esquema)
CREATE OR REPLACE FUNCTION get_user_empresa_id_actividad()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM perfiles
  WHERE user_id = auth.uid() AND (activo IS NULL OR activo = true)
  LIMIT 1;
  RETURN v_empresa_id;
END;
$$;

-- 4) Función registrar_actividad: inserta con todos los campos y app_id para que RLS permita ver los registros
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
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
  v_empresa_id UUID;
BEGIN
  -- Obtener empresa desde sucursal o desde perfil del usuario
  IF p_sucursal_id IS NOT NULL THEN
    SELECT empresa_id INTO v_empresa_id FROM sucursales WHERE id = p_sucursal_id LIMIT 1;
  END IF;
  IF v_empresa_id IS NULL AND p_usuario_id IS NOT NULL THEN
    SELECT empresa_id INTO v_empresa_id FROM perfiles WHERE user_id = p_usuario_id LIMIT 1;
  END IF;

  INSERT INTO actividad_logs (
    usuario_id,
    usuario_nombre,
    sucursal_id,
    sucursal_nombre,
    empresa_id,
    compania_id,
    app_id,
    accion,
    detalle,
    entidad_tipo,
    entidad_id,
    fecha_hora
  ) VALUES (
    p_usuario_id,
    p_usuario_nombre,
    p_sucursal_id,
    p_sucursal_nombre,
    v_empresa_id,
    v_empresa_id::text,
    'prestamos',
    p_accion,
    p_detalle,
    p_entidad_tipo,
    p_entidad_id,
    NOW()
  )
  RETURNING id INTO log_id;

  RETURN log_id;
EXCEPTION
  WHEN undefined_column OR others THEN
    -- Si faltan columnas (compania_id, app_id, sucursal_*), insertar solo las básicas
    INSERT INTO actividad_logs (
      usuario_id,
      usuario_nombre,
      sucursal_id,
      sucursal_nombre,
      empresa_id,
      accion,
      detalle,
      entidad_tipo,
      entidad_id,
      fecha_hora
    ) VALUES (
      p_usuario_id,
      p_usuario_nombre,
      p_sucursal_id,
      p_sucursal_nombre,
      v_empresa_id,
      p_accion,
      p_detalle,
      p_entidad_tipo,
      p_entidad_id,
      NOW()
    )
    RETURNING id INTO log_id;
    RETURN log_id;
END;
$$;

-- 5) RLS: permitir ver e insertar registros de la misma empresa (prestamos y electro)
ALTER TABLE actividad_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "actividad_logs_select_empresa" ON actividad_logs;
DROP POLICY IF EXISTS "actividad_logs_select_empresa_app" ON actividad_logs;
DROP POLICY IF EXISTS "actividad_logs_insert_empresa" ON actividad_logs;
DROP POLICY IF EXISTS "actividad_logs_insert_empresa_app" ON actividad_logs;
DROP POLICY IF EXISTS "actividad_logs_update_empresa" ON actividad_logs;
DROP POLICY IF EXISTS "actividad_logs_delete_empresa" ON actividad_logs;
DROP POLICY IF EXISTS "actividad_logs_authenticated" ON actividad_logs;
DROP POLICY IF EXISTS "actividad_logs_policy" ON actividad_logs;

-- SELECT: usuarios ven logs de su empresa; super_admin ve todo
CREATE POLICY "actividad_logs_select_empresa_app"
  ON actividad_logs FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE user_id = auth.uid() AND rol = 'super_admin' LIMIT 1)
    OR empresa_id = get_user_empresa_id_actividad()
    OR (compania_id IS NOT NULL AND compania_id = get_user_empresa_id_actividad()::text)
    OR (empresa_id IS NULL AND usuario_id = auth.uid())
  );

-- INSERT: usuarios autenticados pueden insertar (la app usa RPC SECURITY DEFINER; este policy por si insertan desde cliente)
CREATE POLICY "actividad_logs_insert_empresa_app"
  ON actividad_logs FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = get_user_empresa_id_actividad()
    OR (compania_id IS NOT NULL AND compania_id = get_user_empresa_id_actividad()::text)
    OR (empresa_id IS NULL AND usuario_id = auth.uid())
  );

COMMIT;

-- Comentario
COMMENT ON TABLE actividad_logs IS 'Historial de actividad para Admin > Historial (clientes, ventas, pagos, cajas, etc.)';
