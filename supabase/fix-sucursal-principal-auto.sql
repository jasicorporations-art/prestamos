-- ========================================
-- FIX: Sucursal Principal automática al registrar
-- ========================================
-- Ejecutar en Supabase SQL Editor
-- La sucursal se crea con nombre "Principal", dirección y teléfono del usuario
-- Requiere: tabla empresas con columnas direccion y telefono

-- 1. Asegurar columnas direccion y telefono en empresas
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);

-- 2. Función: crear sucursal "Principal" con direccion y telefono del usuario
CREATE OR REPLACE FUNCTION public.crear_sucursal_principal_on_empresa_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_direccion TEXT;
  v_telefono VARCHAR(50);
  v_empresa_id TEXT;
BEGIN
  v_direccion := COALESCE(trim(NEW.direccion), '');
  v_telefono := COALESCE(trim(NEW.telefono), '');
  v_empresa_id := NEW.id::text;

  INSERT INTO sucursales (nombre, direccion, telefono, empresa_id, activa)
  VALUES ('Principal', v_direccion, v_telefono, v_empresa_id, true);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creando sucursal principal: %', SQLERRM;
END;
$$;

-- 3. Trigger: al insertar empresa → crear sucursal
DROP TRIGGER IF EXISTS on_empresa_created_crear_sucursal_principal ON empresas;
CREATE TRIGGER on_empresa_created_crear_sucursal_principal
  AFTER INSERT ON empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.crear_sucursal_principal_on_empresa_insert();

-- 4. Trigger: al insertar sucursal → crear Ruta A
CREATE OR REPLACE FUNCTION public.crear_ruta_a_on_sucursal_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO rutas (sucursal_id, nombre, descripcion, activa)
  VALUES (NEW.id, 'Ruta A', 'Ruta de cobro creada automáticamente.', true);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creando Ruta A: %', SQLERRM;
END;
$$;

DROP TRIGGER IF EXISTS on_sucursal_created_crear_ruta_a ON sucursales;
CREATE TRIGGER on_sucursal_created_crear_ruta_a
  AFTER INSERT ON sucursales
  FOR EACH ROW
  EXECUTE FUNCTION public.crear_ruta_a_on_sucursal_insert();
