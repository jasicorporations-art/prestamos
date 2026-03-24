-- Índice para listados por caja y día (página Caja / API datos-del-dia)
-- Idempotente: ejecutar en Supabase SQL Editor cuando quieras optimizar consultas.

CREATE INDEX IF NOT EXISTS idx_movimientos_caja_caja_fecha
  ON public.movimientos_caja (caja_id, fecha_hora DESC);
