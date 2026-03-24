-- Añade columnas de foto de perfil a la tabla clientes.
-- Ejecutar una sola vez en Supabase (SQL Editor).
--
-- Además, en Supabase Dashboard > Storage crea un bucket llamado "avatars_clientes"
-- y márcalo como público (Public bucket) para que las URLs de las fotos se puedan ver.

ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS foto_url text;

ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS foto_updated_at timestamptz DEFAULT now();

COMMENT ON COLUMN public.clientes.foto_url IS
'URL pública de la foto de perfil del cliente (Supabase Storage bucket: avatars_clientes).';
