-- =====================================================
-- AGREGAR TODOS LOS CAMPOS OPCIONALES A CLIENTES
-- Ejecutar UNA SOLA VEZ en Supabase SQL Editor (por proyecto).
-- El aislamiento por empresa (RLS) no afecta las columnas:
-- las columnas son de la tabla y se aplican a todas las empresas.
-- =====================================================

-- Campos del formulario e importación
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS nombre_garante VARCHAR(255);
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS email_garante VARCHAR(255);
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS direccion_garante TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS telefono_garante TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS fecha_compra DATE;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS numero_prestamo_cliente VARCHAR(255);
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS url_id_frontal TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS url_id_trasera TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS url_contrato TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS latitud_negocio DOUBLE PRECISION;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS longitud_negocio DOUBLE PRECISION;

-- updated_at (para auditoría)
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Índices opcionales para búsquedas
CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_email_garante ON public.clientes(email_garante);

-- Comentarios
COMMENT ON COLUMN public.clientes.email IS 'Email del cliente para recordatorios y notificaciones';
COMMENT ON COLUMN public.clientes.email_garante IS 'Email del garante para recordatorios';
COMMENT ON COLUMN public.clientes.updated_at IS 'Última actualización del registro';
