-- Agregar columna email_garante a la tabla clientes
-- Ejecutar este script en Supabase SQL Editor

DO $$
BEGIN
    -- Verificar si la columna ya existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'clientes'
        AND column_name = 'email_garante'
    ) THEN
        -- Agregar la columna email_garante
        ALTER TABLE clientes
        ADD COLUMN email_garante VARCHAR(255);

        -- Crear índice para búsquedas rápidas por email del garante
        CREATE INDEX IF NOT EXISTS idx_clientes_email_garante ON clientes(email_garante);

        RAISE NOTICE 'Columna "email_garante" agregada exitosamente a la tabla "clientes".';
    ELSE
        RAISE NOTICE 'La columna "email_garante" ya existe en la tabla "clientes".';
    END IF;
END $$;

-- Comentario para documentación
COMMENT ON COLUMN clientes.email_garante IS 'Email del garante para envío de recordatorios y notificaciones';
