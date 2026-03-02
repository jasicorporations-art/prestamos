-- Fix trigger de auth.users que intenta insertar email en perfiles
-- Ejecutar en Supabase SQL Editor y luego API → Reload schema

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cols text[] := ARRAY[]::text[];
  vals text[] := ARRAY[]::text[];
  nombre text;
  apellido text;
  nombre_completo text;
  empresa text;
  app_id text;
  v_rol text;
BEGIN
  -- metadata
  nombre := COALESCE(new.raw_user_meta_data->>'nombre', '');
  apellido := COALESCE(new.raw_user_meta_data->>'apellido', '');
  nombre_completo := NULLIF(trim(nombre || ' ' || apellido), '');
  empresa := new.raw_user_meta_data->>'compania';
  app_id := new.raw_user_meta_data->>'app_id';

  -- user_id
  cols := array_append(cols, 'user_id');
  vals := array_append(vals, quote_literal(new.id));

  -- email (solo si existe la columna)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'perfiles'
      AND column_name = 'email'
  ) THEN
    cols := array_append(cols, 'email');
    vals := array_append(vals, quote_literal(new.email));
  END IF;

  -- nombre_completo
  IF nombre_completo IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'perfiles'
      AND column_name = 'nombre_completo'
  ) THEN
    cols := array_append(cols, 'nombre_completo');
    vals := array_append(vals, quote_literal(nombre_completo));
  END IF;

  -- Resolver empresa antes del bloque rol (para saber si es primer usuario de la empresa)
  IF empresa IS NULL THEN
    SELECT id INTO empresa FROM public.empresas LIMIT 1;
  END IF;

  -- rol: usar el de metadata si viene (crearUsuario); si no, primer usuario de la empresa = Admin, resto = Vendedor
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'perfiles'
      AND column_name = 'rol'
  ) THEN
    v_rol := new.raw_user_meta_data->>'rol';
    IF v_rol IN ('Admin', 'Vendedor') THEN
      cols := array_append(cols, 'rol');
      vals := array_append(vals, quote_literal(v_rol));
    ELSIF (
      (empresa IS NOT NULL AND (SELECT COUNT(*) FROM public.perfiles WHERE empresa_id = empresa OR compania_id = empresa) = 0)
      OR (empresa IS NULL AND (SELECT COUNT(*) FROM public.perfiles) = 0)
    ) THEN
      cols := array_append(cols, 'rol');
      vals := array_append(vals, quote_literal('Admin'));
    ELSE
      cols := array_append(cols, 'rol');
      vals := array_append(vals, quote_literal('Vendedor'));
    END IF;
  END IF;

  -- activo
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'perfiles'
      AND column_name = 'activo'
  ) THEN
    cols := array_append(cols, 'activo');
    vals := array_append(vals, 'true');
  END IF;

  -- empresa_id / compania_id
  IF empresa IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'perfiles'
      AND column_name = 'empresa_id'
  ) THEN
    cols := array_append(cols, 'empresa_id');
    vals := array_append(vals, quote_literal(empresa));
  END IF;

  IF empresa IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'perfiles'
      AND column_name = 'compania_id'
  ) THEN
    cols := array_append(cols, 'compania_id');
    vals := array_append(vals, quote_literal(empresa));
  END IF;

  IF app_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'perfiles'
      AND column_name = 'app_id'
  ) THEN
    cols := array_append(cols, 'app_id');
    vals := array_append(vals, quote_literal(app_id));
  END IF;

  -- Insert dinámico
  IF array_length(cols, 1) IS NOT NULL THEN
    EXECUTE format('INSERT INTO public.perfiles (%s) VALUES (%s)', array_to_string(cols, ','), array_to_string(vals, ','));
  END IF;

  RETURN new;
EXCEPTION WHEN others THEN
  -- No bloquear el signup si falla el perfil
  RAISE NOTICE 'handle_new_user error: %', SQLERRM;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
