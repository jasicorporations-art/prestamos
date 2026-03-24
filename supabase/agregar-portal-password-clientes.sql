-- Portal cliente: hash scrypt + auditoría + CHECK. Ejecutar en Supabase → SQL Editor.

BEGIN;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS portal_password text;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS portal_password_updated_at timestamptz;

-- Validar que sea hash tipo scrypt
ALTER TABLE public.clientes
  DROP CONSTRAINT IF EXISTS clientes_portal_password_format_check;

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_portal_password_format_check
  CHECK (
    portal_password IS NULL
    OR portal_password LIKE 'scrypt$%'
  );

COMMENT ON COLUMN public.clientes.portal_password IS
  'Hash scrypt de la contraseña del portal. Nunca guardar texto plano.';
COMMENT ON COLUMN public.clientes.portal_password_updated_at IS
  'Fecha de última actualización del password del portal.';

COMMIT;
