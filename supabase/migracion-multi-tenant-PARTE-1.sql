-- PARTE 1 de 3: Columnas y funciones
-- Ejecutar primero. Si hay deadlock, cierra la app y vuelve a intentar.

BEGIN;

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS empresa_id TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS compania_id TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS app_id TEXT;

ALTER TABLE motores ADD COLUMN IF NOT EXISTS empresa_id TEXT;
ALTER TABLE motores ADD COLUMN IF NOT EXISTS compania_id TEXT;
ALTER TABLE motores ADD COLUMN IF NOT EXISTS app_id TEXT;

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS empresa_id TEXT;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS compania_id TEXT;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS app_id TEXT;

ALTER TABLE pagos ADD COLUMN IF NOT EXISTS empresa_id TEXT;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS compania_id TEXT;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS app_id TEXT;

ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS empresa_id TEXT;
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS compania_id TEXT;
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS app_id TEXT;

ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS empresa_id TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS compania_id TEXT;

CREATE OR REPLACE FUNCTION resolve_empresa_uuid(val TEXT)
RETURNS TEXT
LANGUAGE plpgsql STABLE SET search_path = public
AS $$
DECLARE v_uuid TEXT;
BEGIN
  IF val IS NULL OR trim(val) = '' OR trim(val) = 'SISTEMA' THEN RETURN NULL; END IF;
  IF val ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN RETURN val; END IF;
  SELECT id::text INTO v_uuid FROM empresas WHERE LOWER(trim(nombre)) = LOWER(trim(val)) OR id::text = val LIMIT 1;
  RETURN v_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS VARCHAR(255)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE v_raw TEXT; v_uuid TEXT;
BEGIN
  SELECT COALESCE(p.empresa_id, p.compania_id) INTO v_raw FROM perfiles p
  WHERE p.user_id = auth.uid() AND (p.activo = true OR p.activo IS NULL) ORDER BY p.created_at DESC LIMIT 1;
  IF v_raw IS NULL OR trim(v_raw) = '' OR trim(v_raw) = 'SISTEMA' THEN RETURN NULL; END IF;
  v_uuid := resolve_empresa_uuid(v_raw);
  RETURN v_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_empresa_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_empresa_id() TO service_role;

COMMIT;
