-- ========================================
-- Ruta A automatica al crear sucursal + backfill
-- ========================================
-- Ejecutar en Supabase SQL Editor (una sola vez).
-- 1) Trigger: cada vez que se inserte una sucursal, se crea "Ruta A".
-- 2) Backfill: crea "Ruta A" para sucursales que ya existen sin ruta.
-- Requisito: Tabla rutas debe existir (ejecutar antes rutas-y-aprobaciones.sql si no).

CREATE OR REPLACE FUNCTION public.crear_ruta_a_on_sucursal_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO rutas (sucursal_id, nombre, descripcion, activa)
  VALUES (NEW.id, 'Ruta A', 'Ruta de cobro creada automaticamente.', true);
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

INSERT INTO rutas (sucursal_id, nombre, descripcion, activa)
SELECT s.id, 'Ruta A', 'Ruta de cobro creada automaticamente.', true
FROM sucursales s
WHERE NOT EXISTS (SELECT 1 FROM rutas r WHERE r.sucursal_id = s.id);
