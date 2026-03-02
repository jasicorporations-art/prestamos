-- ================================================================
-- PASO 1: Función para actualizar updated_at
-- ================================================================
-- Necesaria para los triggers de las tablas
-- ================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
