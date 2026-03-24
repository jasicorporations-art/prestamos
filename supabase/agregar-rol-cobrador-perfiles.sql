-- Permite los roles cobrador y super_admin. Rol siempre en minúsculas (ver perfiles-rol-minusculas-check.sql).

ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;
ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS rol_check;

ALTER TABLE public.perfiles
  ADD CONSTRAINT perfiles_rol_check
  CHECK (lower(rol) IN ('admin', 'vendedor', 'cobrador', 'super_admin'));
