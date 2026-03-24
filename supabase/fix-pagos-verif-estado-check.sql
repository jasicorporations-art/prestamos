-- Elimina el constraint complejo que bloquea la aprobación de pagos.
-- El constraint simple de valores válidos (estado_check) queda intacto.
-- Ejecutar SOLO este archivo. No ejecutar ningún otro SQL después.

ALTER TABLE public.pagos_pendientes_verificacion
  DROP CONSTRAINT IF EXISTS pagos_pendientes_verificacion_estado_revision_check;
