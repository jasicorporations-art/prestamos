-- ========================================
-- AUTO-ONBOARDING COMPLETO
-- ========================================
-- Ejecutar en Supabase SQL Editor
-- Flujo: Empresa → Sucursal Principal → Ruta A
-- Requisitos: Tablas empresas, sucursales y rutas deben existir (rutas-y-aprobaciones.sql)

-- ========== 1. EMPRESA → SUCURSAL PRINCIPAL ==========
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);

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

DROP TRIGGER IF EXISTS on_empresa_created_crear_sucursal_principal ON empresas;
CREATE TRIGGER on_empresa_created_crear_sucursal_principal
  AFTER INSERT ON empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.crear_sucursal_principal_on_empresa_insert();

-- ========== 2. SUCURSAL → RUTA A ==========
-- Crear tabla rutas si no existe (por si rutas-y-aprobaciones no se ejecutó)
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

CREATE OR REPLACE FUNCTION public.crear_ruta_a_on_sucursal_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO rutas (sucursal_id, nombre, descripcion, activa)
  VALUES (
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

DROP TRIGGER IF EXISTS on_sucursal_created_crear_ruta_a ON sucursales;
CREATE TRIGGER on_sucursal_created_crear_ruta_a
  AFTER INSERT ON sucursales
  FOR EACH ROW
  EXECUTE FUNCTION public.crear_ruta_a_on_sucursal_insert();

-- ========== 3. BACKFILL: Rutas para sucursales existentes sin ruta ==========
INSERT INTO rutas (sucursal_id, nombre, descripcion, activa)
SELECT s.id, 'Ruta A', 'Ruta de cobro creada automáticamente.', true
FROM sucursales s
WHERE NOT EXISTS (SELECT 1 FROM rutas r WHERE r.sucursal_id = s.id);

-- ========== RESUMEN ==========
-- Al registrar una empresa: 1) se crea sucursal "(Principal)", 2) se crea "Ruta A" para esa sucursal
-- El backfill crea "Ruta A" para sucursales que ya existían sin ruta
