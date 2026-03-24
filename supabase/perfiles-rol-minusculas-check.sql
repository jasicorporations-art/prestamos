-- Rol en minúsculas en perfiles (canónico)
-- La base de datos solo acepta roles en minúsculas: admin, vendedor, cobrador, super_admin.
-- Este CHECK obliga a que el valor (o su lower()) esté en esa lista.
-- La app y las APIs escriben siempre en minúsculas en perfiles.rol.

ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;
ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS rol_check;

ALTER TABLE public.perfiles
  ADD CONSTRAINT perfiles_rol_check
  CHECK (lower(rol) IN ('admin', 'vendedor', 'cobrador', 'super_admin'));
