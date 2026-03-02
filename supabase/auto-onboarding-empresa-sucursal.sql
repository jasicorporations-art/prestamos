-- ========================================
-- AUTO-ONBOARDING: Crear sucursal principal al registrar empresa
-- ========================================
-- Ejecutar en Supabase SQL Editor
-- Crea automáticamente una sucursal "(Principal)" cuando se inserta una nueva empresa.
-- Si falla la creación de la sucursal, se revierte la inserción de la empresa (rollback).

-- 1. Agregar columnas direccion y telefono a empresas (para clonar en sucursal)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);

COMMENT ON COLUMN empresas.direccion IS 'Dirección de la empresa (usada para sucursal principal en auto-onboarding)';
COMMENT ON COLUMN empresas.telefono IS 'Teléfono de la empresa (usado para sucursal principal en auto-onboarding)';

-- 2. Función que crea la sucursal principal tras insertar empresa
-- SECURITY DEFINER: ejecuta con privilegios del propietario para bypass RLS (el usuario aún no tiene perfil)
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

  -- Insertar sucursal principal (nombre "Principal", direccion y telefono del usuario)
  INSERT INTO sucursales (
    nombre,
    direccion,
    telefono,
    empresa_id,
    activa
  ) VALUES (
    'Principal',
    v_direccion,
    v_telefono,
    v_empresa_id,
    true
  );

  -- Si llegamos aquí, todo OK. Si falla el INSERT, se lanza excepción y se revierte la transacción.
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Re-lanzar para que se revierta el INSERT en empresas
    RAISE EXCEPTION 'Error creando sucursal principal: %', SQLERRM;
END;
$$;

-- 3. Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS on_empresa_created_crear_sucursal_principal ON empresas;

-- 4. Crear trigger
CREATE TRIGGER on_empresa_created_crear_sucursal_principal
  AFTER INSERT ON empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.crear_sucursal_principal_on_empresa_insert();

COMMENT ON FUNCTION public.crear_sucursal_principal_on_empresa_insert() IS 'Auto-onboarding: crea sucursal principal al registrar empresa. Rollback de empresa si falla.';
