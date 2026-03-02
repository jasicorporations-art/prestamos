-- ================================================================
-- PASO 2: Tabla EMPRESAS + RLS
-- ================================================================
-- Referencias: auth.users (Supabase, no la tocamos)
-- empresa_id en todas las tablas es UUID (REFERENCES empresas.id)
-- ================================================================

CREATE TABLE empresas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  direccion TEXT,
  telefono VARCHAR(50),
  rnc TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE empresas ADD COLUMN IF NOT EXISTS whatsapp_premium BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_empresas_nombre ON empresas(LOWER(nombre));
CREATE INDEX IF NOT EXISTS idx_empresas_user_id ON empresas(user_id);

-- RLS: cada usuario ve/inserta solo su empresa (super_admin se añade en paso 10)
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresas_select_own" ON empresas;
DROP POLICY IF EXISTS "empresas_insert_own" ON empresas;
DROP POLICY IF EXISTS "empresas_policy" ON empresas;

CREATE POLICY "empresas_select_own" ON empresas FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "empresas_insert_own" ON empresas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS tr_upd_emp ON empresas;
CREATE TRIGGER tr_upd_emp BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
