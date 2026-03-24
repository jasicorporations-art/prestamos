-- =============================================================================
-- Realtime: notificaciones instantáneas en "Pagos por verificar" (admin)
--
-- La página admin se suscribe a cambios en `pagos_pendientes_verificacion`.
-- Sin este paso, la suscripción no recibe eventos.
--
-- Opción A — Dashboard: Supabase → Database → Publications → supabase_realtime
--   → marcar la tabla `pagos_pendientes_verificacion`.
--
-- Opción B — SQL (ejecutar una vez en SQL Editor):
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.pagos_pendientes_verificacion;

-- Si la tabla ya estaba en la publicación, verás un error inofensivo; ignóralo.
