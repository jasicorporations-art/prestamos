# ✅ Solución Definitiva: Códigos de Registro

## 🔍 Diagnóstico Rápido

Si los códigos existen en Supabase pero no funcionan, sigue estos pasos:

### 1. Verificar en Supabase que los Códigos Existen

Ejecuta en Supabase SQL Editor:

```sql
SELECT codigo, usado FROM codigos_registro WHERE usado = FALSE;
```

**Si no ves códigos**, ejecuta primero:
- `supabase/crear-tabla-codigos-registro.sql`
- `supabase/generar-codigos-registro-iniciales.sql`

### 2. Verificar el Código Exacto

Los códigos son **case-sensitive** (distingue mayúsculas y minúsculas).

**Códigos correctos** (copia exactamente):
- `JASICORPJOHNRIJO-2024-001`
- `JASICORPSAMUELAHIASRIJO-2024-002`
- `JASICORP-2024-003GISLEYDIRIJO`
- `JASICORP-2024-004IANRIJO`
- `JASICORP-2024JOHNWILLIAMSRIJO-005`
- `JASICORP-2024SULE-006`

### 3. Probar en la Aplicación

1. Ve a: `https://sisi-seven.vercel.app/register`
2. **Copia y pega** uno de los códigos (no lo escribas)
3. Completa el resto del formulario
4. Debería funcionar

## 🐛 Si Aún No Funciona

### Opción A: Verificar en la Consola del Navegador

1. Abre la aplicación en el navegador
2. Presiona **F12** para abrir las herramientas de desarrollador
3. Ve a la pestaña **"Console"**
4. Intenta registrarte
5. Revisa los mensajes que aparecen:
   - Deberías ver: "Validando código: [tu código]"
   - Y el resultado de la validación

### Opción B: Verificar Variables de Entorno en Vercel

1. Ve a Vercel Dashboard
2. Settings → Environment Variables
3. Verifica que estén configuradas:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Haz un **Redeploy** si las acabas de agregar

### Opción C: Verificar Permisos en Supabase

1. Ve a Supabase → Settings → API
2. Verifica que las políticas de RLS (Row Level Security) permitan lectura
3. Si RLS está habilitado, puede que necesites crear políticas

## 📋 Scripts SQL Completos (Listos para Copiar)

### Script 1: Crear Tabla

```sql
CREATE TABLE IF NOT EXISTS codigos_registro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(255) NOT NULL UNIQUE,
  usado BOOLEAN NOT NULL DEFAULT FALSE,
  usado_por_email VARCHAR(255),
  usado_en TIMESTAMP WITH TIME ZONE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_codigos_registro_codigo ON codigos_registro(codigo);
CREATE INDEX IF NOT EXISTS idx_codigos_registro_usado ON codigos_registro(usado);

CREATE OR REPLACE FUNCTION update_codigos_registro_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_codigos_registro_updated_at_trigger ON codigos_registro;
CREATE TRIGGER update_codigos_registro_updated_at_trigger
  BEFORE UPDATE ON codigos_registro
  FOR EACH ROW
  EXECUTE FUNCTION update_codigos_registro_updated_at();
```

### Script 2: Generar Códigos

```sql
INSERT INTO codigos_registro (codigo, usado, notas) VALUES
  ('JASICORPJOHNRIJO-2024-001', FALSE, 'Código de registro inicial 1'),
  ('JASICORPSAMUELAHIASRIJO-2024-002', FALSE, 'Código de registro inicial 2'),
  ('JASICORP-2024-003GISLEYDIRIJO', FALSE, 'Código de registro inicial 3'),
  ('JASICORP-2024-004IANRIJO', FALSE, 'Código de registro inicial 4'),
  ('JASICORP-2024JOHNWILLIAMSRIJO-005', FALSE, 'Código de registro inicial 5'),
  ('JASICORP-2024SULE-006', FALSE, 'Código de registro inicial 6')
ON CONFLICT (codigo) DO NOTHING;
```

## ✅ Verificación Final

Ejecuta este script para verificar todo:

```sql
-- Ver todos los códigos disponibles
SELECT 
  codigo, 
  usado, 
  CASE WHEN usado THEN 'USADO' ELSE 'DISPONIBLE' END as estado
FROM codigos_registro 
ORDER BY creado_en;
```

Deberías ver 6 códigos con estado "DISPONIBLE".



