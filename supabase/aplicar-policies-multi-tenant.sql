-- ================================================================
-- Aplicar policies RLS a TODAS las tablas multi-tenant
-- Ejecutar DESPUÉS de reset-db-completo-corregido.sql
-- Requiere: get_user_empresa_id(), is_admin()
-- ================================================================

-- empresas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "empresas_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_authenticated" ON public.empresas;
DROP POLICY IF EXISTS "policy_empresas" ON public.empresas;
CREATE POLICY empresas_policy ON public.empresas
FOR ALL TO authenticated
USING (
  is_admin()
  OR id = get_user_empresa_id()
  OR user_id = auth.uid()
)
WITH CHECK (
  is_admin()
  OR user_id = auth.uid()
);

-- sucursales
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sucursales_policy" ON public.sucursales;
DROP POLICY IF EXISTS "sucursales_authenticated" ON public.sucursales;
DROP POLICY IF EXISTS "policy_sucursales" ON public.sucursales;
CREATE POLICY sucursales_policy ON public.sucursales
FOR ALL TO authenticated
USING (is_admin() OR empresa_id = get_user_empresa_id())
WITH CHECK (is_admin() OR empresa_id = get_user_empresa_id());

-- perfiles (Usuario normal: solo su perfil | Admin/Super_admin: perfiles de su empresa)
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perfiles_policy" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_authenticated" ON public.perfiles;
DROP POLICY IF EXISTS "policy_perfiles" ON public.perfiles;
CREATE POLICY perfiles_policy ON public.perfiles
FOR ALL TO authenticated
USING (
  is_admin()
  OR user_id = auth.uid()
)
WITH CHECK (
  is_admin()
  OR user_id = auth.uid()
);

-- ventas
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ventas_policy" ON public.ventas;
DROP POLICY IF EXISTS "ventas_authenticated" ON public.ventas;
DROP POLICY IF EXISTS "policy_ventas" ON public.ventas;
CREATE POLICY ventas_policy ON public.ventas
FOR ALL TO authenticated
USING (is_admin() OR empresa_id = get_user_empresa_id())
WITH CHECK (is_admin() OR empresa_id = get_user_empresa_id());

-- clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clientes_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_authenticated" ON public.clientes;
CREATE POLICY clientes_policy ON public.clientes
FOR ALL TO authenticated
USING (is_admin() OR empresa_id = get_user_empresa_id())
WITH CHECK (is_admin() OR empresa_id = get_user_empresa_id());

-- motores
ALTER TABLE public.motores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "motores_policy" ON public.motores;
CREATE POLICY motores_policy ON public.motores
FOR ALL TO authenticated
USING (is_admin() OR empresa_id = get_user_empresa_id())
WITH CHECK (is_admin() OR empresa_id = get_user_empresa_id());

-- pagos
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pagos_policy" ON public.pagos;
CREATE POLICY pagos_policy ON public.pagos
FOR ALL TO authenticated
USING (is_admin() OR empresa_id = get_user_empresa_id())
WITH CHECK (is_admin() OR empresa_id = get_user_empresa_id());

-- rutas
ALTER TABLE public.rutas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rutas_policy" ON public.rutas;
DROP POLICY IF EXISTS "rutas_authenticated" ON public.rutas;
CREATE POLICY rutas_policy ON public.rutas
FOR ALL TO authenticated
USING (is_admin() OR empresa_id = get_user_empresa_id())
WITH CHECK (is_admin() OR empresa_id = get_user_empresa_id());

-- cajas
ALTER TABLE public.cajas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cajas_policy" ON public.cajas;
DROP POLICY IF EXISTS "cajas_authenticated" ON public.cajas;
CREATE POLICY cajas_policy ON public.cajas
FOR ALL TO authenticated
USING (is_admin() OR empresa_id = get_user_empresa_id())
WITH CHECK (is_admin() OR empresa_id = get_user_empresa_id());

-- movimientos_caja (via cajas.empresa_id)
ALTER TABLE public.movimientos_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "movimientos_caja_policy" ON public.movimientos_caja;
DROP POLICY IF EXISTS "movimientos_caja_authenticated" ON public.movimientos_caja;
CREATE POLICY movimientos_caja_policy ON public.movimientos_caja
FOR ALL TO authenticated
USING (
  is_admin()
  OR EXISTS (SELECT 1 FROM public.cajas c WHERE c.id = caja_id AND c.empresa_id = get_user_empresa_id())
)
WITH CHECK (
  is_admin()
  OR EXISTS (SELECT 1 FROM public.cajas c WHERE c.id = caja_id AND c.empresa_id = get_user_empresa_id())
);

-- whatsapp_cola_mensajes
ALTER TABLE public.whatsapp_cola_mensajes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_cola_mensajes_policy" ON public.whatsapp_cola_mensajes;
DROP POLICY IF EXISTS "whatsapp_authenticated" ON public.whatsapp_cola_mensajes;
CREATE POLICY whatsapp_cola_mensajes_policy ON public.whatsapp_cola_mensajes
FOR ALL TO authenticated
USING (is_admin() OR empresa_id = get_user_empresa_id())
WITH CHECK (is_admin() OR empresa_id = get_user_empresa_id());

-- actividad_logs
ALTER TABLE public.actividad_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "actividad_logs_policy" ON public.actividad_logs;
DROP POLICY IF EXISTS "actividad_logs_authenticated" ON public.actividad_logs;
CREATE POLICY actividad_logs_policy ON public.actividad_logs
FOR ALL TO authenticated
USING (is_admin() OR empresa_id = get_user_empresa_id())
WITH CHECK (is_admin() OR empresa_id = get_user_empresa_id());

-- cuotas_detalladas (empresa_id directo; fallback EXISTS si empresa_id es NULL)
ALTER TABLE public.cuotas_detalladas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cuotas_detalladas_policy" ON public.cuotas_detalladas;
DROP POLICY IF EXISTS "cuotas_authenticated" ON public.cuotas_detalladas;
CREATE POLICY cuotas_detalladas_policy ON public.cuotas_detalladas
FOR ALL TO authenticated
USING (
  is_admin()
  OR empresa_id = get_user_empresa_id()
  OR (empresa_id IS NULL AND EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = venta_id AND v.empresa_id = get_user_empresa_id()))
)
WITH CHECK (
  is_admin()
  OR empresa_id = get_user_empresa_id()
  OR (empresa_id IS NULL AND EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = venta_id AND v.empresa_id = get_user_empresa_id()))
);

-- legal_document_versions (tabla global: solo super_admin)
ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "legal_document_versions_policy" ON public.legal_document_versions;
DROP POLICY IF EXISTS "legal_authenticated" ON public.legal_document_versions;
CREATE POLICY legal_document_versions_policy ON public.legal_document_versions
FOR ALL TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- solicitudes_cambio
ALTER TABLE public.solicitudes_cambio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "solicitudes_cambio_policy" ON public.solicitudes_cambio;
DROP POLICY IF EXISTS "solicitudes_cambio_authenticated" ON public.solicitudes_cambio;
CREATE POLICY solicitudes_cambio_policy ON public.solicitudes_cambio
FOR ALL TO authenticated
USING (is_admin() OR empresa_id = get_user_empresa_id())
WITH CHECK (is_admin() OR empresa_id = get_user_empresa_id());

-- recordatorios_pago
ALTER TABLE public.recordatorios_pago ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recordatorios_pago_policy" ON public.recordatorios_pago;
DROP POLICY IF EXISTS "recordatorios_pago_authenticated" ON public.recordatorios_pago;
CREATE POLICY recordatorios_pago_policy ON public.recordatorios_pago
FOR ALL TO authenticated
USING (is_admin() OR empresa_id = get_user_empresa_id())
WITH CHECK (is_admin() OR empresa_id = get_user_empresa_id());

-- FORCE RLS: evita que service_role o futuras configuraciones ignoren RLS accidentalmente
ALTER TABLE public.empresas FORCE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ventas FORCE ROW LEVEL SECURITY;
