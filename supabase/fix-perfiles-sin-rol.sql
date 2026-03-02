-- Asignar Admin a cuentas iniciales (primer usuario de cada empresa)
-- IMPORTANTE: Ejecutar en Supabase → SQL Editor (no desde la app)

-- 1) Sin rol (NULL o vacío) → Admin
UPDATE perfiles
SET rol = 'Admin'
WHERE rol IS NULL OR rol = '' OR trim(rol) = '';

-- 2) Primer usuario de cada empresa → Admin (cuentas iniciales que el trigger puso como Vendedor)
WITH primer_por_empresa AS (
  SELECT DISTINCT ON (COALESCE(empresa_id, compania_id, 'GLOBAL')) id
  FROM perfiles
  ORDER BY COALESCE(empresa_id, compania_id, 'GLOBAL'), created_at ASC NULLS LAST
)
UPDATE perfiles
SET rol = 'Admin'
WHERE id IN (SELECT id FROM primer_por_empresa)
  AND (rol IS NULL OR rol = '' OR rol = 'Vendedor');

-- 3) Verificar resultado
SELECT id, user_id, nombre_completo, rol, empresa_id, created_at
FROM perfiles
ORDER BY empresa_id, created_at;
