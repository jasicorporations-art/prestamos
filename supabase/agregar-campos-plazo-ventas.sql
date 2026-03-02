-- Agregar columnas para tipo de plazo y día de pago semanal a la tabla ventas
-- Ejecutar este script en Supabase SQL Editor si las columnas no existen

-- Agregar columna tipo_plazo (semanal, quincenal, mensual)
ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS tipo_plazo TEXT CHECK (tipo_plazo IN ('semanal', 'quincenal', 'mensual'));

-- Agregar columna dia_pago_semanal (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS dia_pago_semanal INTEGER CHECK (dia_pago_semanal >= 0 AND dia_pago_semanal <= 6);

-- Agregar columna fecha_inicio_quincenal para pagos quincenales (cada 15 días)
ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS fecha_inicio_quincenal DATE;

-- Agregar columna dia_pago_mensual para pagos mensuales (día del mes: 1-31)
ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS dia_pago_mensual INTEGER CHECK (dia_pago_mensual >= 1 AND dia_pago_mensual <= 31);

-- Comentarios para documentación
COMMENT ON COLUMN ventas.tipo_plazo IS 'Tipo de plazo de pago: semanal, quincenal o mensual';
COMMENT ON COLUMN ventas.dia_pago_semanal IS 'Día de la semana para pagos semanales: 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado';
COMMENT ON COLUMN ventas.fecha_inicio_quincenal IS 'Fecha de inicio para pagos quincenales (cada 15 días)';
COMMENT ON COLUMN ventas.dia_pago_mensual IS 'Día del mes para pagos mensuales (1-31). Ejemplo: 5 = pagará el día 5 de cada mes';

