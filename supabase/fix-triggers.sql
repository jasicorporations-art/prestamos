-- Script para solucionar el error de triggers existentes
-- Ejecuta este script en el SQL Editor de Supabase

-- Eliminar triggers existentes si existen
DROP TRIGGER IF EXISTS update_motores_updated_at ON motores;
DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
DROP TRIGGER IF EXISTS update_ventas_updated_at ON ventas;

-- Crear la función si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear los triggers
CREATE TRIGGER update_motores_updated_at BEFORE UPDATE ON motores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ventas_updated_at BEFORE UPDATE ON ventas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();




