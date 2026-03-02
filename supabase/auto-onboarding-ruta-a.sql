-- ========================================
-- AUTO-ONBOARDING: Crear Ruta A al crear sucursal
-- ========================================
-- Ejecutar en Supabase SQL Editor
-- Requisito: Tabla rutas debe existir (supabase/rutas-y-aprobaciones.sql)
-- Crea automáticamente una ruta "Ruta A" cuando se inserta una nueva sucursal.
-- Si falla la creación de la ruta, se revierte la inserción de la sucursal (rollback).

-- 1. Función que crea la Ruta A tras insertar sucursal
-- SECURITY DEFINER: ejecuta con privilegios del propietario para bypass RLS si aplica
CREATE OR REPLACE FUNCTION public.crear_ruta_a_on_sucursal_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO rutas (
    sucursal_id,
    nombre,
    descripcion,
    activa
  ) VALUES (
    NEW.id,
    'Ruta A',
    'Ruta de cobro creada automáticamente. Puedes editar el nombre en Configuración de Rutas.',
    true
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creando Ruta A: %', SQLERRM;
END;
$$;

-- 2. Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS on_sucursal_created_crear_ruta_a ON sucursales;

-- 3. Crear trigger
CREATE TRIGGER on_sucursal_created_crear_ruta_a
  AFTER INSERT ON sucursales
  FOR EACH ROW
  EXECUTE FUNCTION public.crear_ruta_a_on_sucursal_insert();

COMMENT ON FUNCTION public.crear_ruta_a_on_sucursal_insert() IS 'Auto-onboarding: crea Ruta A al crear sucursal. Rollback de sucursal si falla.';
