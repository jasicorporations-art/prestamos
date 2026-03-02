# ✅ Verificar y Solucionar Error de Cantidad

## 🔍 Diagnóstico

El error "Error al guardar el motor" cuando pones cantidad significa que **la columna `cantidad` no existe en Supabase**.

## ✅ Solución Paso a Paso

### Paso 1: Ejecutar el Script SQL

1. **Abre Supabase:**
   - Ve a: https://app.supabase.com/project/ganrgbdkzxktuymxdmzf
   - Ve a **SQL Editor** (menú lateral)

2. **Ejecuta el script:**
   - Abre el archivo `EJECUTAR_SQL_CANTIDAD.sql` en tu proyecto
   - Copia TODO el contenido
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en **"Run"**

3. **Deberías ver:**
   - "Success. No rows returned" o similar
   - Al final, una tabla mostrando la columna `cantidad`

### Paso 2: Verificar en Table Editor

1. Ve a **Table Editor** en Supabase
2. Selecciona la tabla `motores`
3. Deberías ver la columna `cantidad` en la lista de columnas

### Paso 3: Reiniciar el Servidor

1. **Detén el servidor** (Ctrl + C)
2. **Reinicia:**
   ```powershell
   & "C:\Program Files\nodejs\npm.cmd" run dev
   ```
3. **Espera** a ver "Ready"

### Paso 4: Probar Nuevamente

1. Ve a **Motores** > **Nuevo Motor**
2. Completa todos los campos
3. En **"Cantidad en Existencia"**, ingresa un número (ej: 100)
4. Guarda
5. **Debería funcionar ahora** ✅

## 🆘 Si Sigue el Error

### Verificar el Error Exacto

1. Abre la consola del navegador (F12)
2. Ve a la pestaña **Console**
3. Intenta crear un motor
4. **Copia el error completo** que aparece en rojo
5. Compártelo

### Verificar que la Columna Existe

Ejecuta esto en Supabase SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'motores' AND column_name = 'cantidad';
```

**Debería mostrar:** Una fila con `cantidad` y `integer`

Si NO muestra nada, la columna no existe y necesitas ejecutar el script SQL.

---

**Ejecuta el script `EJECUTAR_SQL_CANTIDAD.sql` en Supabase primero. Eso solucionará el problema.** 🚀



