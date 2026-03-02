-- Eliminar restricción UNIQUE de matricula si causa problemas
-- Ejecutar este script en Supabase SQL Editor si prefieres hacer matricula opcional

-- Opción 1: Eliminar la restricción UNIQUE pero mantener NOT NULL
ALTER TABLE motores 
DROP CONSTRAINT IF EXISTS motores_matricula_key;

-- Opción 2: Hacer matricula opcional (NULL permitido) y eliminar UNIQUE
-- Descomentar las siguientes líneas si quieres hacer matricula completamente opcional:

-- ALTER TABLE motores 
-- DROP CONSTRAINT IF EXISTS motores_matricula_key;

-- ALTER TABLE motores 
-- ALTER COLUMN matricula DROP NOT NULL;

-- NOTA: El código de la aplicación ahora genera automáticamente matrículas únicas
-- basadas en el número de préstamo (MAT-PREST-XXX), por lo que la restricción UNIQUE
-- debería funcionar correctamente. Solo ejecuta este script si prefieres eliminar
-- la restricción por completo.



