-- Agregar columnas faltantes a cuotas_detalladas (para importación y amortización)
-- Ejecutar en Supabase SQL Editor

-- Columnas adicionales
ALTER TABLE public.cuotas_detalladas ADD COLUMN IF NOT EXISTS fecha_pago DATE;
ALTER TABLE public.cuotas_detalladas ADD COLUMN IF NOT EXISTS cuota_fija DECIMAL(12,2);
ALTER TABLE public.cuotas_detalladas ADD COLUMN IF NOT EXISTS interes_mes DECIMAL(12,2);
ALTER TABLE public.cuotas_detalladas ADD COLUMN IF NOT EXISTS abono_capital DECIMAL(12,2);
ALTER TABLE public.cuotas_detalladas ADD COLUMN IF NOT EXISTS saldo_pendiente DECIMAL(12,2);
ALTER TABLE public.cuotas_detalladas ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.cuotas_detalladas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.cuotas_detalladas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.cuotas_detalladas ADD COLUMN IF NOT EXISTS monto_cuota DECIMAL(12,2);

-- Backfill (antes de NOT NULL)
UPDATE public.cuotas_detalladas cd SET empresa_id = v.empresa_id
FROM public.ventas v WHERE cd.venta_id = v.id AND cd.empresa_id IS NULL;
UPDATE public.cuotas_detalladas SET monto_cuota = cuota_fija WHERE monto_cuota IS NULL AND cuota_fija IS NOT NULL;
UPDATE public.cuotas_detalladas SET monto_cuota = 0 WHERE monto_cuota IS NULL;

-- Restricciones
ALTER TABLE public.cuotas_detalladas ALTER COLUMN numero_cuota SET NOT NULL;
ALTER TABLE public.cuotas_detalladas ALTER COLUMN monto_cuota SET NOT NULL;

-- Índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_cuotas_detalladas_unique
ON public.cuotas_detalladas (venta_id, numero_cuota);

CREATE INDEX IF NOT EXISTS idx_cuotas_detalladas_fecha
ON public.cuotas_detalladas (fecha_pago);

CREATE INDEX IF NOT EXISTS idx_cuotas_detalladas_empresa
ON public.cuotas_detalladas (empresa_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_cuotas_updated_at ON public.cuotas_detalladas;
CREATE TRIGGER update_cuotas_updated_at
BEFORE UPDATE ON public.cuotas_detalladas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS (empresa_id directo)
ALTER TABLE public.cuotas_detalladas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cuotas_detalladas_policy" ON public.cuotas_detalladas;
DROP POLICY IF EXISTS "cuotas_authenticated" ON public.cuotas_detalladas;
CREATE POLICY cuotas_detalladas_policy ON public.cuotas_detalladas
FOR ALL TO authenticated
USING (
  is_admin()
  OR empresa_id = get_user_empresa_id()
  OR (empresa_id IS NULL AND EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = venta_id AND v.empresa_id = get_user_empresa_id()))
)
WITH CHECK (
  is_admin()
  OR empresa_id = get_user_empresa_id()
  OR (empresa_id IS NULL AND EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = venta_id AND v.empresa_id = get_user_empresa_id()))
);
