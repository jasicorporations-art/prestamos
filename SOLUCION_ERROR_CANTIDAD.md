# 🔧 Solución: Error al Guardar Motor con Cantidad

## ❌ Error

Cuando intentas guardar un motor con cantidad, aparece:
```
Error al guardar el motor
```

## 🔍 Causa

Este error ocurre porque **la columna `cantidad` no existe en la base de datos** de Supabase.

## ✅ Solución

### Paso 1: Ejecutar el Script SQL en Supabase

**IMPORTANTE:** Debes ejecutar el script SQL primero para agregar la columna.

1. **Abre Supabase:**
   - Ve a tu proyecto: https://app.supabase.com/project/ganrgbdkzxktuymxdmzf
   - Ve a **SQL Editor** (menú lateral)

2. **Abre el archivo SQL:**
   - En tu proyecto, abre: `supabase/agregar-cantidad-motores.sql`
   - Copia TODO el contenido

3. **Pega y ejecuta en Supabase:**
   - Pega el contenido en el SQL Editor
   - Haz clic en **"Run"** o presiona `Ctrl + Enter`
   - Deberías ver: **"Success. No rows returned"** ✅

4. **Verifica que se creó:**
   - Ve a **Table Editor** > `motores`
   - Deberías ver la columna `cantidad`

### Paso 2: Verificar el Script SQL

El script debe contener esto:

```sql
-- Agregar columna cantidad a la tabla motores
ALTER TABLE motores 
ADD COLUMN IF NOT EXISTS cantidad INTEGER NOT NULL DEFAULT 1;

-- Actualizar motores existentes
UPDATE motores 
SET cantidad = 1 
WHERE cantidad IS NULL OR cantidad = 0;

-- Agregar constraint
ALTER TABLE motores 
ADD CONSTRAINT check_cantidad_positiva 
CHECK (cantidad >= 0);

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_motores_cantidad ON motores(cantidad);
```

### Paso 3: Reiniciar el Servidor

Después de ejecutar el SQL:

1. **Detén el servidor** (Ctrl + C en la terminal)
2. **Reinicia:**
   ```powershell
   & "C:\Program Files\nodejs\npm.cmd" run dev
   ```
3. **Prueba nuevamente** crear un motor con cantidad

## 🆘 Si Sigue el Error

### Verificar en Supabase

1. Ve a **Table Editor** > `motores`
2. Verifica que existe la columna `cantidad`
3. Si NO existe, ejecuta el SQL nuevamente

### Verificar Errores en la Consola

1. Abre la consola del navegador (F12)
2. Ve a la pestaña **Console**
3. Intenta crear un motor
4. **Copia el error completo** que aparece
5. Compártelo para que pueda ayudarte mejor

### Ejecutar SQL Manualmente

Si el script no funciona, ejecuta esto en Supabase SQL Editor:

```sql
ALTER TABLE motores ADD COLUMN IF NOT EXISTS cantidad INTEGER NOT NULL DEFAULT 1;
UPDATE motores SET cantidad = 1 WHERE cantidad IS NULL;
ALTER TABLE motores ADD CONSTRAINT check_cantidad_positiva CHECK (cantidad >= 0);
```

---

**¿Ya ejecutaste el script SQL en Supabase? Si no, hazlo primero. Si sí, comparte el error exacto que ves en la consola del navegador (F12).** 🔍



