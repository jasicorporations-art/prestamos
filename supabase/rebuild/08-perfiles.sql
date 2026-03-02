-- ================================================================
-- PASO 8: Tabla PERFILES + RLS + Trigger handle_new_user
-- ================================================================
-- empresa_id UUID REFERENCES empresas(id) - NULL para super_admin
-- sucursal_id UUID REFERENCES sucursales(id)
-- ================================================================

CREATE TABLE perfiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo VARCHAR(255),
  email TEXT,
  rol VARCHAR(50) NOT NULL DEFAULT 'Vendedor',
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;

-- Columnas adicionales
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS terminos_aceptados BOOLEAN DEFAULT true;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS privacidad_aceptada BOOLEAN DEFAULT true;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS moneda TEXT DEFAULT 'USD';

CREATE INDEX IF NOT EXISTS idx_perfiles_user_id ON perfiles(user_id);
CREATE INDEX IF NOT EXISTS idx_perfiles_empresa ON perfiles(empresa_id);
CREATE INDEX IF NOT EXISTS idx_perfiles_sucursal ON perfiles(sucursal_id);

DROP TRIGGER IF EXISTS update_perfiles_updated_at ON perfiles;
DROP TRIGGER IF EXISTS tr_upd_per ON perfiles;
CREATE TRIGGER tr_upd_per BEFORE UPDATE ON perfiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: crear perfil al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.perfiles (user_id, email, nombre_completo, rol)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nombre_completo', new.raw_user_meta_data->>'nombre', 'Usuario Nuevo'),
    'Vendedor'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfiles_select_own" ON perfiles;
DROP POLICY IF EXISTS "perfiles_insert_own" ON perfiles;
DROP POLICY IF EXISTS "perfiles_update_own" ON perfiles;
DROP POLICY IF EXISTS "perfiles_policy" ON perfiles;

CREATE POLICY "perfiles_select_own" ON perfiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "perfiles_insert_own" ON perfiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "perfiles_update_own" ON perfiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
