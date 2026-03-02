-- Tabla de configuración para envío híbrido WhatsApp (Evolution API o Twilio).
-- Opcional: si no existe, el sistema usa siempre Twilio.
-- Ejecutar en Supabase > SQL Editor si quieres usar Evolution API por empresa.

CREATE TABLE IF NOT EXISTS configuracion_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  metodo_envio text NOT NULL DEFAULT 'TWILIO' CHECK (metodo_envio IN ('TWILIO', 'EVOLUTION')),
  evolution_instance text,
  evolution_apikey text,
  evolution_base_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id)
);

COMMENT ON TABLE configuracion_whatsapp IS 'Configuración de envío WhatsApp por empresa: TWILIO (Edge Function) o EVOLUTION (Evolution API).';
COMMENT ON COLUMN configuracion_whatsapp.metodo_envio IS 'TWILIO = usar Twilio siempre. EVOLUTION = intentar Evolution API y fallback a Twilio si falla.';
COMMENT ON COLUMN configuracion_whatsapp.evolution_base_url IS 'URL base del servidor Evolution API, ej: http://TU_IP:8080';
COMMENT ON COLUMN configuracion_whatsapp.evolution_instance IS 'Nombre de la instancia en Evolution API.';
COMMENT ON COLUMN configuracion_whatsapp.evolution_apikey IS 'API Key de Evolution API (opcional, según tu servidor).';

-- RLS: solo usuarios autenticados pueden leer; ajusta según tu política.
ALTER TABLE configuracion_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leer configuracion_whatsapp por empresa"
  ON configuracion_whatsapp FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir insert/update configuracion_whatsapp por servicio"
  ON configuracion_whatsapp FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ejemplo: usar Evolution para una empresa (reemplaza EMPRESA_UUID y valores).
-- INSERT INTO configuracion_whatsapp (empresa_id, metodo_envio, evolution_instance, evolution_apikey, evolution_base_url)
-- VALUES ('EMPRESA_UUID', 'EVOLUTION', 'mi-instancia', 'tu-apikey', 'http://TU_IP:8080')
-- ON CONFLICT (empresa_id) DO UPDATE SET
--   metodo_envio = EXCLUDED.metodo_envio,
--   evolution_instance = EXCLUDED.evolution_instance,
--   evolution_apikey = EXCLUDED.evolution_apikey,
--   evolution_base_url = EXCLUDED.evolution_base_url,
--   updated_at = now();
