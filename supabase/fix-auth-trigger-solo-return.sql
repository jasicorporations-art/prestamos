-- ============================================================
-- SOLUCIÓN: "Database error saving new user" + "pg_exception_detail does not exist"
-- ============================================================
-- El 500 en signup suele ser: (1) el trigger inserta en perfiles y falla,
-- (2) la transacción se aborta, (3) el cierre/log interno devuelve
-- "column pg_exception_detail does not exist". Si el trigger NUNCA hace
-- INSERT, el paso (1) no falla y no se llega a (2)-(3).
--
-- Este script deja el trigger sin insertar nada. El perfil se crea después
-- con la API /api/admin/vincular-perfil-empresa (lib/services/usuarios.ts).
-- La API guarda rol en minúsculas (admin, vendedor, cobrador). Si usas un trigger que inserta,
-- aplica fix-auth-trigger-perfiles.sql (ese trigger ya normaliza rol a minúsculas).
--
-- En Supabase: SQL Editor → pegar y ejecutar TODO este bloque (Run).
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;

-- ============================================================
-- Comprobar que quedó bien (ejecutar en otra query si quieres):
--   SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
-- Debe mostrar solo: BEGIN / RETURN NEW; / END;
-- ============================================================
