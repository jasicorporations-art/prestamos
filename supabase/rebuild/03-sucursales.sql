-- ================================================================
-- PASO 3: Tabla SUCURSALES + RLS
-- ================================================================
-- empresa_id UUID REFERENCES empresas(id)
-- ================================================================

CREATE TABLE sucursales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  direccion TEXT,
  telefono VARCHAR(50),
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS cobrar_domingos BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sucursales_empresa ON sucursales(empresa_id);

DROP TRIGGER IF EXISTS update_sucursales_updated_at ON sucursales;
DROP TRIGGER IF EXISTS tr_upd_suc ON sucursales;
CREATE TRIGGER tr_upd_suc BEFORE UPDATE ON sucursales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sucursales_authenticated" ON sucursales;
DROP POLICY IF EXISTS "sucursales_policy" ON sucursales;
CREATE POLICY "sucursales_authenticated" ON sucursales FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Auto-onboarding: crear sucursal Principal al insertar empresa
CREATE OR REPLACE FUNCTION public.crear_sucursal_por_defecto()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.sucursales (empresa_id, nombre, direccion, telefono, activa)
  VALUES (NEW.id, 'Principal', COALESCE(NEW.direccion, ''), COALESCE(NEW.telefono, ''), true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_crear_sucursal_on_empresa ON public.empresas;
CREATE TRIGGER tr_crear_sucursal_on_empresa
  AFTER INSERT ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.crear_sucursal_por_defecto();
