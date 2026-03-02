-- ========================================
-- CREAR PERFIL DE ADMIN MANUALMENTE
-- ========================================
-- Este script crea un perfil de Admin para un usuario existente
-- 
-- INSTRUCCIONES:
-- 1. Reemplaza 'TU_USER_ID_AQUI' con el user_id de Supabase Auth (tabla auth.users)
-- 2. Reemplaza 'TU_EMPRESA_ID_AQUI' con el nombre de tu empresa (ej: 'JASICORPORATION')
-- 3. Reemplaza 'Tu Nombre Completo' con tu nombre real
-- 4. Ejecuta este script en Supabase SQL Editor

-- Obtener tu user_id:
-- 1. Ve a Supabase Dashboard → Authentication → Users
-- 2. Encuentra tu usuario por email
-- 3. Copia el UUID que aparece en la columna "UUID" o "ID"

-- Ejemplo de uso:
-- INSERT INTO perfiles (user_id, nombre_completo, rol, empresa_id, activo)
-- VALUES (
--   'ae3397b1-3735-498b-969a-9e6b6f417280', -- Reemplaza con TU user_id
--   'Tu Nombre Completo',                    -- Reemplaza con tu nombre
--   'Admin',                                  -- Rol: Admin o Vendedor
--   'JASICORPORATION',                       -- Reemplaza con tu empresa_id
--   true                                      -- activo: true o false
-- );

-- Si ya existe un perfil para este usuario, actualizarlo en lugar de crear uno nuevo:
-- UPDATE perfiles
-- SET 
--   nombre_completo = 'Tu Nombre Completo',
--   rol = 'Admin',
--   empresa_id = 'JASICORPORATION',
--   activo = true,
--   updated_at = NOW()
-- WHERE user_id = 'TU_USER_ID_AQUI';

-- Para verificar si ya tienes un perfil, ejecuta esto primero:
-- SELECT * FROM perfiles WHERE user_id = 'TU_USER_ID_AQUI';

-- ========================================
-- SCRIPT AUTOMÁTICO (Reemplaza los valores)
-- ========================================

-- Primero verificar si existe
DO $$
DECLARE
  v_user_id UUID := 'ae3397b1-3735-498b-969a-9e6b6f417280'; -- ⚠️ REEMPLAZA CON TU USER_ID
  v_empresa_id VARCHAR(255) := 'JASICORPORATION'; -- ⚠️ REEMPLAZA CON TU EMPRESA_ID
  v_nombre_completo VARCHAR(255) := 'Administrador Principal'; -- ⚠️ REEMPLAZA CON TU NOMBRE
  v_perfil_existe BOOLEAN;
BEGIN
  -- Verificar si el perfil existe
  SELECT EXISTS(SELECT 1 FROM perfiles WHERE user_id = v_user_id) INTO v_perfil_existe;
  
  IF v_perfil_existe THEN
    -- Si existe, actualizarlo
    UPDATE perfiles
    SET 
      nombre_completo = v_nombre_completo,
      rol = 'Admin',
      empresa_id = v_empresa_id,
      activo = true,
      updated_at = NOW()
    WHERE user_id = v_user_id;
    
    RAISE NOTICE '✅ Perfil actualizado correctamente';
  ELSE
    -- Si no existe, crearlo
    INSERT INTO perfiles (user_id, nombre_completo, rol, empresa_id, activo)
    VALUES (v_user_id, v_nombre_completo, 'Admin', v_empresa_id, true);
    
    RAISE NOTICE '✅ Perfil creado correctamente';
  END IF;
END $$;

