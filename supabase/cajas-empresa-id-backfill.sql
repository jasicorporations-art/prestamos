-- Rellena empresa_id en cajas que lo tengan NULL, usando la sucursal.
-- Así los vendedores pueden ver la caja abierta por el admin (RLS exige empresa_id = get_user_empresa_id()).
-- Ejecutar en Supabase SQL Editor.

UPDATE cajas c
SET empresa_id = s.empresa_id
FROM sucursales s
WHERE c.sucursal_id = s.id
  AND c.empresa_id IS NULL;
