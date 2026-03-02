-- ============================================================
-- SCRIPT MAESTRO: Base de datos para 3 PWAs (electro, dealer, prestamos)
-- ============================================================
-- Ejecutar en Supabase SQL Editor (todo de una vez o por secciones)
-- Orden: 1 → 2 → 3 → ... → 15
-- ============================================================

-- ============================================================
-- 1. FUNCIÓN is_super_admin (evita recursión en RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles WHERE user_id = auth.uid() AND rol = 'super_admin'
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ============================================================
-- 2. RLS PERFILES (correcto para multi-PWA)
-- ============================================================
-- IMPORTANTE: Habilitar RLS (NO deshabilitar)
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas que puedan conflictuar
DROP POLICY IF EXISTS "perfiles_select_empresa" ON perfiles;
DROP POLICY IF EXISTS "perfiles_insert_empresa" ON perfiles;
DROP POLICY IF EXISTS "perfiles_update_empresa" ON perfiles;
DROP POLICY IF EXISTS "perfiles_delete_empresa" ON perfiles;
DROP POLICY IF EXISTS "perfiles_select_own" ON perfiles;
DROP POLICY IF EXISTS "perfiles_insert_own" ON perfiles;
DROP POLICY IF EXISTS "perfiles_update_own" ON perfiles;
DROP POLICY IF EXISTS "perfiles_select_super_admin" ON perfiles;

-- 1) Propio perfil (necesario para login)
CREATE POLICY "perfiles_select_own"
  ON perfiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2) Perfiles de la misma empresa (Admin ve lista en admin/usuarios)
CREATE POLICY "perfiles_select_empresa"
  ON perfiles FOR SELECT TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

-- 3) Super_admin ve todos
CREATE POLICY "perfiles_select_super_admin"
  ON perfiles FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 4) Insertar propio perfil (registro)
CREATE POLICY "perfiles_insert_own"
  ON perfiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5) Actualizar propio perfil
CREATE POLICY "perfiles_update_own"
  ON perfiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3. COLUMNA ruta_id EN PERFILES (para "Mi Ruta de Hoy")
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='rutas') THEN
    ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS ruta_id UUID REFERENCES rutas(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_perfiles_ruta ON perfiles(ruta_id);
  END IF;
END $$;

-- ============================================================
-- 4. QUITAR CONSTRAINT rol (permite super_admin, Cobrador)
-- ============================================================
ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;

-- ============================================================
-- 5. SUPER ADMIN - Crear/actualizar perfiles
-- ============================================================
-- Cambia los emails si es necesario
INSERT INTO perfiles (user_id, rol, activo, nombre_completo, empresa_id, compania_id, app_id, terminos_aceptados, privacidad_aceptada, fecha_aceptacion, privacidad_fecha_aceptacion)
SELECT id, 'super_admin', true, 'Super Administrador', NULL, NULL, NULL, true, true, NOW(), NOW()
FROM auth.users
WHERE LOWER(email) IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com')
  AND id NOT IN (SELECT user_id FROM perfiles);

UPDATE perfiles
SET rol = 'super_admin', activo = true, app_id = NULL, empresa_id = COALESCE(empresa_id, 'SISTEMA'), compania_id = COALESCE(compania_id, 'SISTEMA')
WHERE user_id IN (
  SELECT id FROM auth.users WHERE LOWER(email) IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com')
);

-- ============================================================
-- 6. TRIGGER handle_new_user (primer usuario = Admin, soporta app_id)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cols text[] := ARRAY[]::text[];
  vals text[] := ARRAY[]::text[];
  nombre text; apellido text; nombre_completo text; empresa text; app_id text;
  es_primer_usuario boolean := false;
  v_rol text;
BEGIN
  nombre := COALESCE(new.raw_user_meta_data->>'nombre', '');
  apellido := COALESCE(new.raw_user_meta_data->>'apellido', '');
  nombre_completo := NULLIF(trim(nombre || ' ' || apellido), '');
  empresa := new.raw_user_meta_data->>'compania';
  app_id := new.raw_user_meta_data->>'app_id';

  -- Si no hay empresa en metadata, usar primera empresa
  IF empresa IS NULL THEN
    SELECT id INTO empresa FROM public.empresas LIMIT 1;
  END IF;

  -- Primer usuario de la base = Admin
  SELECT (SELECT COUNT(*) FROM public.perfiles) = 0 INTO es_primer_usuario;

  cols := array_append(cols, 'user_id');
  vals := array_append(vals, quote_literal(new.id));

  IF nombre_completo IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='perfiles' AND column_name='nombre_completo') THEN
    cols := array_append(cols, 'nombre_completo'); vals := array_append(vals, quote_literal(nombre_completo));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='perfiles' AND column_name='rol') THEN
    v_rol := new.raw_user_meta_data->>'rol';
    IF v_rol IN ('Admin', 'Vendedor') THEN
      cols := array_append(cols, 'rol'); vals := array_append(vals, quote_literal(v_rol));
    ELSE
      cols := array_append(cols, 'rol');
      vals := array_append(vals, quote_literal(CASE WHEN es_primer_usuario THEN 'Admin' ELSE 'Vendedor' END));
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='perfiles' AND column_name='activo') THEN
    cols := array_append(cols, 'activo'); vals := array_append(vals, 'true');
  END IF;
  IF empresa IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='perfiles' AND column_name='empresa_id') THEN
    cols := array_append(cols, 'empresa_id'); vals := array_append(vals, quote_literal(empresa));
  END IF;
  IF empresa IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='perfiles' AND column_name='compania_id') THEN
    cols := array_append(cols, 'compania_id'); vals := array_append(vals, quote_literal(empresa));
  END IF;
  IF app_id IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='perfiles' AND column_name='app_id') THEN
    cols := array_append(cols, 'app_id'); vals := array_append(vals, quote_literal(app_id));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='perfiles' AND column_name='terminos_aceptados') THEN
    cols := array_append(cols, 'terminos_aceptados'); vals := array_append(vals, 'true');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='perfiles' AND column_name='privacidad_aceptada') THEN
    cols := array_append(cols, 'privacidad_aceptada'); vals := array_append(vals, 'true');
  END IF;

  IF array_length(cols, 1) IS NOT NULL THEN
    EXECUTE format('INSERT INTO public.perfiles (%s) VALUES (%s) ON CONFLICT (user_id) DO NOTHING',
      array_to_string(cols, ','), array_to_string(vals, ','));
  END IF;
  RETURN new;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'handle_new_user: %', SQLERRM;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 7. APP_ID - Solo rellenar donde es NULL (NO sobrescribir)
-- ============================================================
-- Para multi-PWA: cada app tiene su app_id (electro, dealer, prestamos)
-- Solo asignar default donde falta. NO ejecutar UPDATE que ponga todo a 'electro'
UPDATE clientes SET app_id = COALESCE(app_id, 'electro') WHERE app_id IS NULL;
UPDATE motores SET app_id = COALESCE(app_id, 'electro') WHERE app_id IS NULL;
UPDATE ventas SET app_id = COALESCE(app_id, 'electro') WHERE app_id IS NULL;
UPDATE pagos SET app_id = COALESCE(app_id, 'electro') WHERE app_id IS NULL;
UPDATE sucursales SET app_id = COALESCE(app_id, 'electro') WHERE app_id IS NULL;
UPDATE empresas SET app_id = COALESCE(app_id, 'electro') WHERE app_id IS NULL;
-- perfiles: super_admin tiene app_id NULL (acceso a todas las apps)
-- No actualizar perfiles aquí para no pisar super_admin

-- ============================================================
-- 8. CAJAS - empresa_id, app_id, RLS deshabilitado (Admin ve todas)
-- ============================================================
ALTER TABLE cajas ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(255);
ALTER TABLE cajas ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);
ALTER TABLE cajas ADD COLUMN IF NOT EXISTS app_id TEXT;

UPDATE cajas c
SET empresa_id = s.empresa_id, compania_id = s.empresa_id, app_id = COALESCE(s.app_id, 'electro')
FROM sucursales s
WHERE c.sucursal_id = s.id AND (c.empresa_id IS NULL OR c.app_id IS NULL);

ALTER TABLE cajas DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. ACTIVIDAD_LOGS - Super_admin puede ver/insertar
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='actividad_logs') THEN
    ALTER TABLE actividad_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DROP POLICY IF EXISTS "actividad_logs_select_empresa" ON actividad_logs;
CREATE POLICY "actividad_logs_select_empresa"
  ON actividad_logs FOR SELECT TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

DROP POLICY IF EXISTS "actividad_logs_select_super_admin" ON actividad_logs;
CREATE POLICY "actividad_logs_select_super_admin"
  ON actividad_logs FOR SELECT TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "actividad_logs_insert_super_admin" ON actividad_logs;
CREATE POLICY "actividad_logs_insert_super_admin"
  ON actividad_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

-- ============================================================
-- 10. VERIFICACIÓN FINAL
-- ============================================================
-- Ejecutar aparte para comprobar:
-- SELECT u.email, p.rol, p.app_id, p.empresa_id FROM auth.users u
-- LEFT JOIN perfiles p ON p.user_id = u.id
-- WHERE u.email IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com');
