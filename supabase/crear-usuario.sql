-- Script para crear usuarios en Supabase Auth
-- IMPORTANTE: Este script debe ejecutarse en Supabase SQL Editor
-- O usar la interfaz de Authentication > Users en Supabase Dashboard

-- Opción 1: Crear usuario desde la interfaz de Supabase (RECOMENDADO)
-- 1. Ve a Authentication > Users en tu proyecto de Supabase
-- 2. Haz clic en "Add user" > "Create new user"
-- 3. Ingresa:
--    - Email: admin@nazaretreynoso.com (o el que prefieras)
--    - Password: (elige una contraseña segura)
--    - Auto Confirm User: ✅ (marcar esta opción)

-- Opción 2: Usar la función de Supabase para crear usuario (requiere permisos)
-- NOTA: Esta función solo funciona si tienes permisos de administrador

-- Crear función para registrar usuarios (solo si tienes permisos)
CREATE OR REPLACE FUNCTION crear_usuario_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Esta función requiere permisos especiales
  -- Es mejor usar la interfaz de Supabase Dashboard
  RAISE NOTICE 'Usa la interfaz de Supabase Dashboard para crear usuarios';
END;
$$;

-- INSTRUCCIONES PARA CREAR USUARIOS:
-- ====================================
-- 
-- Método 1: Desde Supabase Dashboard (MÁS FÁCIL)
-- ------------------------------------------------
-- 1. Ve a: https://app.supabase.com/project/[TU_PROYECTO]/auth/users
-- 2. Haz clic en "Add user" > "Create new user"
-- 3. Completa:
--    - Email: admin@nazaretreynoso.com
--    - Password: [tu contraseña segura]
--    - Auto Confirm User: ✅ (marcar)
-- 4. Haz clic en "Create user"
--
-- Método 2: Desde la aplicación (requiere código adicional)
-- ---------------------------------------------------------
-- Puedes crear una página de registro solo para el primer usuario
-- o usar la API de Supabase directamente
--
-- RECOMENDACIÓN: Usa el Método 1 (Dashboard) - es más simple y seguro

