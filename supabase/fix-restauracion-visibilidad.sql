-- Corregir datos restaurados que no se ven en la app (tienen compania_id pero falta empresa_id o app_id)
-- Ejecutar en Supabase SQL Editor. Ajusta 'electro' si usas otro app_id.

-- Rellenar empresa_id y app_id donde falten (para que la app y RLS muestren los datos)
UPDATE clientes SET empresa_id = compania_id, app_id = COALESCE(app_id, 'electro') WHERE (empresa_id IS NULL OR app_id IS NULL) AND compania_id IS NOT NULL;
UPDATE motores  SET empresa_id = compania_id, app_id = COALESCE(app_id, 'electro') WHERE (empresa_id IS NULL OR app_id IS NULL) AND compania_id IS NOT NULL;
UPDATE ventas   SET empresa_id = compania_id, app_id = COALESCE(app_id, 'electro') WHERE (empresa_id IS NULL OR app_id IS NULL) AND compania_id IS NOT NULL;
UPDATE pagos    SET empresa_id = compania_id, app_id = COALESCE(app_id, 'electro') WHERE (empresa_id IS NULL OR app_id IS NULL) AND compania_id IS NOT NULL;
