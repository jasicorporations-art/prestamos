-- ⚠️ EJECUTA ESTE SCRIPT EN SUPABASE SQL EDITOR
-- Este script elimina los triggers existentes y los recrea correctamente

-- Paso 1: Eliminar triggers existentes (esto soluciona el error)
DROP TRIGGER IF EXISTS update_motores_updated_at ON motores;
DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
DROP TRIGGER IF EXISTS update_ventas_updated_at ON ventas;

-- Paso 2: Asegurar que la función existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Paso 3: Crear los triggers (ahora no dará error porque los eliminamos antes)
CREATE TRIGGER update_motores_updated_at BEFORE UPDATE ON motores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ventas_updated_at BEFORE UPDATE ON ventas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

