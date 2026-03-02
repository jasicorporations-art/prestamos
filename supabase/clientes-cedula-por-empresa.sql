-- =====================================================
-- Aislar cédula de clientes POR EMPRESA
-- Varias empresas pueden tener clientes con la misma cédula.
-- Ejecutar en Supabase SQL Editor si ya tienes RLS y solo
-- quieres asegurar unicidad (empresa_id, cedula).
-- =====================================================

BEGIN;

-- Quitar restricciones que exijan cédula única en toda la tabla
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_cedula_key;
DROP INDEX IF EXISTS idx_cliente_empresa_cedula;
DROP INDEX IF EXISTS idx_clientes_empresa_cedula_unique;
DROP INDEX IF EXISTS idx_clientes_compania_cedula_unique;

-- Unicidad solo por (empresa_id, cedula): misma cédula OK en otra empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_cliente_empresa_cedula
  ON public.clientes (empresa_id, cedula);

COMMIT;
