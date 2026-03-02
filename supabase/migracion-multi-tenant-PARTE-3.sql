-- PARTE 3 de 3: RLS y índices
-- Ejecutar después de PARTE 2.

BEGIN;

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clientes_select_empresa" ON clientes;
DROP POLICY IF EXISTS "clientes_insert_empresa" ON clientes;
DROP POLICY IF EXISTS "clientes_update_empresa" ON clientes;
DROP POLICY IF EXISTS "clientes_delete_empresa" ON clientes;
DROP POLICY IF EXISTS "clientes_select_super_admin" ON clientes;
DROP POLICY IF EXISTS "clientes_insert_super_admin" ON clientes;
DROP POLICY IF EXISTS "clientes_update_super_admin" ON clientes;
DROP POLICY IF EXISTS "clientes_delete_super_admin" ON clientes;

CREATE POLICY "clientes_select_super_admin" ON clientes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin'));
CREATE POLICY "clientes_insert_super_admin" ON clientes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin'));
CREATE POLICY "clientes_update_super_admin" ON clientes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin'));
CREATE POLICY "clientes_delete_super_admin" ON clientes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin'));

CREATE POLICY "clientes_select_empresa" ON clientes FOR SELECT TO authenticated USING (get_user_empresa_id() IS NOT NULL AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()));
CREATE POLICY "clientes_insert_empresa" ON clientes FOR INSERT TO authenticated WITH CHECK (get_user_empresa_id() IS NOT NULL AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()));
CREATE POLICY "clientes_update_empresa" ON clientes FOR UPDATE TO authenticated USING (get_user_empresa_id() IS NOT NULL AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())) WITH CHECK (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());
CREATE POLICY "clientes_delete_empresa" ON clientes FOR DELETE TO authenticated USING (get_user_empresa_id() IS NOT NULL AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()));

ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ventas_select_empresa" ON ventas;
DROP POLICY IF EXISTS "ventas_insert_empresa" ON ventas;
DROP POLICY IF EXISTS "ventas_update_empresa" ON ventas;
DROP POLICY IF EXISTS "ventas_delete_empresa" ON ventas;
DROP POLICY IF EXISTS "ventas_select_super_admin" ON ventas;
DROP POLICY IF EXISTS "ventas_insert_super_admin" ON ventas;
DROP POLICY IF EXISTS "ventas_update_super_admin" ON ventas;
DROP POLICY IF EXISTS "ventas_delete_super_admin" ON ventas;

CREATE POLICY "ventas_select_super_admin" ON ventas FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin'));
CREATE POLICY "ventas_insert_super_admin" ON ventas FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin'));
CREATE POLICY "ventas_update_super_admin" ON ventas FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin'));
CREATE POLICY "ventas_delete_super_admin" ON ventas FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin'));

CREATE POLICY "ventas_select_empresa" ON ventas FOR SELECT TO authenticated USING (get_user_empresa_id() IS NOT NULL AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()));
CREATE POLICY "ventas_insert_empresa" ON ventas FOR INSERT TO authenticated WITH CHECK (get_user_empresa_id() IS NOT NULL AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()));
CREATE POLICY "ventas_update_empresa" ON ventas FOR UPDATE TO authenticated USING (get_user_empresa_id() IS NOT NULL AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())) WITH CHECK (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());
CREATE POLICY "ventas_delete_empresa" ON ventas FOR DELETE TO authenticated USING (get_user_empresa_id() IS NOT NULL AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()));

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pagos_select_empresa" ON pagos;
DROP POLICY IF EXISTS "pagos_insert_empresa" ON pagos;
DROP POLICY IF EXISTS "pagos_update_empresa" ON pagos;
DROP POLICY IF EXISTS "pagos_delete_empresa" ON pagos;
DROP POLICY IF EXISTS "pagos_select_super_admin" ON pagos;
DROP POLICY IF EXISTS "pagos_insert_super_admin" ON pagos;
DROP POLICY IF EXISTS "pagos_update_super_admin" ON pagos;
DROP POLICY IF EXISTS "pagos_delete_super_admin" ON pagos;

CREATE POLICY "pagos_select_super_admin" ON pagos FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin'));
CREATE POLICY "pagos_insert_super_admin" ON pagos FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin'));
CREATE POLICY "pagos_update_super_admin" ON pagos FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin'));
CREATE POLICY "pagos_delete_super_admin" ON pagos FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin'));

CREATE POLICY "pagos_select_empresa" ON pagos FOR SELECT TO authenticated USING (get_user_empresa_id() IS NOT NULL AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()));
CREATE POLICY "pagos_insert_empresa" ON pagos FOR INSERT TO authenticated WITH CHECK (get_user_empresa_id() IS NOT NULL AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()));
CREATE POLICY "pagos_update_empresa" ON pagos FOR UPDATE TO authenticated USING (get_user_empresa_id() IS NOT NULL AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())) WITH CHECK (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());
CREATE POLICY "pagos_delete_empresa" ON pagos FOR DELETE TO authenticated USING (get_user_empresa_id() IS NOT NULL AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()));

ALTER TABLE motores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "motores_select_empresa" ON motores;
DROP POLICY IF EXISTS "motores_insert_empresa" ON motores;
DROP POLICY IF EXISTS "motores_update_empresa" ON motores;
DROP POLICY IF EXISTS "motores_delete_empresa" ON motores;
DROP POLICY IF EXISTS "motores_select_super_admin" ON motores;
DROP POLICY IF EXISTS "motores_insert_super_admin" ON motores;
DROP POLICY IF EXISTS "motores_update_super_admin" ON motores;
DROP POLICY IF EXISTS "motores_delete_super_admin" ON motores;

CREATE POLICY "motores_select_super_admin" ON motores FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin'));
CREATE POLICY "motores_insert_super_admin" ON motores FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin'));
CREATE POLICY "motores_update_super_admin" ON motores FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin'));
CREATE POLICY "motores_delete_super_admin" ON motores FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND p.rol = 'super_admin'));

CREATE POLICY "motores_select_empresa" ON motores FOR SELECT TO authenticated USING (get_user_empresa_id() IS NOT NULL AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()));
CREATE POLICY "motores_insert_empresa" ON motores FOR INSERT TO authenticated WITH CHECK (get_user_empresa_id() IS NOT NULL AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()));
CREATE POLICY "motores_update_empresa" ON motores FOR UPDATE TO authenticated USING (get_user_empresa_id() IS NOT NULL AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id())) WITH CHECK (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id());
CREATE POLICY "motores_delete_empresa" ON motores FOR DELETE TO authenticated USING (get_user_empresa_id() IS NOT NULL AND (empresa_id = get_user_empresa_id() OR compania_id = get_user_empresa_id()));

CREATE INDEX IF NOT EXISTS idx_clientes_empresa_id ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_app_id ON clientes(app_id);
CREATE INDEX IF NOT EXISTS idx_ventas_empresa_id ON ventas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ventas_app_id ON ventas(app_id);
CREATE INDEX IF NOT EXISTS idx_pagos_empresa_id ON pagos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagos_app_id ON pagos(app_id);
CREATE INDEX IF NOT EXISTS idx_motores_empresa_id ON motores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_motores_app_id ON motores(app_id);

COMMIT;
