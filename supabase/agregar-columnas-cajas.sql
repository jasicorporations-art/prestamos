-- Añade todas las columnas necesarias para abrir/cerrar caja en Admin > Cajas.
-- Si tu tabla cajas tiene solo id, sucursal_id, estado, created_at, ejecuta este script.
-- Ejecutar en Supabase SQL Editor.

-- Cierre de caja
ALTER TABLE cajas ADD COLUMN IF NOT EXISTS monto_cierre_esperado DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE cajas ADD COLUMN IF NOT EXISTS monto_cierre_real DECIMAL(12, 2);
ALTER TABLE cajas ADD COLUMN IF NOT EXISTS diferencia DECIMAL(12, 2);

-- Otros campos usados por la app
ALTER TABLE cajas ADD COLUMN IF NOT EXISTS fecha DATE DEFAULT CURRENT_DATE;
ALTER TABLE cajas ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE cajas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- usuario_id (quien abrió la caja) - solo si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cajas' AND column_name = 'usuario_id') THEN
    ALTER TABLE cajas ADD COLUMN usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Asegurar que monto_apertura existe (algunos esquemas mínimos ya lo tienen)
ALTER TABLE cajas ADD COLUMN IF NOT EXISTS monto_apertura DECIMAL(12, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN cajas.monto_cierre_real IS 'Monto real contado al cerrar la caja';
COMMENT ON COLUMN cajas.monto_cierre_esperado IS 'Monto esperado (apertura + ingresos - salidas)';
COMMENT ON COLUMN cajas.diferencia IS 'Diferencia al cerrar (positivo = sobrante, negativo = faltante)';
