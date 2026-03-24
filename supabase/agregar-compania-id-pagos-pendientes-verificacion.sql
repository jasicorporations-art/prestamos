-- Opcional: columna espejo de tenant para `pagos_pendientes_verificacion`.
-- Ejecutar en Supabase antes de desplegar el RPC actualizado que filtra por `compania_id`.

ALTER TABLE public.pagos_pendientes_verificacion
  ADD COLUMN IF NOT EXISTS compania_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_ppv_compania_id
  ON public.pagos_pendientes_verificacion (compania_id);

COMMENT ON COLUMN public.pagos_pendientes_verificacion.compania_id IS
  'Opcional: misma UUID que id_empresa / perfiles.empresa_id (multi-tenant).';
