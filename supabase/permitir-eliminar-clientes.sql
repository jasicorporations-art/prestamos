-- Script para permitir la eliminación de clientes incluso si tienen préstamos asociados
-- Este script cambia la restricción de RESTRICT a CASCADE para que los préstamos se eliminen automáticamente
-- O alternativamente, elimina la restricción y permite eliminación manual

-- Opción 1: Cambiar a CASCADE (elimina automáticamente las ventas cuando se elimina el cliente)
-- Nota: Esto puede ser peligroso, así que usamos la opción 2 en su lugar

-- Opción 2: Eliminar la restricción y manejar la eliminación en el código de la aplicación
-- Primero, eliminar la restricción existente
ALTER TABLE ventas 
DROP CONSTRAINT IF EXISTS ventas_cliente_id_fkey;

-- Luego, recrear la restricción con SET NULL (menos destructivo) o sin restricción
-- Pero como queremos eliminar todo, mejor no tener restricción y manejarlo en código
-- O usar CASCADE para que se eliminen automáticamente las ventas

-- Opción recomendada: CASCADE (elimina ventas automáticamente cuando se elimina cliente)
-- Esto es más seguro porque garantiza integridad referencial
ALTER TABLE ventas 
ADD CONSTRAINT ventas_cliente_id_fkey 
FOREIGN KEY (cliente_id) 
REFERENCES clientes(id) 
ON DELETE CASCADE;

-- Comentario: Con CASCADE, cuando se elimina un cliente, todas sus ventas se eliminan automáticamente
-- Y como las ventas tienen CASCADE en pagos, los pagos también se eliminan automáticamente
-- Esto garantiza que no queden datos huérfanos

