-- Permite vincular un movimiento de caja al pago que lo originó.
-- La API de caja usa esto para no duplicar: movimientos_caja como fuente principal,
-- pagos solo como fallback para pagos viejos sin movimiento.

ALTER TABLE public.movimientos_caja
ADD COLUMN IF NOT EXISTS referencia_pago_id uuid REFERENCES public.pagos(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_movimientos_caja_pago_unico
ON public.movimientos_caja(referencia_pago_id)
WHERE referencia_pago_id IS NOT NULL;

COMMENT ON COLUMN public.movimientos_caja.referencia_pago_id IS 'Pago que generó este movimiento; usado para no duplicar en reportes de caja.';
