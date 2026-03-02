-- ================================================================
-- RESET BASE DE DATOS - VERSIÓN CORREGIDA
-- Soluciona: error "no tengo rol", datos que desaparecen, columnas faltantes
-- Ejecutar en Supabase: SQL Editor > New query > Pegar y Run
-- ⚠️ ADVERTENCIA: La sección 1 (LIMPIEZA) borra todas las tablas y datos.
-- ================================================================

BEGIN;

-- ================================================================
-- 1. LIMPIEZA TOTAL (elimina tablas existentes para poder recrear)
-- ================================================================
ALTER TABLE IF EXISTS public.perfiles DISABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.legal_aceptaciones CASCADE;
DROP TABLE IF EXISTS public.legal_document_versions CASCADE;
DROP TABLE IF EXISTS public.whatsapp_cola_mensajes CASCADE;
DROP TABLE IF EXISTS public.whatsapp_recargas CASCADE;
DROP TABLE IF EXISTS public.whatsapp_consumo_mensual CASCADE;
DROP TABLE IF EXISTS public.actividad_logs CASCADE;
DROP TABLE IF EXISTS public.recordatorios_pago CASCADE;
DROP TABLE IF EXISTS public.solicitudes_cambio CASCADE;
DROP TABLE IF EXISTS public.cuotas_detalladas CASCADE;
DROP TABLE IF EXISTS public.movimientos_caja CASCADE;
DROP TABLE IF EXISTS public.cajas CASCADE;
DROP TABLE IF EXISTS public.rutas CASCADE;
DROP TABLE IF EXISTS public.pagos CASCADE;
DROP TABLE IF EXISTS public.ventas CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.motores CASCADE;
DROP TABLE IF EXISTS public.perfiles CASCADE;
DROP TABLE IF EXISTS public.sucursales CASCADE;
DROP TABLE IF EXISTS public.empresas CASCADE;

DROP FUNCTION IF EXISTS public.crear_sucursal_por_defecto() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_empresa_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_sucursal_id() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- ================================================================
-- 2. FUNCIÓN updated_at (necesaria para triggers)
-- ================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ================================================================
-- 3. ESTRUCTURA DE TABLAS
-- ================================================================

-- EMPRESAS
CREATE TABLE public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    rnc TEXT, direccion TEXT, telefono TEXT, email TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUCURSALES
CREATE TABLE public.sucursales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    direccion TEXT, telefono VARCHAR(50),
    activa BOOLEAN DEFAULT true,
    cobrar_domingos BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: crear sucursal Principal al crear empresa
CREATE OR REPLACE FUNCTION public.crear_sucursal_por_defecto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sucursales (empresa_id, nombre, direccion, telefono, activa)
  VALUES (NEW.id, 'Principal', COALESCE(NEW.direccion, ''), COALESCE(NEW.telefono, ''), true);
  RETURN NEW;
END;
$$;
CREATE TRIGGER tr_crear_sucursal_on_empresa AFTER INSERT ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.crear_sucursal_por_defecto();

CREATE TRIGGER update_empresas_updated_at
BEFORE UPDATE ON public.empresas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sucursales_updated_at
BEFORE UPDATE ON public.sucursales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PERFILES
CREATE TABLE public.perfiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nombre_completo VARCHAR(255),
    rol VARCHAR(50) DEFAULT 'Vendedor',
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT true,
    has_whatsapp_premium BOOLEAN DEFAULT false,
    terminos_version TEXT,
    privacidad_aceptada BOOLEAN DEFAULT true,
    terminos_aceptados BOOLEAN DEFAULT false,
    fecha_aceptacion TIMESTAMPTZ,
    privacidad_fecha_aceptacion TIMESTAMPTZ,
    privacidad_version TEXT,
    privacidad_ip TEXT,
    ip_registro TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.perfiles ALTER COLUMN rol SET NOT NULL;
ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS rol_check;
ALTER TABLE public.perfiles ADD CONSTRAINT rol_check CHECK (LOWER(rol) IN ('vendedor','admin','super_admin'));

-- MOTORES (con cantidad para inventario)
CREATE TABLE public.motores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    marca TEXT NOT NULL, modelo TEXT, matricula TEXT NOT NULL,
    numero_chasis TEXT NOT NULL, precio_venta DECIMAL(12,2) NOT NULL,
    estado TEXT DEFAULT 'Disponible' CHECK (estado IN ('Disponible', 'Vendido')),
    cantidad INTEGER DEFAULT 1,
    app_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLIENTES
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL,
    nombre_completo TEXT NOT NULL, cedula TEXT NOT NULL,
    celular TEXT, direccion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_cliente_empresa_cedula ON public.clientes (empresa_id, cedula);

-- RUTAS
CREATE TABLE public.rutas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL, activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VENTAS (con todas las columnas que usa la app)
CREATE TABLE public.ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL,
    motor_id UUID NOT NULL REFERENCES public.motores(id),
    cliente_id UUID NOT NULL REFERENCES public.clientes(id),
    ruta_id UUID REFERENCES public.rutas(id),
    monto_total DECIMAL(12,2) NOT NULL,
    saldo_pendiente DECIMAL(12,2) NOT NULL,
    cantidad_cuotas INTEGER NOT NULL CHECK (cantidad_cuotas > 0), -- REQUERIDO
    fecha_venta TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- REQUERIDO
    mora_abonada DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'rejected', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Columnas adicionales para ventas (financiamiento, interés, etc.)
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS numero_prestamo TEXT;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS porcentaje_interes DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS tipo_interes VARCHAR(20) DEFAULT 'interes';
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS metodo_interes VARCHAR(20) DEFAULT 'fijo';
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS tipo_pago VARCHAR(20) DEFAULT 'financiamiento';
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS descuento_contado DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS plazo_meses INTEGER;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS tipo_plazo VARCHAR(20) DEFAULT 'mensual';
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS dia_pago_semanal INTEGER;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS fecha_inicio_quincenal DATE;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS dia_pago_mensual INTEGER;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS proxima_fecha_pago TIMESTAMPTZ;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS tipo_garantia TEXT;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS descripcion_garantia TEXT;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS valor_estimado DECIMAL(12, 2);

CREATE TRIGGER update_ventas_updated_at BEFORE UPDATE ON public.ventas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PAGOS
CREATE TABLE public.pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    monto DECIMAL(12,2) NOT NULL,
    fecha_pago TIMESTAMPTZ DEFAULT NOW(),
    es_abono_parcial BOOLEAN DEFAULT false,
    autorizado_por_admin BOOLEAN DEFAULT false,
    numero_cuota INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUOTAS DETALLADAS (amortización francesa)
CREATE TABLE public.cuotas_detalladas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    numero_cuota INT NOT NULL,
    fecha_pago DATE NOT NULL,
    cuota_fija DECIMAL(12,2) NOT NULL,
    interes_mes DECIMAL(12,2) NOT NULL,
    abono_capital DECIMAL(12,2) NOT NULL,
    saldo_pendiente DECIMAL(12,2) NOT NULL,
    monto_cuota DECIMAL(12,2) NOT NULL,
    fecha_vencimiento DATE,
    estado TEXT DEFAULT 'Pendiente',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cuotas_detalladas_unique ON public.cuotas_detalladas (venta_id, numero_cuota);
CREATE INDEX IF NOT EXISTS idx_cuotas_detalladas_fecha ON public.cuotas_detalladas (fecha_pago);
CREATE INDEX IF NOT EXISTS idx_cuotas_detalladas_empresa ON public.cuotas_detalladas (empresa_id);

CREATE TRIGGER update_cuotas_updated_at
BEFORE UPDATE ON public.cuotas_detalladas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CAJAS Y MOVIMIENTOS
CREATE TABLE public.cajas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    monto_apertura DECIMAL(12,2) DEFAULT 0, estado TEXT DEFAULT 'Abierta',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.movimientos_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caja_id UUID REFERENCES public.cajas(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('Entrada', 'Salida')), monto DECIMAL(12,2),
    concepto TEXT, fecha_hora TIMESTAMPTZ DEFAULT NOW()
);

-- WHATSAPP COLA
CREATE TABLE public.whatsapp_cola_mensajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    venta_id UUID REFERENCES public.ventas(id),
    payload JSONB, status TEXT DEFAULT 'pendiente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOLICITUDES CAMBIO (renovaciones)
CREATE TABLE public.solicitudes_cambio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL DEFAULT 'renovacion' CHECK (tipo IN ('renovacion', 'nuevo')),
    monto_solicitado DECIMAL(10, 2), plazo_solicitado INTEGER, datos_extra JSONB,
    solicitado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'aprobada', 'rechazada')),
    aprobado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    fecha_aprobacion TIMESTAMPTZ, observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RECORDATORIOS PAGO
CREATE TABLE public.recordatorios_pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    prestamo_id UUID REFERENCES public.ventas(id) ON DELETE SET NULL,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    fecha_recordatorio DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_recordatorios_pago_unico ON public.recordatorios_pago (cliente_id, fecha_recordatorio);

-- LEGAL Y AUDITORÍA
CREATE TABLE public.legal_document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento TEXT CHECK (documento IN ('terminos', 'privacidad')),
    version TEXT NOT NULL, effective_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.actividad_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id),
    accion TEXT NOT NULL, detalle TEXT, fecha_hora TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 5. FUNCIONES DE SEGURIDAD (creadas DESPUÉS de perfiles)
-- ================================================================
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.get_user_empresa_id();

CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN (
    SELECT empresa_id
    FROM public.perfiles
    WHERE user_id = auth.uid()
    AND activo = true
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_sucursal_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN (SELECT sucursal_id FROM public.perfiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.perfiles
    WHERE user_id = auth.uid()
    AND activo = true
    AND LOWER(rol) IN ('admin','super_admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.perfiles
    WHERE user_id = auth.uid()
    AND activo = true
    AND LOWER(rol) = 'super_admin'
  );
END;
$$;

-- ================================================================
-- 6. SUPER ADMIN + EMPRESA INICIAL
-- ================================================================
-- Crear perfil super_admin para johnrijo6@gmail.com
INSERT INTO public.perfiles (user_id, email, nombre_completo, rol, activo, has_whatsapp_premium)
SELECT id, email, 'John Rijo', 'super_admin', true, true
FROM auth.users WHERE email = 'johnrijo6@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET rol = 'super_admin', activo = true, nombre_completo = 'John Rijo';

-- Crear empresa inicial para el super_admin (si no existe)
INSERT INTO public.empresas (nombre, user_id, activo)
SELECT 'Mi Empresa', u.id, true
FROM auth.users u
WHERE u.email = 'johnrijo6@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM public.empresas e WHERE e.user_id = u.id);

-- Asignar empresa_id al super_admin (actualizar con la empresa recién creada)
UPDATE public.perfiles p
SET empresa_id = (SELECT id FROM public.empresas WHERE user_id = p.user_id LIMIT 1)
WHERE p.user_id IN (SELECT id FROM auth.users WHERE email = 'johnrijo6@gmail.com')
  AND p.empresa_id IS NULL;

-- Asignar sucursal Principal al super_admin
UPDATE public.perfiles p
SET sucursal_id = (SELECT s.id FROM public.sucursales s JOIN public.empresas e ON e.id = s.empresa_id WHERE e.user_id = p.user_id LIMIT 1)
WHERE p.user_id IN (SELECT id FROM auth.users WHERE email = 'johnrijo6@gmail.com')
  AND p.sucursal_id IS NULL;

COMMIT;

-- IMPORTANTE: Ejecutar aplicar-policies-multi-tenant.sql a continuación
-- para aplicar las políticas RLS a todas las tablas.
