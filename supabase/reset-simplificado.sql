-- ================================================================
-- RESET SIMPLIFICADO: Base de datos limpia + seed + RLS
-- Supabase / Postgres - Todo en un solo archivo
-- Ejecutar en: SQL Editor > New query > Pegar y Run
-- ================================================================

BEGIN;

-- 1) Deshabilitar RLS para poder dropear
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'perfiles','empresas','sucursales','ventas','clientes','motores','pagos',
    'rutas','cajas','movimientos_caja','cuotas_detalladas','whatsapp_cola_mensajes',
    'actividad_logs','solicitudes_cambio','recordatorios_pago','legal_document_versions'
  ] LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I DISABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- 2) DROP tablas (orden por dependencias)
DROP TABLE IF EXISTS public.recordatorios_pago CASCADE;
DROP TABLE IF EXISTS public.solicitudes_cambio CASCADE;
DROP TABLE IF EXISTS public.whatsapp_cola_mensajes CASCADE;
DROP TABLE IF EXISTS public.movimientos_caja CASCADE;
DROP TABLE IF EXISTS public.cajas CASCADE;
DROP TABLE IF EXISTS public.cuotas_detalladas CASCADE;
DROP TABLE IF EXISTS public.pagos CASCADE;
DROP TABLE IF EXISTS public.ventas CASCADE;
DROP TABLE IF EXISTS public.rutas CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.motores CASCADE;
DROP TABLE IF EXISTS public.actividad_logs CASCADE;
DROP TABLE IF EXISTS public.legal_document_versions CASCADE;
DROP TABLE IF EXISTS public.perfiles CASCADE;
DROP TABLE IF EXISTS public.sucursales CASCADE;
DROP TABLE IF EXISTS public.empresas CASCADE;

-- 3) DROP funciones
DROP FUNCTION IF EXISTS public.crear_sucursal_por_defecto() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_empresa_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_sucursal_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- 4) Función updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- ================================================================
-- 5) TABLAS
-- ================================================================

CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  rnc text, direccion text, telefono text, email text,
  activo boolean DEFAULT true,
  status text DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.sucursales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre varchar(255) NOT NULL,
  direccion text, telefono varchar(50), activa boolean DEFAULT true,
  cobrar_domingos boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sucursales_updated_at BEFORE UPDATE ON public.sucursales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: sucursal Principal al crear empresa
CREATE OR REPLACE FUNCTION public.crear_sucursal_por_defecto()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.sucursales (empresa_id, nombre, direccion, telefono, activa)
  VALUES (NEW.id, 'Principal', COALESCE(NEW.direccion,''), COALESCE(NEW.telefono,''), true);
  RETURN NEW;
END;
$$;
CREATE TRIGGER tr_crear_sucursal_on_empresa AFTER INSERT ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.crear_sucursal_por_defecto();

CREATE TABLE public.perfiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text, nombre_completo varchar(255),
  rol varchar(50) NOT NULL DEFAULT 'Vendedor' CHECK (lower(rol) IN ('vendedor','admin','super_admin')),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  activo boolean DEFAULT true,
  has_whatsapp_premium boolean DEFAULT false,
  terminos_version text, privacidad_aceptada boolean DEFAULT true, terminos_aceptados boolean DEFAULT false,
  fecha_aceptacion timestamptz, privacidad_fecha_aceptacion timestamptz, privacidad_version text, privacidad_ip text, ip_registro text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.motores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  marca text NOT NULL, modelo text, matricula text NOT NULL, numero_chasis text NOT NULL,
  precio_venta decimal(12,2) NOT NULL,
  estado text DEFAULT 'Disponible' CHECK (estado IN ('Disponible','Vendido')),
  cantidad integer DEFAULT 1, app_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  nombre_completo text NOT NULL, cedula text NOT NULL, celular text, direccion text,
  numero_prestamo_cliente varchar(255),
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX idx_cliente_empresa_cedula ON public.clientes (empresa_id, cedula);
CREATE UNIQUE INDEX idx_cliente_empresa_numero ON public.clientes (empresa_id, numero_prestamo_cliente)
  WHERE numero_prestamo_cliente IS NOT NULL;

CREATE TABLE public.rutas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  descripcion text,
  activa boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  motor_id uuid NOT NULL REFERENCES public.motores(id),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  ruta_id uuid REFERENCES public.rutas(id),
  monto_total decimal(12,2) NOT NULL,
  saldo_pendiente decimal(12,2) NOT NULL,
  cantidad_cuotas integer NOT NULL CHECK (cantidad_cuotas > 0),
  fecha_venta timestamptz NOT NULL DEFAULT now(),
  mora_abonada decimal(12,2) DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('pending','active','rejected','completed')),
  numero_prestamo text, porcentaje_interes decimal(5,2) DEFAULT 0,
  tipo_interes varchar(20) DEFAULT 'interes', metodo_interes varchar(20) DEFAULT 'fijo',
  tipo_pago varchar(20) DEFAULT 'financiamiento', descuento_contado decimal(10,2) DEFAULT 0,
  plazo_meses integer, tipo_plazo varchar(20) DEFAULT 'mensual',
  dia_pago_semanal integer, fecha_inicio_quincenal date, dia_pago_mensual integer,
  proxima_fecha_pago timestamptz,
  tipo_garantia text, descripcion_garantia text, valor_estimado decimal(12,2),
  orden_visita integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_ventas_updated_at BEFORE UPDATE ON public.ventas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  venta_id uuid NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  monto decimal(12,2) NOT NULL,
  fecha_pago timestamptz DEFAULT now(),
  es_abono_parcial boolean DEFAULT false,
  autorizado_por_admin boolean DEFAULT false,
  numero_cuota integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cuotas_detalladas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  venta_id uuid NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  numero_cuota int NOT NULL,
  fecha_pago date,
  fecha_vencimiento date,
  cuota_fija decimal(12,2),
  interes_mes decimal(12,2),
  abono_capital decimal(12,2),
  saldo_pendiente decimal(12,2),
  monto_cuota decimal(12,2) NOT NULL DEFAULT 0,
  estado text DEFAULT 'Pendiente',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (venta_id, numero_cuota)
);

CREATE TRIGGER update_cuotas_updated_at BEFORE UPDATE ON public.cuotas_detalladas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_cuotas_detalladas_venta ON public.cuotas_detalladas (venta_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_detalladas_empresa ON public.cuotas_detalladas (empresa_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_detalladas_fecha ON public.cuotas_detalladas (fecha_pago);

CREATE TABLE public.cajas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  monto_apertura decimal(12,2) DEFAULT 0,
  estado text DEFAULT 'Abierta',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.movimientos_caja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_id uuid REFERENCES public.cajas(id) ON DELETE CASCADE,
  tipo text CHECK (tipo IN ('Entrada','Salida')),
  monto decimal(12,2), concepto text,
  fecha_hora timestamptz DEFAULT now()
);

CREATE TABLE public.whatsapp_cola_mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  venta_id uuid REFERENCES public.ventas(id),
  payload jsonb, status text DEFAULT 'pendiente',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.solicitudes_cambio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  tipo varchar(50) NOT NULL DEFAULT 'renovacion' CHECK (tipo IN ('renovacion','nuevo')),
  monto_solicitado decimal(10,2), plazo_solicitado integer, datos_extra jsonb,
  solicitado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','aprobada','rechazada')),
  aprobado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha_aprobacion timestamptz, observaciones text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.recordatorios_pago (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  prestamo_id uuid REFERENCES public.ventas(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  fecha_recordatorio date NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX idx_recordatorios_pago_unico ON public.recordatorios_pago (cliente_id, fecha_recordatorio);

CREATE TABLE public.legal_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento text CHECK (documento IN ('terminos','privacidad')),
  version text NOT NULL, effective_date date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.actividad_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES auth.users(id),
  accion text NOT NULL, detalle text,
  fecha_hora timestamptz DEFAULT now()
);

-- ================================================================
-- 6) FUNCIONES DE SEGURIDAD
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  RETURN (SELECT empresa_id FROM public.perfiles WHERE user_id = auth.uid() AND activo = true LIMIT 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_sucursal_id()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  RETURN (SELECT sucursal_id FROM public.perfiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.perfiles WHERE user_id = auth.uid() AND activo = true AND lower(rol) IN ('admin','super_admin'));
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.perfiles WHERE user_id = auth.uid() AND activo = true AND lower(rol) = 'super_admin');
END;
$$;

-- ================================================================
-- 7) SEED: Super admin + Empresa inicial
-- ================================================================

INSERT INTO public.perfiles (user_id, email, nombre_completo, rol, activo, has_whatsapp_premium)
SELECT id, email, 'John Rijo', 'super_admin', true, true
FROM auth.users WHERE email = 'johnrijo6@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET rol='super_admin', activo=true, nombre_completo='John Rijo', email=excluded.email;

INSERT INTO public.empresas (nombre, user_id, activo)
SELECT 'Mi Empresa', u.id, true
FROM auth.users u WHERE u.email = 'johnrijo6@gmail.com'
ON CONFLICT (nombre) DO UPDATE SET user_id = excluded.user_id, activo = true;

UPDATE public.perfiles p SET empresa_id = e.id
FROM public.empresas e
WHERE p.user_id = e.user_id AND p.user_id IN (SELECT id FROM auth.users WHERE email='johnrijo6@gmail.com');

UPDATE public.perfiles p SET sucursal_id = s.id
FROM public.sucursales s
JOIN public.empresas e ON e.id = s.empresa_id
WHERE p.user_id = e.user_id AND p.user_id IN (SELECT id FROM auth.users WHERE email='johnrijo6@gmail.com') AND s.nombre = 'Principal';

-- ================================================================
-- 8) RLS + POLICIES
-- ================================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'empresas','sucursales','perfiles','ventas','clientes','motores','pagos',
    'rutas','cajas','whatsapp_cola_mensajes','actividad_logs','solicitudes_cambio','recordatorios_pago'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
  ALTER TABLE public.cuotas_detalladas ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;
END $$;

DROP POLICY IF EXISTS empresas_policy ON public.empresas;
CREATE POLICY empresas_policy ON public.empresas FOR ALL TO authenticated
  USING (is_admin() OR id = get_user_empresa_id() OR user_id = auth.uid())
  WITH CHECK (is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS sucursales_policy ON public.sucursales;
CREATE POLICY sucursales_policy ON public.sucursales FOR ALL TO authenticated
  USING (is_admin() OR empresa_id = get_user_empresa_id())
  WITH CHECK (is_admin() OR empresa_id = get_user_empresa_id());

DROP POLICY IF EXISTS perfiles_policy ON public.perfiles;
CREATE POLICY perfiles_policy ON public.perfiles FOR ALL TO authenticated
  USING (is_admin() OR user_id = auth.uid())
  WITH CHECK (is_admin() OR user_id = auth.uid());

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ventas','clientes','motores','pagos','rutas','cajas',
    'whatsapp_cola_mensajes','actividad_logs','solicitudes_cambio','recordatorios_pago'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_policy ON public.%I', t, t);
    EXECUTE format($q$
      CREATE POLICY %I_policy ON public.%I FOR ALL TO authenticated
      USING (is_admin() OR empresa_id = get_user_empresa_id())
      WITH CHECK (is_admin() OR empresa_id = get_user_empresa_id())
    $q$, t, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS movimientos_caja_policy ON public.movimientos_caja;
CREATE POLICY movimientos_caja_policy ON public.movimientos_caja FOR ALL TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM public.cajas c WHERE c.id = caja_id AND c.empresa_id = get_user_empresa_id()))
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM public.cajas c WHERE c.id = caja_id AND c.empresa_id = get_user_empresa_id()));

DROP POLICY IF EXISTS cuotas_detalladas_policy ON public.cuotas_detalladas;
CREATE POLICY cuotas_detalladas_policy ON public.cuotas_detalladas FOR ALL TO authenticated
  USING (
    is_admin() OR empresa_id = get_user_empresa_id()
    OR (empresa_id IS NULL AND EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = venta_id AND v.empresa_id = get_user_empresa_id()))
  )
  WITH CHECK (
    is_admin() OR empresa_id = get_user_empresa_id()
    OR (empresa_id IS NULL AND EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = venta_id AND v.empresa_id = get_user_empresa_id()))
  );

DROP POLICY IF EXISTS legal_document_versions_policy ON public.legal_document_versions;
CREATE POLICY legal_document_versions_policy ON public.legal_document_versions FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

ALTER TABLE public.movimientos_caja ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.empresas FORCE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ventas FORCE ROW LEVEL SECURITY;

COMMIT;

-- ================================================================
-- Verificación (ejecutar aparte si quieres comprobar)
-- ================================================================
-- SELECT id, nombre FROM public.empresas;
-- SELECT user_id, email, rol, empresa_id, sucursal_id, activo FROM public.perfiles;
-- SELECT id, nombre, empresa_id FROM public.sucursales;
