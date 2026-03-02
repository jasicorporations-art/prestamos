-- Añade la columna 'diferencia' a la tabla cajas si no existe.
-- Necesaria para abrir/cerrar caja en Admin > Cajas (sobrante/faltante).
-- Ejecutar en Supabase SQL Editor.

ALTER TABLE cajas ADD COLUMN IF NOT EXISTS diferencia DECIMAL(12, 2);

COMMENT ON COLUMN cajas.diferencia IS 'Diferencia entre monto esperado y real al cerrar (positivo = sobrante, negativo = faltante)';
