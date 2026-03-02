# 📋 Instrucciones: Agregar Campos a la Tabla Clientes

## ⚠️ IMPORTANTE

El error indica que los campos nuevos (celular, fecha_compra, fecha_finalizacion_prestamo, dia_pagos) **NO existen en la base de datos**.

## 🚀 Solución: Ejecutar el Script SQL

### Paso 1: Abrir Supabase SQL Editor

1. Ve a tu proyecto en **Supabase**: https://supabase.com
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto
4. En el menú lateral izquierdo, haz clic en **"SQL Editor"** (o "Editor SQL")

### Paso 2: Copiar el Script

1. Abre el archivo **`EJECUTAR_ESTE_SQL_CLIENTES.sql`** en este proyecto
2. **Copia TODO el contenido** del archivo (Ctrl + A, luego Ctrl + C)

### Paso 3: Pegar y Ejecutar

1. En el **SQL Editor** de Supabase, haz clic en **"New query"** (Nueva consulta)
2. **Pega el contenido** que copiaste (Ctrl + V)
3. Haz clic en el botón **"Run"** (Ejecutar) o presiona **Ctrl + Enter**

### Paso 4: Verificar

Después de ejecutar, deberías ver un mensaje de éxito y una tabla con los 4 campos nuevos:
- `celular`
- `fecha_compra`
- `fecha_finalizacion_prestamo`
- `dia_pagos`

### Paso 5: Recargar la Aplicación

1. **Cierra y vuelve a abrir** tu aplicación
2. O **recarga la página** (Ctrl + Shift + R)
3. Intenta **crear o editar un cliente** nuevamente
4. El error debería desaparecer

## 📝 Script SQL Completo

Si prefieres copiar directamente, aquí está el script:

```sql
-- Agregar columna de celular
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS celular VARCHAR(20);

-- Agregar columna de fecha de compra
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS fecha_compra DATE;

-- Agregar columna de fecha de finalización de préstamo
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS fecha_finalizacion_prestamo DATE;

-- Agregar columna de día de pagos (1-31)
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS dia_pagos INTEGER CHECK (dia_pagos >= 1 AND dia_pagos <= 31);
```

## ✅ Verificación Alternativa

Si quieres verificar que las columnas se agregaron:

1. Ve a **Table Editor** en Supabase
2. Selecciona la tabla **`clientes`**
3. Deberías ver las nuevas columnas:
   - `celular`
   - `fecha_compra`
   - `fecha_finalizacion_prestamo`
   - `dia_pagos`

## 🔍 Si el Error Persiste

Si después de ejecutar el SQL el error continúa:

1. **Abre la consola del navegador** (F12)
2. **Intenta guardar un cliente**
3. **Revisa el mensaje de error** en la consola
4. El mensaje ahora será más específico y te dirá exactamente qué está fallando

## 📸 Capturas de Pantalla (Referencia)

### SQL Editor en Supabase:
- Menú lateral → **SQL Editor**
- Botón **"New query"**
- Pegar el script
- Botón **"Run"**

### Table Editor (Verificación):
- Menú lateral → **Table Editor**
- Seleccionar tabla **`clientes`**
- Ver las columnas agregadas

---

**Ejecuta el script SQL y el error desaparecerá.** ✅



