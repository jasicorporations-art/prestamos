-- ============================================================
-- Permitir tipo 'automatico' en tenant_backups (para Edge Function auto-backup)
-- ============================================================
-- Ejecutar en Supabase SQL Editor si la tabla se creó con crear-tabla-tenant-backups.sql
-- (que solo permite 'manual' y 'pre_restauracion').

-- 1) Quitar el CHECK anterior
ALTER TABLE public.tenant_backups
  DROP CONSTRAINT IF EXISTS tenant_backups_tipo_check;

-- 2) Añadir CHECK que incluye 'automatico'
ALTER TABLE public.tenant_backups
  ADD CONSTRAINT tenant_backups_tipo_check
  CHECK (tipo IN ('manual', 'pre_restauracion', 'automatico'));

-- 3) Comentario actualizado
COMMENT ON TABLE public.tenant_backups IS
'Backups por tenant. tipo: manual | pre_restauracion | automatico.';

NOTIFY pgrst, 'reload schema';
