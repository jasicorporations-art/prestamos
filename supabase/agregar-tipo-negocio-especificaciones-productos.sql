BEGIN;

-- ============================================================
-- Productos multi-propósito: tipo_negocio (ENUM) + especificaciones
-- ============================================================
-- tipo_negocio: ENUM prestamo_personal | dealer | electro
-- especificaciones: JSONB con campos según tipo (ver aplicación)
-- Trigger: motores.tipo_negocio hereda de empresas si viene NULL en INSERT
-- ============================================================

-- =========================================================
-- 1) Añadir columnas si no existen (TEXT primero; luego se convierte a ENUM)
-- =========================================================
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS tipo_negocio TEXT DEFAULT 'prestamo_personal';

ALTER TABLE public.motores
  ADD COLUMN IF NOT EXISTS tipo_negocio TEXT DEFAULT 'prestamo_personal';

ALTER TABLE public.motores
  ADD COLUMN IF NOT EXISTS especificaciones JSONB DEFAULT NULL;

COMMENT ON COLUMN public.empresas.tipo_negocio IS
  'Tipo de negocio: prestamo_personal | dealer | electro. Define el formulario de productos.';
COMMENT ON COLUMN public.motores.tipo_negocio IS
  'Tipo de producto: prestamo_personal | dealer | electro.';
COMMENT ON COLUMN public.motores.especificaciones IS
  'Campos variables según tipo_negocio. Dealer: marca, modelo, año, chasis, color. Electro: tipo_equipo, marca, serial, garantia.';

-- =========================================================
-- 2) Crear el ENUM si no existe
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'tipo_negocio_enum'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.tipo_negocio_enum AS ENUM (
      'prestamo_personal',
      'dealer',
      'electro'
    );
  END IF;
END
$$;

-- =========================================================
-- 3) (INFORMATIVO) Verificar datos inválidos antes de convertir
-- Si alguna consulta devuelve filas, corregir datos y volver a ejecutar
-- =========================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT 'empresas' AS tabla, tipo_negocio, COUNT(*) AS cantidad
    FROM public.empresas
    WHERE tipo_negocio IS NOT NULL
      AND tipo_negocio NOT IN ('prestamo_personal','dealer','electro')
    GROUP BY tipo_negocio
  LOOP
    RAISE WARNING 'Datos inválidos en %: tipo_negocio=% cantidad=%', r.tabla, r.tipo_negocio, r.cantidad;
  END LOOP;
  FOR r IN
    SELECT 'motores' AS tabla, tipo_negocio, COUNT(*) AS cantidad
    FROM public.motores
    WHERE tipo_negocio IS NOT NULL
      AND tipo_negocio NOT IN ('prestamo_personal','dealer','electro')
    GROUP BY tipo_negocio
  LOOP
    RAISE WARNING 'Datos inválidos en %: tipo_negocio=% cantidad=%', r.tabla, r.tipo_negocio, r.cantidad;
  END LOOP;
END
$$;

-- =========================================================
-- 4) Eliminar CHECKs anteriores si existen
-- =========================================================
ALTER TABLE public.empresas
  DROP CONSTRAINT IF EXISTS check_tipo_negocio_empresa;

ALTER TABLE public.motores
  DROP CONSTRAINT IF EXISTS check_tipo_negocio_producto;

-- =========================================================
-- 5) Convertir columnas TEXT a ENUM
-- Quitar DEFAULT antes del cambio de tipo (no se puede castear automáticamente)
-- =========================================================
ALTER TABLE public.empresas
  ALTER COLUMN tipo_negocio DROP DEFAULT;

ALTER TABLE public.motores
  ALTER COLUMN tipo_negocio DROP DEFAULT;

ALTER TABLE public.empresas
  ALTER COLUMN tipo_negocio TYPE public.tipo_negocio_enum
  USING (
    CASE
      WHEN tipo_negocio IS NULL THEN 'prestamo_personal'::public.tipo_negocio_enum
      ELSE tipo_negocio::public.tipo_negocio_enum
    END
  );

ALTER TABLE public.empresas
  ALTER COLUMN tipo_negocio SET DEFAULT 'prestamo_personal'::public.tipo_negocio_enum;

ALTER TABLE public.motores
  ALTER COLUMN tipo_negocio TYPE public.tipo_negocio_enum
  USING (
    CASE
      WHEN tipo_negocio IS NULL THEN 'prestamo_personal'::public.tipo_negocio_enum
      ELSE tipo_negocio::public.tipo_negocio_enum
    END
  );

ALTER TABLE public.motores
  ALTER COLUMN tipo_negocio SET DEFAULT 'prestamo_personal'::public.tipo_negocio_enum;

-- =========================================================
-- 6) Índice para listados por tipo
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_motores_tipo_negocio
  ON public.motores(tipo_negocio);

-- =========================================================
-- 7) FK motores -> empresas (solo si no existe; motores no tiene usuario_id)
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_motores_empresa'
      AND conrelid = 'public.motores'::regclass
  ) THEN
    ALTER TABLE public.motores
      ADD CONSTRAINT fk_motores_empresa
      FOREIGN KEY (empresa_id) REFERENCES public.empresas(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL; -- ya existe
END
$$;

-- =========================================================
-- 8) Trigger: si motores.tipo_negocio viene NULL en INSERT, heredar de empresas
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_tipo_negocio_motores()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tipo_negocio IS NULL THEN
    SELECT e.tipo_negocio
      INTO NEW.tipo_negocio
    FROM public.empresas e
    WHERE e.id = NEW.empresa_id;

    IF NEW.tipo_negocio IS NULL THEN
      NEW.tipo_negocio := 'prestamo_personal'::public.tipo_negocio_enum;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_tipo_negocio_motores ON public.motores;

CREATE TRIGGER trg_set_tipo_negocio_motores
  BEFORE INSERT ON public.motores
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tipo_negocio_motores();

COMMIT;

-- =========================================================
-- 9) Recargar esquema PostgREST (fuera del BEGIN/COMMIT)
-- =========================================================
NOTIFY pgrst, 'reload schema';
