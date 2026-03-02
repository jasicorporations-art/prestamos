-- ================================================================
-- MIGRACIÓN: Multi-tenant con UUID y RLS consistente
-- ================================================================
-- Ejecutar en Supabase SQL Editor (en orden)
--
-- Si hay DEADLOCK:
-- 1. Cierra la app y pestañas que usen la DB (menos conexiones activas)
-- 2. Ejecuta cada BLOQUE por separado (copia desde BEGIN hasta COMMIT)
-- 3. O ejecuta en horario de bajo tráfico
-- ================================================================

-- BLOQUE 1: Columnas y funciones
BEGIN;

-- ============================================================
-- PASO 1: Asegurar columnas empresa_id, compania_id, app_id
-- ============================================================
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

-- ============================================================
-- PASO 2: Función para resolver nombre de empresa a UUID
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_empresa_uuid(val TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_uuid TEXT;
BEGIN
  IF val IS NULL OR trim(val) = '' OR trim(val) = 'SISTEMA' THEN
    RETURN NULL;
  END IF;

  -- Si ya es un UUID válido (formato 8-4-4-4-12), devolverlo
  IF val ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN val;
  END IF;

  -- Buscar por nombre en empresas
  SELECT id::text INTO v_uuid
  FROM empresas
  WHERE LOWER(trim(nombre)) = LOWER(trim(val))
     OR id::text = val
  LIMIT 1;

  RETURN v_uuid;
END;
$$;

-- ============================================================
-- PASO 3: get_user_empresa_id() - Devuelve UUID del perfil
-- Mantener RETURNS VARCHAR(255) para no romper políticas existentes
-- (perfiles, actividad_logs, sucursales dependen de esta función)
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS VARCHAR(255)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_raw TEXT;
  v_uuid TEXT;
BEGIN
  -- Obtener empresa_id o compania_id del perfil del usuario
  SELECT COALESCE(p.empresa_id, p.compania_id) INTO v_raw
  FROM perfiles p
  WHERE p.user_id = auth.uid()
    AND (p.activo = true OR p.activo IS NULL)
  ORDER BY p.created_at DESC
  LIMIT 1;

  IF v_raw IS NULL OR trim(v_raw) = '' OR trim(v_raw) = 'SISTEMA' THEN
    RETURN NULL;
  END IF;

  -- Resolver a UUID (nombre → id de empresas)
  v_uuid := resolve_empresa_uuid(v_raw);

  RETURN v_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_empresa_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_empresa_id() TO service_role;

COMMIT;

-- BLOQUE 2: Backfill de datos
BEGIN;

-- ============================================================
-- PASO 4: Backfill - Normalizar empresa_id a UUID en perfiles
-- ============================================================
UPDATE perfiles p
SET empresa_id = resolve_empresa_uuid(COALESCE(p.empresa_id, p.compania_id))
WHERE (p.empresa_id IS NULL OR p.empresa_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
  AND (p.empresa_id IS NOT NULL OR p.compania_id IS NOT NULL);

UPDATE perfiles p
SET compania_id = empresa_id
WHERE compania_id IS NULL OR compania_id != empresa_id;

-- ============================================================
-- PASO 5: Backfill - Copiar empresa_id desde pagos a ventas
-- (Los pagos tienen empresa_id correcto porque se setea al crear)
-- ============================================================
UPDATE ventas v
SET
  empresa_id = COALESCE(v.empresa_id, p.empresa_id),
  compania_id = COALESCE(v.compania_id, p.compania_id),
  app_id = COALESCE(v.app_id, p.app_id)
FROM (
  SELECT DISTINCT ON (venta_id) venta_id, empresa_id, compania_id, app_id
  FROM pagos
  WHERE empresa_id IS NOT NULL OR compania_id IS NOT NULL
  ORDER BY venta_id, created_at DESC NULLS LAST
) p
WHERE p.venta_id = v.id AND (v.empresa_id IS NULL OR v.compania_id IS NULL);

-- Normalizar ventas a UUID
UPDATE ventas v
SET empresa_id = resolve_empresa_uuid(v.empresa_id)
WHERE v.empresa_id IS NOT NULL
  AND v.empresa_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

UPDATE ventas v SET compania_id = empresa_id WHERE compania_id IS NULL OR compania_id != empresa_id;

-- ============================================================
-- PASO 6: Backfill - Copiar desde ventas a clientes y motores
-- ============================================================
UPDATE clientes c
SET
  empresa_id = COALESCE(c.empresa_id, v.empresa_id),
  compania_id = COALESCE(c.compania_id, v.compania_id),
  app_id = COALESCE(c.app_id, v.app_id)
FROM (
  SELECT DISTINCT ON (cliente_id) cliente_id, empresa_id, compania_id, app_id
  FROM ventas
  WHERE (empresa_id IS NOT NULL OR compania_id IS NOT NULL) AND cliente_id IS NOT NULL
  ORDER BY cliente_id, fecha_venta DESC NULLS LAST
) v
WHERE v.cliente_id = c.id AND (c.empresa_id IS NULL OR c.compania_id IS NULL);

UPDATE motores m
SET
  empresa_id = COALESCE(m.empresa_id, v.empresa_id),
  compania_id = COALESCE(m.compania_id, v.compania_id),
  app_id = COALESCE(m.app_id, v.app_id)
FROM ventas v
WHERE v.motor_id = m.id AND (m.empresa_id IS NULL OR m.compania_id IS NULL);

-- Normalizar clientes y motores a UUID
UPDATE clientes c SET empresa_id = resolve_empresa_uuid(c.empresa_id)
WHERE c.empresa_id IS NOT NULL
  AND c.empresa_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
UPDATE clientes c SET compania_id = empresa_id WHERE compania_id IS NULL OR compania_id != empresa_id;

UPDATE motores m SET empresa_id = resolve_empresa_uuid(m.empresa_id)
WHERE m.empresa_id IS NOT NULL
  AND m.empresa_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
UPDATE motores m SET compania_id = empresa_id WHERE compania_id IS NULL OR compania_id != empresa_id;

-- Huérfanos: asignar primera empresa
UPDATE clientes c SET empresa_id = sub.eid, compania_id = sub.eid, app_id = COALESCE(c.app_id, 'prestamos')
FROM (SELECT id::text AS eid FROM empresas LIMIT 1) sub
WHERE c.empresa_id IS NULL AND c.compania_id IS NULL;

UPDATE ventas v SET empresa_id = sub.eid, compania_id = sub.eid, app_id = COALESCE(v.app_id, 'prestamos')
FROM (SELECT id::text AS eid FROM empresas LIMIT 1) sub
WHERE v.empresa_id IS NULL AND v.compania_id IS NULL;

UPDATE pagos p SET empresa_id = sub.eid, compania_id = sub.eid, app_id = COALESCE(p.app_id, 'prestamos')
FROM (SELECT id::text AS eid FROM empresas LIMIT 1) sub
WHERE p.empresa_id IS NULL AND p.compania_id IS NULL;

COMMIT;

-- BLOQUE 3: RLS - clientes, ventas, pagos, motores
BEGIN;

-- ============================================================
-- PASO 7: RLS - CLIENTES
-- ============================================================
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clientes_select_empresa" ON clientes;
DROP POLICY IF EXISTS "clientes_insert_empresa" ON clientes;
DROP POLICY IF EXISTS "clientes_update_empresa" ON clientes;
DROP POLICY IF EXISTS "clientes_delete_empresa" ON clientes;
DROP POLICY IF EXISTS "clientes_select_super_admin" ON clientes;
DROP POLICY IF EXISTS "clientes_insert_super_admin" ON clientes;
DROP POLICY IF EXISTS "clientes_update_super_admin" ON clientes;
DROP POLICY IF EXISTS "clientes_delete_super_admin" ON clientes;

CREATE POLICY "clientes_select_super_admin"
  ON clientes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin')
  );

CREATE POLICY "clientes_insert_super_admin"
  ON clientes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin')
  );

CREATE POLICY "clientes_update_super_admin"
  ON clientes FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin')
  );

CREATE POLICY "clientes_delete_super_admin"
  ON clientes FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin')
  );

-- Usuarios normales: solo su empresa (empresa_id = UUID del perfil)
CREATE POLICY "clientes_select_empresa"
  ON clientes FOR SELECT TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "clientes_insert_empresa"
  ON clientes FOR INSERT TO authenticated
  WITH CHECK (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "clientes_update_empresa"
  ON clientes FOR UPDATE TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  )
  WITH CHECK (
    empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()
  );

CREATE POLICY "clientes_delete_empresa"
  ON clientes FOR DELETE TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

-- ============================================================
-- PASO 8: RLS - VENTAS
-- ============================================================
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ventas_select_empresa" ON ventas;
DROP POLICY IF EXISTS "ventas_insert_empresa" ON ventas;
DROP POLICY IF EXISTS "ventas_update_empresa" ON ventas;
DROP POLICY IF EXISTS "ventas_delete_empresa" ON ventas;
DROP POLICY IF EXISTS "ventas_select_super_admin" ON ventas;
DROP POLICY IF EXISTS "ventas_insert_super_admin" ON ventas;
DROP POLICY IF EXISTS "ventas_update_super_admin" ON ventas;
DROP POLICY IF EXISTS "ventas_delete_super_admin" ON ventas;

CREATE POLICY "ventas_select_super_admin"
  ON ventas FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin')
  );

CREATE POLICY "ventas_insert_super_admin"
  ON ventas FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin')
  );

CREATE POLICY "ventas_update_super_admin"
  ON ventas FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin')
  );

CREATE POLICY "ventas_delete_super_admin"
  ON ventas FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin')
  );

CREATE POLICY "ventas_select_empresa"
  ON ventas FOR SELECT TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "ventas_insert_empresa"
  ON ventas FOR INSERT TO authenticated
  WITH CHECK (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "ventas_update_empresa"
  ON ventas FOR UPDATE TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  )
  WITH CHECK (
    empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()
  );

CREATE POLICY "ventas_delete_empresa"
  ON ventas FOR DELETE TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

-- ============================================================
-- PASO 9: RLS - PAGOS (sin app_id hardcodeado)
-- ============================================================
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pagos_select_empresa" ON pagos;
DROP POLICY IF EXISTS "pagos_insert_empresa" ON pagos;
DROP POLICY IF EXISTS "pagos_update_empresa" ON pagos;
DROP POLICY IF EXISTS "pagos_delete_empresa" ON pagos;
DROP POLICY IF EXISTS "pagos_select_super_admin" ON pagos;
DROP POLICY IF EXISTS "pagos_insert_super_admin" ON pagos;
DROP POLICY IF EXISTS "pagos_update_super_admin" ON pagos;
DROP POLICY IF EXISTS "pagos_delete_super_admin" ON pagos;

CREATE POLICY "pagos_select_super_admin"
  ON pagos FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin')
  );

CREATE POLICY "pagos_insert_super_admin"
  ON pagos FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin')
  );

CREATE POLICY "pagos_update_super_admin"
  ON pagos FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin')
  );

CREATE POLICY "pagos_delete_super_admin"
  ON pagos FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin')
  );

-- Filtro solo por empresa_id (app_id se filtra en la capa de aplicación)
CREATE POLICY "pagos_select_empresa"
  ON pagos FOR SELECT TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "pagos_insert_empresa"
  ON pagos FOR INSERT TO authenticated
  WITH CHECK (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "pagos_update_empresa"
  ON pagos FOR UPDATE TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  )
  WITH CHECK (
    empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()
  );

CREATE POLICY "pagos_delete_empresa"
  ON pagos FOR DELETE TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

-- ============================================================
-- PASO 10: RLS - MOTORES
-- ============================================================
ALTER TABLE motores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "motores_select_empresa" ON motores;
DROP POLICY IF EXISTS "motores_insert_empresa" ON motores;
DROP POLICY IF EXISTS "motores_update_empresa" ON motores;
DROP POLICY IF EXISTS "motores_delete_empresa" ON motores;
DROP POLICY IF EXISTS "motores_select_super_admin" ON motores;
DROP POLICY IF EXISTS "motores_insert_super_admin" ON motores;
DROP POLICY IF EXISTS "motores_update_super_admin" ON motores;
DROP POLICY IF EXISTS "motores_delete_super_admin" ON motores;

CREATE POLICY "motores_select_super_admin"
  ON motores FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin')
  );

CREATE POLICY "motores_insert_super_admin"
  ON motores FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin')
  );

CREATE POLICY "motores_update_super_admin"
  ON motores FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin')
  );

CREATE POLICY "motores_delete_super_admin"
  ON motores FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin')
  );

CREATE POLICY "motores_select_empresa"
  ON motores FOR SELECT TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "motores_insert_empresa"
  ON motores FOR INSERT TO authenticated
  WITH CHECK (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

CREATE POLICY "motores_update_empresa"
  ON motores FOR UPDATE TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  )
  WITH CHECK (
    empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()
  );

CREATE POLICY "motores_delete_empresa"
  ON motores FOR DELETE TO authenticated
  USING (
    get_user_empresa_id() IS NOT NULL
    AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())
  );

-- ============================================================
-- PASO 11: Índices para rendimiento
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_id ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_app_id ON clientes(app_id);
CREATE INDEX IF NOT EXISTS idx_ventas_empresa_id ON ventas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ventas_app_id ON ventas(app_id);
CREATE INDEX IF NOT EXISTS idx_pagos_empresa_id ON pagos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagos_app_id ON pagos(app_id);
CREATE INDEX IF NOT EXISTS idx_motores_empresa_id ON motores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_motores_app_id ON motores(app_id);

COMMIT;

-- ============================================================
-- VERIFICACIÓN (ejecutar después)
-- ============================================================
-- SELECT get_user_empresa_id();
-- SELECT id, nombre_completo, empresa_id, compania_id, app_id FROM clientes LIMIT 5;
-- SELECT id, numero_prestamo, empresa_id, compania_id, app_id FROM ventas LIMIT 5;
-- SELECT id, venta_id, empresa_id, compania_id, app_id FROM pagos LIMIT 5;
