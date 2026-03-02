-- Agregar método de cálculo de interés a ventas
-- sobre_saldo = Interés compuesto sobre saldo restante
-- fijo = Interés lineal/fijo

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS metodo_interes VARCHAR(20) DEFAULT 'sobre_saldo';
COMMENT ON COLUMN ventas.metodo_interes IS 'sobre_saldo: interés compuesto sobre balance; fijo: interés lineal';
