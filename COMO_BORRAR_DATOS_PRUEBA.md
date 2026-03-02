# 🗑️ Cómo Borrar los Datos de Prueba

## ⚠️ ADVERTENCIA

**Este proceso eliminará TODOS los datos** de:
- Pagos
- Ventas
- Clientes
- Motores

Las tablas y su estructura se mantendrán, solo se borrarán los datos.

## 📋 Opción 1: Desde Supabase SQL Editor (Recomendado)

### Paso 1: Abrir SQL Editor

1. Ve a tu proyecto en Supabase: https://app.supabase.com/project/ganrgbdkzxktuymxdmzf
2. En el menú lateral, haz clic en **"SQL Editor"**
3. Haz clic en **"New query"** o **"Nueva consulta"**

### Paso 2: Copiar y Ejecutar el Script

1. Abre el archivo `supabase/limpiar-datos-prueba.sql` en tu proyecto
2. Copia TODO el contenido (Ctrl + A, Ctrl + C)
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **"Run"** o presiona `Ctrl + Enter`

### Paso 3: Verificar

Deberías ver un mensaje de éxito y los conteos de todas las tablas en 0.

## 📋 Opción 2: Script SQL Directo

Si prefieres ejecutar el SQL directamente, copia y pega esto en Supabase SQL Editor:

```sql
-- Borrar todos los datos
DELETE FROM pagos;
DELETE FROM ventas;
DELETE FROM clientes;
DELETE FROM motores;
```

## 📋 Opción 3: Desde Supabase Table Editor

1. Ve a **"Table Editor"** en Supabase
2. Para cada tabla (pagos, ventas, clientes, motores):
   - Haz clic en la tabla
   - Selecciona todos los registros (si hay pocos)
   - Haz clic en **"Delete"** o el icono de basura
   - Confirma la eliminación

**Nota:** Debes borrar en este orden: pagos → ventas → clientes → motores

## 🔄 Después de Borrar

Una vez que borres los datos:

1. **Las tablas seguirán existiendo** - No necesitas recrearlas
2. **Puedes empezar a agregar datos nuevos** - Todo funcionará normalmente
3. **La aplicación seguirá funcionando** - Solo estará vacía

## 🆘 Si Quieres Mantener Algunos Datos

Si quieres borrar solo algunos datos específicos:

1. Ve a **"Table Editor"** en Supabase
2. Selecciona los registros que quieres borrar
3. Haz clic en **"Delete"**

O crea un script SQL personalizado con condiciones:

```sql
-- Ejemplo: Borrar solo clientes con nombre específico
DELETE FROM pagos WHERE venta_id IN (
  SELECT id FROM ventas WHERE cliente_id IN (
    SELECT id FROM clientes WHERE nombre_completo LIKE '%Prueba%'
  )
);
DELETE FROM ventas WHERE cliente_id IN (
  SELECT id FROM clientes WHERE nombre_completo LIKE '%Prueba%'
);
DELETE FROM clientes WHERE nombre_completo LIKE '%Prueba%';
```

## ✅ Verificación

Después de borrar, verifica en la aplicación:

1. Abre: https://cursor-nu-black.vercel.app
2. Ve a cada sección:
   - **Motores**: Debería estar vacía
   - **Clientes**: Debería estar vacía
   - **Ventas**: Debería estar vacía
   - **Pagos**: Debería estar vacía

## 🔒 Seguridad

- Los datos borrados **NO se pueden recuperar** fácilmente
- Si necesitas hacer una copia de seguridad, exporta los datos antes de borrar
- En Supabase, puedes hacer una copia de seguridad desde **Settings** → **Database** → **Backups**





