BEGIN;

-- ============================================================
-- MOTORES: soporte moderno para tipo de negocio y especificaciones
-- Compatible con:
--   - prestamo_personal
--   - dealer
--   - electro
--
-- Esta versión asume que:
--   - public.motores ya existe
--   - tipo_negocio puede ya existir como ENUM
--   - queremos agregar / asegurar especificaciones JSONB
-- ============================================================

-- 1) Agregar columna especificaciones si no existe
ALTER TABLE public.motores
  ADD COLUMN IF NOT EXISTS especificaciones JSONB;

-- 2) Si tipo_negocio no existe, intentar crearlo como TEXT temporalmente
--    (solo aplica si aún no existe; si ya existe como ENUM, no afecta)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'motores'
      AND column_name = 'tipo_negocio'
  ) THEN
    ALTER TABLE public.motores
      ADD COLUMN tipo_negocio TEXT;
  END IF;
END $$;

-- 3) Backfill seguro para registros existentes
--    Compatible tanto si tipo_negocio es TEXT como si es ENUM
DO $$
DECLARE
  v_udt_name text;
BEGIN
  SELECT c.udt_name
  INTO v_udt_name
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'motores'
    AND c.column_name = 'tipo_negocio';

  -- Si es ENUM, solo revisar NULL
  IF v_udt_name IS NOT NULL AND v_udt_name <> 'text' AND v_udt_name <> 'varchar' AND v_udt_name <> 'bpchar' THEN
    EXECUTE $sql$
      UPDATE public.motores
      SET tipo_negocio = 'prestamo_personal'
      WHERE tipo_negocio IS NULL
    $sql$;
  ELSE
    -- Si es texto, revisar NULL o vacío
    EXECUTE $sql$
      UPDATE public.motores
      SET tipo_negocio = 'prestamo_personal'
      WHERE tipo_negocio IS NULL
         OR btrim(tipo_negocio) = ''
    $sql$;
  END IF;
END $$;

-- 4) Asegurar DEFAULT en tipo_negocio
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.motores
      ALTER COLUMN tipo_negocio SET DEFAULT 'prestamo_personal';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'No se pudo aplicar DEFAULT a tipo_negocio: %', SQLERRM;
  END;
END $$;

-- 5) Asegurar NOT NULL en tipo_negocio
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.motores
      ALTER COLUMN tipo_negocio SET NOT NULL;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'No se pudo aplicar NOT NULL a tipo_negocio: %', SQLERRM;
  END;
END $$;

-- 6) Si tipo_negocio es TEXT, agregar CHECK constraint
--    Si es ENUM, no hace falta porque el enum ya valida valores
DO $$
DECLARE
  v_udt_name text;
BEGIN
  SELECT c.udt_name
  INTO v_udt_name
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'motores'
    AND c.column_name = 'tipo_negocio';

  IF v_udt_name IN ('text', 'varchar', 'bpchar') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'motores_tipo_negocio_check'
    ) THEN
      ALTER TABLE public.motores
        ADD CONSTRAINT motores_tipo_negocio_check
        CHECK (tipo_negocio IN ('prestamo_personal', 'dealer', 'electro'));
    END IF;
  END IF;
END $$;

-- 7) Asegurar que especificaciones, si existe, sea un objeto JSON
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'motores_especificaciones_object_check'
  ) THEN
    ALTER TABLE public.motores
      ADD CONSTRAINT motores_especificaciones_object_check
      CHECK (
        especificaciones IS NULL
        OR jsonb_typeof(especificaciones) = 'object'
      );
  END IF;
END $$;

-- 8) Comentarios descriptivos
COMMENT ON COLUMN public.motores.tipo_negocio IS
'Tipo de negocio del producto. Valores esperados: prestamo_personal, dealer, electro. Define cómo se presenta el producto en la interfaz.';

COMMENT ON COLUMN public.motores.especificaciones IS
'Datos variables del producto en JSONB. Ejemplos: dealer -> marca, modelo, anio, color, chasis. Electro -> categoria, tipo_articulo, marca, modelo, capacidad, eficiencia_energetica.';

-- 9) Índice por tipo de negocio
CREATE INDEX IF NOT EXISTS idx_motores_tipo_negocio
  ON public.motores (tipo_negocio);

-- 10) Índice GIN para búsquedas dentro de especificaciones JSONB
CREATE INDEX IF NOT EXISTS idx_motores_especificaciones_gin
  ON public.motores
  USING GIN (especificaciones);

COMMIT;
