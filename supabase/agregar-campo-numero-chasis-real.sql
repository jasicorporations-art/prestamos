-- Script para agregar campo numero_chasis_real a la tabla motores
-- Este campo almacena el número de chasis real del vehículo (diferente del número de préstamo)
-- Ejecutar este script en Supabase SQL Editor

-- Agregar columna numero_chasis_real a la tabla motores (si no existe)
ALTER TABLE motores
ADD COLUMN IF NOT EXISTS numero_chasis_real VARCHAR(255);

-- Comentario para documentar el campo
COMMENT ON COLUMN motores.numero_chasis_real IS 'Número de chasis real del vehículo (diferente del número de préstamo que se almacena en numero_chasis)';

