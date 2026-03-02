-- Tabla de reseñas para prueba social
-- Ejecutar este script en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  app_id TEXT
);

-- Asegurar columna app_id si la tabla ya existía
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'reviews'
    AND column_name = 'app_id'
  ) THEN
    ALTER TABLE reviews ADD COLUMN app_id TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_app_id ON reviews(app_id);

COMMENT ON TABLE reviews IS 'Reseñas públicas para prueba social';

-- RLS para permitir lectura y escritura desde la app
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select" ON reviews;
DROP POLICY IF EXISTS "reviews_insert" ON reviews;

-- Seed inicial
UPDATE reviews SET app_id = 'electro' WHERE app_id IS NULL;

INSERT INTO reviews (user_name, user_avatar, rating, comment, app_id)
VALUES
  ('Carlos R.', NULL, 5, '¡Increíble soporte! Resolvieron mis dudas en minutos.', 'electro'),
  ('Ana M.', NULL, 5, 'La mejor inversión para mi negocio este año.', 'electro')
ON CONFLICT DO NOTHING;
