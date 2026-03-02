-- ================================================================
-- PASO 11: Asignar super_admin
-- ================================================================
-- Cambia los emails por los tuyos antes de ejecutar
-- super_admin tiene empresa_id = NULL (acceso global)
-- ================================================================

-- 1. Crear perfiles si no existen
INSERT INTO public.perfiles (user_id, email, rol, activo, nombre_completo)
SELECT id, email, 'super_admin', true, 'Super Administrador'
FROM auth.users
WHERE LOWER(email) IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com')
  AND id NOT IN (SELECT user_id FROM public.perfiles)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Actualizar perfiles existentes
UPDATE public.perfiles
SET rol = 'super_admin', activo = true, empresa_id = NULL, sucursal_id = NULL
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE LOWER(email) IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com')
);

-- 3. Verificación (ejecutar aparte si quieres comprobar)
-- SELECT u.email, p.rol, p.activo, p.empresa_id
-- FROM auth.users u
-- JOIN public.perfiles p ON p.user_id = u.id
-- WHERE LOWER(u.email) IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com');
