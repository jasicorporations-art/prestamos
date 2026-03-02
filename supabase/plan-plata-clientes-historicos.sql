-- ========================================
-- Plan Plata: límite histórico de 500 clientes
-- ========================================
-- El Plan Plata permite hasta 500 clientes creados en total (histórico).
-- Aunque el usuario borre clientes, no podrá crear más una vez alcanzado el límite.

-- 1. Agregar columna para rastrear total de clientes creados (histórico)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS clientes_creados_total INTEGER DEFAULT 0;

COMMENT ON COLUMN empresas.clientes_creados_total IS 'Total histórico de clientes creados por esta empresa. Plan Plata: límite 500; no se reduce al eliminar clientes.';

-- 2. Migración: empresas existentes inician con su conteo actual de clientes
UPDATE empresas e
SET clientes_creados_total = COALESCE(
  (SELECT COUNT(*) FROM clientes c 
   WHERE (c.empresa_id IS NOT NULL AND c.empresa_id = e.id::text) 
      OR (c.compania_id IS NOT NULL AND c.compania_id = e.id::text)),
  0
)
WHERE clientes_creados_total = 0 OR clientes_creados_total IS NULL;

-- 3. Trigger: incrementar clientes_creados_total al insertar un cliente
CREATE OR REPLACE FUNCTION public.incrementar_clientes_creados_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_ref TEXT;
BEGIN
  v_empresa_ref := COALESCE(trim(NULLIF(NEW.empresa_id, '')), trim(NULLIF(NEW.compania_id, '')));
  IF v_empresa_ref IS NULL OR v_empresa_ref = 'DEFAULT' THEN
    RETURN NEW;
  END IF;

  UPDATE empresas
  SET clientes_creados_total = COALESCE(clientes_creados_total, 0) + 1
  WHERE id::text = v_empresa_ref;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_cliente_created_increment_total ON clientes;
CREATE TRIGGER on_cliente_created_increment_total
  AFTER INSERT ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.incrementar_clientes_creados_total();

-- 4. RPC para que cualquier usuario con acceso a la empresa pueda leer clientes_creados_total
CREATE OR REPLACE FUNCTION public.get_clientes_creados_total(p_empresa_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_tiene_acceso BOOLEAN;
BEGIN
  -- Verificar que el usuario tiene acceso a esta empresa (perfil con empresa_id o es el creador)
  SELECT EXISTS (
    SELECT 1 FROM perfiles p WHERE p.user_id = auth.uid() AND (p.empresa_id = p_empresa_id OR p.compania_id = p_empresa_id)
  ) OR EXISTS (
    SELECT 1 FROM empresas e WHERE e.id::text = p_empresa_id AND e.user_id = auth.uid()
  ) INTO v_tiene_acceso;

  IF NOT v_tiene_acceso THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(clientes_creados_total, 0) INTO v_total
  FROM empresas
  WHERE id::text = p_empresa_id OR nombre = p_empresa_id
  LIMIT 1;

  RETURN COALESCE(v_total, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_clientes_creados_total(TEXT) TO authenticated;
