# ⚡ Ejecutar Scripts de Códigos de Registro - Guía Rápida

## 🚨 Problema Actual

La aplicación no reconoce los códigos de registro porque **la tabla `codigos_registro` no existe en Supabase**.

## ✅ Solución en 2 Pasos

### Paso 1: Crear la Tabla (OBLIGATORIO)

1. **Ve a Supabase SQL Editor**:
   - [https://app.supabase.com/project/kpqvzkgsbawfqdsxjdjc/sql/new](https://app.supabase.com/project/kpqvzkgsbawfqdsxjdjc/sql/new)

2. **Copia y pega este script**:

```sql
-- Crear tabla para gestionar códigos de registro únicos
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

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_codigos_registro_codigo ON codigos_registro(codigo);
CREATE INDEX IF NOT EXISTS idx_codigos_registro_usado ON codigos_registro(usado);

-- Trigger para actualizar updated_at
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

3. **Haz clic en "Run"** o presiona `Ctrl + Enter`
4. **Deberías ver: "Success"**

### Paso 2: Generar Códigos Iniciales (OBLIGATORIO)

1. **En el mismo SQL Editor, crea una nueva consulta** (New query)

2. **Copia y pega este script**:

```sql
-- Generar códigos de registro iniciales
INSERT INTO codigos_registro (codigo, usado, notas) VALUES
  ('JASICORPJOHNRIJO-2024-001', FALSE, 'Código de registro inicial 1'),
  ('JASICORPSAMUELAHIASRIJO-2024-002', FALSE, 'Código de registro inicial 2'),
  ('JASICORP-2024-003GISLEYDIRIJO', FALSE, 'Código de registro inicial 3'),
  ('JASICORP-2024-004IANRIJO', FALSE, 'Código de registro inicial 4'),
  ('JASICORP-2024JOHNWILLIAMSRIJO-005', FALSE, 'Código de registro inicial 5'),
  ('JASICORP-2024SULE-006', FALSE, 'Código de registro inicial 6')
ON CONFLICT (codigo) DO NOTHING;
```

3. **Haz clic en "Run"**
4. **Deberías ver: "Success"** o un mensaje indicando que se insertaron los códigos

## ✅ Verificar

1. **Ve a "Table Editor" en Supabase**
2. **Busca la tabla `codigos_registro`**
3. **Haz clic en ella** - Deberías ver 6 códigos con `usado = false`

## 🎯 Códigos que Puedes Usar

Una vez ejecutados los scripts, podrás usar estos códigos para registrarte:

1. `JASICORPJOHNRIJO-2024-001`
2. `JASICORPSAMUELAHIASRIJO-2024-002`
3. `JASICORP-2024-003GISLEYDIRIJO`
4. `JASICORP-2024-004IANRIJO`
5. `JASICORP-2024JOHNWILLIAMSRIJO-005`
6. `JASICORP-2024SULE-006`

**⚠️ Importante**: 
- Los códigos son **case-sensitive** (distingue mayúsculas y minúsculas)
- Cada código solo puede usarse **UNA vez**
- Una vez usado, ese código ya no será válido

## 🧪 Probar

1. Ve a: `https://sisi-seven.vercel.app/register`
2. Ingresa uno de los códigos de arriba
3. Completa el resto del formulario
4. Debería funcionar correctamente

## 🔄 Si Necesitas Más Códigos

Ejecuta en Supabase SQL Editor:

```sql
INSERT INTO codigos_registro (codigo, usado, notas) VALUES
  ('TU-CODIGO-AQUI-001', FALSE, 'Descripción del código'),
  ('TU-CODIGO-AQUI-002', FALSE, 'Descripción del código');
```



