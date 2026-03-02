-- Agregar columna email a la tabla clientes
-- Ejecutar este script en Supabase SQL Editor

DO $$
BEGIN
    -- Verificar si la columna ya existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clientes' 
        AND column_name = 'email'
    ) THEN
        -- Agregar la columna email
        ALTER TABLE clientes 
        ADD COLUMN email VARCHAR(255);
        
        -- Crear índice para búsquedas rápidas por email
        CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
        
        RAISE NOTICE 'Columna "email" agregada exitosamente a la tabla "clientes".';
    ELSE
        RAISE NOTICE 'La columna "email" ya existe en la tabla "clientes".';
    END IF;
END $$;

-- Comentario para documentación
COMMENT ON COLUMN clientes.email IS 'Email del cliente para envío de recordatorios y notificaciones';

