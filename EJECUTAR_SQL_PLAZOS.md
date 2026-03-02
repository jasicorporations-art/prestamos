# 🔧 Ejecutar SQL para Agregar Columnas de Plazos

## ⚠️ Error Actual

El error `Could not find the 'dia_pago_mensual' column` indica que las columnas no existen en la tabla `ventas` de Supabase.

## ✅ Solución: Ejecutar Script SQL

### Paso 1: Abrir Supabase SQL Editor

1. Ve a tu proyecto en Supabase: https://app.supabase.com/project/kpqvzkgsbawfqdsxjdjc
2. En el menú lateral izquierdo, haz clic en **SQL Editor**
3. O ve directamente a: https://app.supabase.com/project/kpqvzkgsbawfqdsxjdjc/sql/new

### Paso 2: Copiar y Pegar el Script

Abre el archivo `supabase/agregar-campos-plazo-ventas.sql` y copia TODO su contenido.

### Paso 3: Ejecutar el Script

1. Pega el contenido completo en el SQL Editor de Supabase
2. Haz clic en el botón **Run** (o presiona `Ctrl + Enter`)
3. Deberías ver: **Success. No rows returned** o un mensaje de éxito

### Paso 4: Verificar que Funcionó

Después de ejecutar el script, verifica que las columnas se agregaron:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ventas' 
AND column_name IN ('tipo_plazo', 'dia_pago_semanal', 'fecha_inicio_quincenal', 'dia_pago_mensual');
```

Deberías ver las 4 columnas listadas.

## 📋 Contenido del Script

El script agrega las siguientes columnas a la tabla `ventas`:

1. **`tipo_plazo`** - TEXT: 'semanal', 'quincenal' o 'mensual'
2. **`dia_pago_semanal`** - INTEGER: 0-6 (Domingo-Sábado)
3. **`fecha_inicio_quincenal`** - DATE: Fecha de inicio para pagos quincenales
4. **`dia_pago_mensual`** - INTEGER: 1-31 (día del mes)

## 🚨 Si el Script Falla

Si ves algún error al ejecutar el script:

1. **Error: "column already exists"**
   - ✅ Esto es bueno, significa que la columna ya existe
   - Puedes continuar, el script usa `IF NOT EXISTS` así que es seguro

2. **Error: "permission denied"**
   - Verifica que estás usando la cuenta correcta de Supabase
   - Asegúrate de tener permisos de administrador

3. **Otro error**
   - Copia el mensaje de error completo
   - Verifica que estás en el proyecto correcto de Supabase

## ✅ Después de Ejecutar

Una vez ejecutado el script exitosamente:

1. **Recarga la aplicación** en el navegador
2. **Intenta emitir un préstamo** nuevamente
3. Debería funcionar sin errores

## 📝 Nota

Este script es seguro de ejecutar múltiples veces porque usa `IF NOT EXISTS`, así que no causará problemas si ya existen algunas columnas.

