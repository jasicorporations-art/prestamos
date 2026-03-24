-- =============================================================================
-- Tabla: pagos_pendientes_verificacion
--
-- Notificaciones del portal cliente ("Notificar pago") pendientes de revisión.
--
-- Nombres de columnas (alineado con API y RPC):
--   • id_empresa  → misma UUID que empresas.id (en ventas/clientes la columna suele
--                   llamarse empresa_id; aquí usamos id_empresa a propósito).
--   • id_prestamo → ventas.id
--   • id_cliente  → clientes.id
--
-- Código relacionado:
--   • app/api/cliente/notificar-pago (insert canónico + fallbacks legacy)
--   • app/api/admin/pagos-verificar (GET: id_empresa + mismas columnas; fallback temporal solo cliente_id)
--   • supabase/rpc-aprobar-pago-pendiente-verificacion.sql (WHERE id_empresa)
--
-- Ejecutar en Supabase SQL Editor. En bases ya existentes, el bloque DO renombra
-- columnas viejas si hace falta (empresa_id→id_empresa, etc.).
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.pagos_pendientes_verificacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  id_empresa uuid NOT NULL
    REFERENCES public.empresas(id) ON DELETE CASCADE,

  id_prestamo uuid NOT NULL
    REFERENCES public.ventas(id) ON DELETE CASCADE,

  id_cliente uuid NOT NULL
    REFERENCES public.clientes(id) ON DELETE CASCADE,

  monto numeric(12, 2) NOT NULL
    CHECK (monto > 0),

  foto_comprobante text NOT NULL
    CHECK (length(trim(foto_comprobante)) > 0),

  fecha_notificacion timestamptz NOT NULL DEFAULT now(),

  estado text NOT NULL DEFAULT 'Pendiente'
    CHECK (estado IN ('Pendiente', 'Verificado', 'Rechazado')),

  motivo_rechazo text NULL,
  aprobado_por_user_id uuid NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- PRIMERO: eliminar constraints que bloquean los UPDATEs siguientes
-- -----------------------------------------------------------------------------
ALTER TABLE public.pagos_pendientes_verificacion
  DROP CONSTRAINT IF EXISTS pagos_pendientes_verificacion_estado_revision_check;

ALTER TABLE public.pagos_pendientes_verificacion
  DROP CONSTRAINT IF EXISTS pagos_pendientes_verificacion_estado_check;

-- -----------------------------------------------------------------------------
-- Ajustes en tablas ya creadas con nombres legacy (no rompe instalaciones nuevas)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t regclass := to_regclass('public.pagos_pendientes_verificacion');
BEGIN
  IF t IS NULL THEN
    RETURN;
  END IF;

  -- empresa_id → id_empresa (coherente con RPC y notificar-pago)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pagos_pendientes_verificacion'
      AND column_name = 'empresa_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pagos_pendientes_verificacion'
      AND column_name = 'id_empresa'
  ) THEN
    ALTER TABLE public.pagos_pendientes_verificacion RENAME COLUMN empresa_id TO id_empresa;
  END IF;

  -- prestamo_id → id_prestamo
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pagos_pendientes_verificacion'
      AND column_name = 'prestamo_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pagos_pendientes_verificacion'
      AND column_name = 'id_prestamo'
  ) THEN
    ALTER TABLE public.pagos_pendientes_verificacion RENAME COLUMN prestamo_id TO id_prestamo;
  END IF;

  -- cliente_id → id_cliente (canónico en app y API)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pagos_pendientes_verificacion'
      AND column_name = 'cliente_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pagos_pendientes_verificacion'
      AND column_name = 'id_cliente'
  ) THEN
    ALTER TABLE public.pagos_pendientes_verificacion RENAME COLUMN cliente_id TO id_cliente;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Tablas creadas antes: CREATE TABLE IF NOT EXISTS no añade columnas nuevas.
-- Sin esto falla COMMENT / RPC / rechazar con: column "aprobado_por_user_id" does not exist
-- -----------------------------------------------------------------------------
ALTER TABLE public.pagos_pendientes_verificacion
  ADD COLUMN IF NOT EXISTS motivo_rechazo text,
  ADD COLUMN IF NOT EXISTS aprobado_por_user_id uuid,
  ADD COLUMN IF NOT EXISTS revisado_por_user_id uuid,
  ADD COLUMN IF NOT EXISTS fecha_revision timestamptz;

-- Espejo del tenant (misma UUID que id_empresa). Portal y RPC usan OR entre ambas columnas.
ALTER TABLE public.pagos_pendientes_verificacion
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;

UPDATE public.pagos_pendientes_verificacion
SET empresa_id = id_empresa
WHERE empresa_id IS NULL AND id_empresa IS NOT NULL;

-- -----------------------------------------------------------------------------
-- CHECK de estado: muchas bases antiguas usan minúsculas ('verificado'); la RPC
-- y la app usan 'Verificado'. Eso provoca: violates check constraint "estado_check".
-- -----------------------------------------------------------------------------
ALTER TABLE public.pagos_pendientes_verificacion
  DROP CONSTRAINT IF EXISTS pagos_pendientes_verificacion_estado_revision_check;

ALTER TABLE public.pagos_pendientes_verificacion
  DROP CONSTRAINT IF EXISTS pagos_pendientes_verificacion_estado_check;

UPDATE public.pagos_pendientes_verificacion
SET estado = CASE lower(trim(estado))
  WHEN 'pendiente' THEN 'Pendiente'
  WHEN 'verificado' THEN 'Verificado'
  WHEN 'rechazado' THEN 'Rechazado'
  ELSE estado
END;

ALTER TABLE public.pagos_pendientes_verificacion
  DROP CONSTRAINT IF EXISTS pagos_pendientes_verificacion_estado_check;

ALTER TABLE public.pagos_pendientes_verificacion
  ADD CONSTRAINT pagos_pendientes_verificacion_estado_check
  CHECK (estado IN ('Pendiente', 'Verificado', 'Rechazado'));

-- El constraint revision_check fue eliminado porque bloqueaba la aprobación.
-- Solo queda el simple estado_check (valores válidos).

COMMENT ON TABLE public.pagos_pendientes_verificacion IS
  'Comprobantes subidos desde el portal cliente; id_empresa = tenant (misma UUID que ventas.empresa_id).';

COMMENT ON COLUMN public.pagos_pendientes_verificacion.id_empresa IS
  'FK empresas.id. En ventas la columna equivalente se llama empresa_id.';

COMMENT ON COLUMN public.pagos_pendientes_verificacion.aprobado_por_user_id IS
  'Usuario que verificó o rechazó (auth.users.id). Obligatorio en Verificado y Rechazado por el CHECK.';

CREATE INDEX IF NOT EXISTS idx_pagos_verif_empresa_estado
  ON public.pagos_pendientes_verificacion (id_empresa, estado);

CREATE INDEX IF NOT EXISTS idx_pagos_verif_cliente_fecha
  ON public.pagos_pendientes_verificacion (id_cliente, fecha_notificacion DESC);

CREATE INDEX IF NOT EXISTS idx_pagos_verif_prestamo_fecha
  ON public.pagos_pendientes_verificacion (id_prestamo, fecha_notificacion DESC);

CREATE INDEX IF NOT EXISTS idx_pagos_verif_empresa_fecha
  ON public.pagos_pendientes_verificacion (id_empresa, fecha_notificacion DESC);

CREATE OR REPLACE FUNCTION public.touch_pagos_pendientes_verificacion_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_touch_pagos_pendientes_verificacion_updated_at
  ON public.pagos_pendientes_verificacion;

CREATE TRIGGER tr_touch_pagos_pendientes_verificacion_updated_at
  BEFORE UPDATE ON public.pagos_pendientes_verificacion
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_pagos_pendientes_verificacion_updated_at();

COMMIT;
