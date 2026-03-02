-- Agregar sucursal_id a clientes (para importación y filtros por sucursal)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL;
