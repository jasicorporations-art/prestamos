-- ================================================================
-- PASO 0: BORRAR TODO
-- ================================================================
-- Ejecutar en Supabase SQL Editor
-- ADVERTENCIA: Esto elimina TODAS las tablas, triggers y funciones.
-- Los usuarios en auth.users NO se eliminan.
-- ================================================================

BEGIN;

-- 1. Eliminar triggers que dependen de tablas
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_empresa_created_crear_sucursal_principal ON empresas;
DROP TRIGGER IF EXISTS trigger_actualizar_monto_cierre ON pagos;
DROP TRIGGER IF EXISTS trigger_actualizar_monto_por_movimiento ON movimientos_caja;
DROP TRIGGER IF EXISTS update_motores_updated_at ON motores;
DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
DROP TRIGGER IF EXISTS update_ventas_updated_at ON ventas;
DROP TRIGGER IF EXISTS update_sucursales_updated_at ON sucursales;
DROP TRIGGER IF EXISTS update_perfiles_updated_at ON perfiles;
DROP TRIGGER IF EXISTS update_cajas_updated_at ON cajas;
DROP TRIGGER IF EXISTS trigger_validar_terminos_insert ON perfiles;

-- 2. Eliminar tablas en orden (hijas primero, por FK)
DROP TABLE IF EXISTS movimientos_caja CASCADE;
DROP TABLE IF EXISTS cajas CASCADE;
DROP TABLE IF EXISTS cuotas_detalladas CASCADE;
DROP TABLE IF EXISTS solicitudes_cambio CASCADE;
DROP TABLE IF EXISTS recordatorios_pago CASCADE;
DROP TABLE IF EXISTS pagos CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS rutas CASCADE;
DROP TABLE IF EXISTS actividad_logs CASCADE;
DROP TABLE IF EXISTS perfiles CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS motores CASCADE;
DROP TABLE IF EXISTS sucursales CASCADE;
DROP TABLE IF EXISTS empresas CASCADE;
-- CASCADE elimina dependencias automáticamente

-- Tablas auxiliares
DROP TABLE IF EXISTS legal_aceptaciones CASCADE;
DROP TABLE IF EXISTS legal_document_versions CASCADE;
DROP TABLE IF EXISTS codigos_registro CASCADE;
DROP TABLE IF EXISTS tenant_backups CASCADE;
DROP TABLE IF EXISTS configuracion_sistema CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS whatsapp_consumo_mensual CASCADE;
DROP TABLE IF EXISTS whatsapp_recargas CASCADE;
DROP TABLE IF EXISTS whatsapp_cola_mensajes CASCADE;
DROP TABLE IF EXISTS pagos_plataforma CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;

-- 3. Eliminar funciones (las que creamos)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.crear_sucursal_principal_on_empresa_insert() CASCADE;
DROP FUNCTION IF EXISTS public.crear_sucursal_por_defecto() CASCADE;
DROP FUNCTION IF EXISTS public.actualizar_saldo_venta_por_pago() CASCADE;
DROP FUNCTION IF EXISTS public.marcar_motor_como_vendido() CASCADE;
DROP FUNCTION IF EXISTS public.actualizar_monto_cierre_esperado() CASCADE;
DROP FUNCTION IF EXISTS public.actualizar_monto_cierre_por_movimiento() CASCADE;
DROP FUNCTION IF EXISTS public.calcular_monto_cierre_esperado(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.validar_aceptacion_legal() CASCADE;
DROP FUNCTION IF EXISTS public.registrar_actividad(UUID, VARCHAR, UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.verificar_empresa_disponible(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_empresa_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_sucursal_id() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

COMMIT;

-- Verificación: ejecutar aparte para confirmar que no quedan tablas
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
