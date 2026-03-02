-- ================================================================
-- Agregar columnas faltantes a RUTAS (descripcion, empresa_id)
-- Ejecutar en Supabase SQL Editor
-- Soluciona: "no tengo columna para rutas y descripcion"
-- ================================================================

BEGIN;

-- 1) Crear tabla si no existe
CREATE TABLE IF NOT EXISTS public.rutas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  descripcion text,
  activa boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) Agregar columnas por si la tabla era vieja
ALTER TABLE public.rutas ADD COLUMN IF NOT EXISTS descripcion text;
ALTER TABLE public.rutas ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.rutas ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- normalizar nulls (defensivo)
UPDATE public.rutas SET updated_at = now() WHERE updated_at IS NULL;

-- 3) Backfill empresa_id desde sucursal
DO $$
BEGIN
  UPDATE public.rutas r
  SET empresa_id = s.empresa_id
  FROM public.sucursales s
  WHERE r.sucursal_id = s.id
    AND r.empresa_id IS NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'No se pudo backfill empresa_id: %', SQLERRM;
END $$;

-- 4) Trigger para setear empresa_id desde sucursal (INSERT y UPDATE)
CREATE OR REPLACE FUNCTION public.rutas_set_empresa_from_sucursal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sucursal_id IS NOT NULL THEN
    SELECT empresa_id INTO NEW.empresa_id
    FROM public.sucursales
    WHERE id = NEW.sucursal_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_rutas_set_empresa ON public.rutas;
CREATE TRIGGER tr_rutas_set_empresa
BEFORE INSERT OR UPDATE OF sucursal_id ON public.rutas
FOR EACH ROW EXECUTE FUNCTION public.rutas_set_empresa_from_sucursal();

-- 5) updated_at trigger (asume que update_updated_at_column ya existe por tu reset)
DROP TRIGGER IF EXISTS update_rutas_updated_at ON public.rutas;
CREATE TRIGGER update_rutas_updated_at
BEFORE UPDATE ON public.rutas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Índices
CREATE INDEX IF NOT EXISTS idx_rutas_sucursal ON public.rutas(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_rutas_empresa ON public.rutas(empresa_id);

-- 7) RLS + policy
ALTER TABLE public.rutas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rutas_policy ON public.rutas;
CREATE POLICY rutas_policy ON public.rutas
FOR ALL TO authenticated
USING (is_admin() OR empresa_id = get_user_empresa_id())
WITH CHECK (is_admin() OR empresa_id = get_user_empresa_id());

COMMIT;
