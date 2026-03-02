-- ================================================================
-- PASO 9: Tablas auxiliares (UUID)
-- ================================================================
-- Todas las empresa_id son UUID REFERENCES empresas(id)
-- ================================================================

-- 1. RUTAS
CREATE TABLE IF NOT EXISTS rutas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  activa BOOLEAN DEFAULT true,
  vendedor_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  app_id TEXT DEFAULT 'electro',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS ruta_id UUID REFERENCES rutas(id) ON DELETE SET NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
DO $$ BEGIN ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_status_check; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ventas ADD CONSTRAINT ventas_status_check CHECK (status IN ('pending', 'active', 'rejected', 'completed')); EXCEPTION WHEN others THEN NULL; END $$;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS ruta_id UUID REFERENCES rutas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rutas_sucursal ON rutas(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_rutas_empresa ON rutas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ventas_ruta ON ventas(ruta_id);

-- 2. CAJAS
CREATE TABLE IF NOT EXISTS cajas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  monto_apertura DECIMAL(12, 2) NOT NULL DEFAULT 0,
  monto_cierre_esperado DECIMAL(12, 2) NOT NULL DEFAULT 0,
  monto_cierre_real DECIMAL(12, 2),
  diferencia DECIMAL(12, 2),
  estado VARCHAR(20) NOT NULL DEFAULT 'Abierta' CHECK (estado IN ('Abierta', 'Cerrada')),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MOVIMIENTOS DE CAJA
CREATE TABLE IF NOT EXISTS movimientos_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_id UUID NOT NULL REFERENCES cajas(id) ON DELETE CASCADE,
  sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Entrada', 'Salida')),
  monto DECIMAL(12, 2) NOT NULL,
  concepto VARCHAR(255) NOT NULL,
  fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CUOTAS DETALLADAS
CREATE TABLE IF NOT EXISTS cuotas_detalladas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  numero_cuota INT NOT NULL,
  fecha_pago DATE NOT NULL,
  monto_cuota DECIMAL(12, 2) NOT NULL,
  estado VARCHAR(20) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Pagada', 'Atrasada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ACTIVIDAD LOGS
CREATE TABLE IF NOT EXISTS actividad_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nombre VARCHAR(255),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  accion VARCHAR(255) NOT NULL,
  detalle TEXT,
  entidad_tipo VARCHAR(50),
  entidad_id UUID,
  fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rutas_empresa ON rutas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cajas_sucursal ON cajas(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_cajas_empresa ON cajas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_caja ON movimientos_caja(caja_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_venta ON cuotas_detalladas(venta_id);
CREATE INDEX IF NOT EXISTS idx_actividad_empresa ON actividad_logs(empresa_id);

-- 6. CONFIGURACIÓN SISTEMA (backups, ultimo_backup)
CREATE TABLE IF NOT EXISTS configuracion_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave VARCHAR(255) NOT NULL UNIQUE,
  valor TEXT,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TENANT_BACKUPS (guardar backups en la nube - tenant_id = empresa_id::text)
CREATE TABLE IF NOT EXISTS tenant_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  nombre TEXT,
  datos JSONB,
  backup_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  tipo TEXT DEFAULT 'manual' CHECK (tipo IN ('manual', 'pre_restauracion', 'automatico')),
  app_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_backups_tenant ON tenant_backups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_backups_created ON tenant_backups(created_at DESC);

-- RLS tenant_backups: tenant_id = empresa_id del perfil (como texto)
ALTER TABLE tenant_backups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_backups_select_own ON tenant_backups;
DROP POLICY IF EXISTS tenant_backups_insert_own ON tenant_backups;
CREATE POLICY tenant_backups_select_own ON tenant_backups FOR SELECT TO authenticated
  USING (tenant_id = (SELECT empresa_id::text FROM perfiles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY tenant_backups_insert_own ON tenant_backups FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT empresa_id::text FROM perfiles WHERE user_id = auth.uid() LIMIT 1));

GRANT SELECT, INSERT ON tenant_backups TO authenticated;

-- Insertar clave ultimo_backup para el servicio de backups
INSERT INTO configuracion_sistema (clave, valor, descripcion)
VALUES ('ultimo_backup', NOW()::TEXT, 'Fecha y hora del último backup automático')
ON CONFLICT (clave) DO NOTHING;

CREATE OR REPLACE FUNCTION actualizar_ultimo_backup()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO configuracion_sistema (clave, valor, descripcion)
  VALUES ('ultimo_backup', NOW()::TEXT, 'Fecha y hora del último backup automático')
  ON CONFLICT (clave) DO UPDATE SET valor = NOW()::TEXT, updated_at = NOW();
END;
$$;

DROP TRIGGER IF EXISTS tr_upd_rutas ON rutas;
DROP TRIGGER IF EXISTS update_cajas_updated_at ON cajas;
CREATE TRIGGER tr_upd_rutas BEFORE UPDATE ON rutas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_upd_cajas BEFORE UPDATE ON cajas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE cajas DISABLE ROW LEVEL SECURITY;

-- ================================================================
-- Triggers de negocio
-- ================================================================

-- Actualizar saldo de venta cuando se inserta/actualiza/elimina un pago
CREATE OR REPLACE FUNCTION public.actualizar_saldo_venta_por_pago()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.ventas SET saldo_pendiente = saldo_pendiente - NEW.monto, updated_at = NOW() WHERE id = NEW.venta_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.ventas SET saldo_pendiente = saldo_pendiente + OLD.monto, updated_at = NOW() WHERE id = OLD.venta_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE public.ventas SET saldo_pendiente = saldo_pendiente + (OLD.monto - NEW.monto), updated_at = NOW() WHERE id = NEW.venta_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_actualizar_saldo_pago ON public.pagos;
CREATE TRIGGER tr_actualizar_saldo_pago
  AFTER INSERT OR UPDATE OR DELETE ON public.pagos
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_saldo_venta_por_pago();

-- Marcar motor como Vendido cuando se crea una venta
CREATE OR REPLACE FUNCTION public.marcar_motor_como_vendido()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.motores SET estado = 'Vendido' WHERE id = NEW.motor_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_vender_motor ON public.ventas;
CREATE TRIGGER tr_vender_motor
  AFTER INSERT ON public.ventas
  FOR EACH ROW EXECUTE FUNCTION public.marcar_motor_como_vendido();

-- ================================================================
-- Unicidad cédula por empresa
-- ================================================================
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_cedula_key;
DROP INDEX IF EXISTS idx_cliente_empresa_cedula;
DROP INDEX IF EXISTS idx_clientes_empresa_cedula_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cliente_empresa_cedula ON clientes (empresa_id, cedula);
