-- ========================================
-- AGREGAR CAMPOS NUEVOS A LA TABLA CLIENTES
-- ========================================
-- Copia y pega TODO este contenido en Supabase SQL Editor
-- Luego haz clic en "Run"

-- Agregar columna de celular
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS celular VARCHAR(20);

-- Agregar columna de fecha de compra
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS fecha_compra DATE;

-- Agregar columna de fecha de finalización de préstamo
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS fecha_finalizacion_prestamo DATE;

-- Agregar columna de día de pagos (1-31)
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS dia_pagos INTEGER CHECK (dia_pagos >= 1 AND dia_pagos <= 31);

-- Verificar que se agregaron correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clientes' 
AND column_name IN ('celular', 'fecha_compra', 'fecha_finalizacion_prestamo', 'dia_pagos');

