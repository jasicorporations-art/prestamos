BEGIN;

CREATE TABLE IF NOT EXISTS public.solicitudes_prestamos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  empresa_id uuid NOT NULL
    REFERENCES public.empresas(id) ON DELETE CASCADE,

  datos_cliente jsonb NOT NULL,
  creado_por_cliente boolean NOT NULL DEFAULT false,

  monto_solicitado numeric(12,2) NOT NULL
    CHECK (monto_solicitado > 0),

  descripcion text,

  fotos_producto text[] NOT NULL DEFAULT '{}',

  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),

  pin_hash text NOT NULL
    CHECK (length(trim(pin_hash)) >= 20),

  pin_intentos integer NOT NULL DEFAULT 0
    CHECK (pin_intentos >= 0),

  pin_ultimo_intento_at timestamptz NULL,
  pin_bloqueado_hasta timestamptz NULL,

  aprobado_cliente_id uuid NULL
    REFERENCES public.clientes(id) ON DELETE SET NULL,

  aprobado_motor_id uuid NULL
    REFERENCES public.motores(id) ON DELETE SET NULL,

  aprobado_venta_id uuid NULL
    REFERENCES public.ventas(id) ON DELETE SET NULL,

  aprobado_por_user_id uuid NULL,
  fecha_decision timestamptz NULL,
  motivo_rechazo text NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT solicitudes_prestamos_fotos_no_vacias_check
    CHECK (array_position(fotos_producto, '') IS NULL),

  CONSTRAINT solicitudes_prestamos_estado_aprobacion_check
    CHECK (
      (
        estado = 'pendiente'
        AND fecha_decision IS NULL
      )
      OR
      (
        estado = 'rechazado'
        AND fecha_decision IS NOT NULL
      )
      OR
      (
        estado = 'aprobado'
        AND fecha_decision IS NOT NULL
      )
    ),

  CONSTRAINT solicitudes_prestamos_aprobado_refs_check
    CHECK (
      estado <> 'aprobado'
      OR (
        aprobado_cliente_id IS NOT NULL
        AND aprobado_motor_id IS NOT NULL
        AND aprobado_venta_id IS NOT NULL
      )
    )
);

-- MIGRACION INCREMENTAL (cuando la tabla ya existe):
ALTER TABLE public.solicitudes_prestamos
  ADD COLUMN IF NOT EXISTS creado_por_cliente boolean;

UPDATE public.solicitudes_prestamos
SET creado_por_cliente = false
WHERE creado_por_cliente IS NULL;

ALTER TABLE public.solicitudes_prestamos
  ALTER COLUMN creado_por_cliente SET DEFAULT false;

ALTER TABLE public.solicitudes_prestamos
  ALTER COLUMN creado_por_cliente SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_solicitudes_prestamos_empresa_estado
  ON public.solicitudes_prestamos(empresa_id, estado);

CREATE INDEX IF NOT EXISTS idx_solicitudes_prestamos_creado_por_cliente
  ON public.solicitudes_prestamos(creado_por_cliente);

CREATE INDEX IF NOT EXISTS idx_solicitudes_prestamos_created_at
  ON public.solicitudes_prestamos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_solicitudes_prestamos_cedula
  ON public.solicitudes_prestamos ((datos_cliente->>'cedula'));

CREATE INDEX IF NOT EXISTS idx_solicitudes_prestamos_empresa_created
  ON public.solicitudes_prestamos(empresa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_solicitudes_prestamos_estado_created
  ON public.solicitudes_prestamos(estado, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_solicitudes_prestamos_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_touch_solicitudes_prestamos_updated_at
ON public.solicitudes_prestamos;

CREATE TRIGGER tr_touch_solicitudes_prestamos_updated_at
BEFORE UPDATE ON public.solicitudes_prestamos
FOR EACH ROW
EXECUTE FUNCTION public.touch_solicitudes_prestamos_updated_at();

COMMIT;
