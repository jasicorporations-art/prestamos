-- DIAGNÓSTICO: Si la app se queda cargando
-- Ejecutar en Supabase SQL Editor para verificar la base de datos

-- 1. Verificar que get_user_empresa_id() existe
SELECT proname FROM pg_proc WHERE proname = 'get_user_empresa_id';

-- 2. Verificar que is_admin() existe
SELECT proname FROM pg_proc WHERE proname = 'is_admin';

-- 3. Verificar perfiles tienen empresa_id (reemplaza TU_USER_ID con el UUID del usuario)
-- Obtén tu user_id desde: Supabase > Authentication > Users
-- SELECT id, email, empresa_id, rol, activo FROM perfiles WHERE user_id = 'TU_USER_ID';

-- 4. Verificar cuotas_detalladas tiene empresa_id
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'cuotas_detalladas' AND column_name = 'empresa_id';

-- 5. Si cuotas_detalladas tiene filas con empresa_id NULL, ejecutar backfill:
-- UPDATE cuotas_detalladas cd SET empresa_id = v.empresa_id
-- FROM ventas v WHERE cd.venta_id = v.id AND cd.empresa_id IS NULL;
