# 📋 Agregar Campos Adicionales a Clientes

## ✅ Campos Agregados

Se han agregado los siguientes campos a la tabla de clientes:

1. **Celular**: Número de teléfono del cliente
2. **Fecha de Compra**: Fecha en que el cliente realizó la compra
3. **Fecha de Finalización de Préstamo**: Fecha estimada de finalización del préstamo
4. **Día de Pagos**: Día del mes (1-31) en que el cliente debe realizar sus pagos

## 🚀 Pasos para Aplicar

### Paso 1: Ejecutar el Script SQL

1. Ve a tu proyecto en **Supabase**
2. Abre el **SQL Editor**
3. Copia y pega el contenido del archivo `supabase/agregar-campos-clientes.sql`
4. Haz clic en **"Run"** para ejecutar el script

### Paso 2: Verificar los Campos

1. Ve a **Table Editor** en Supabase
2. Selecciona la tabla **`clientes`**
3. Verifica que los nuevos campos aparezcan:
   - `celular` (VARCHAR)
   - `fecha_compra` (DATE)
   - `fecha_finalizacion_prestamo` (DATE)
   - `dia_pagos` (INTEGER)

## 📝 Cambios en el Código

Los siguientes archivos han sido actualizados:

1. **`types/index.ts`**: Agregados los nuevos campos al tipo `Cliente`
2. **`components/forms/ClienteForm.tsx`**: Agregados los campos al formulario
3. **`app/clientes/page.tsx`**: Agregadas las columnas a la tabla
4. **`lib/services/cuotas.ts`**: Actualizado para usar el campo `celular`

## 🎨 Interfaz

### Formulario de Cliente

El formulario ahora incluye:
- Campo de **Celular** (tipo teléfono)
- Campo de **Fecha de Compra** (selector de fecha)
- Campo de **Fecha de Finalización de Préstamo** (selector de fecha)
- Campo de **Día de Pagos** (número del 1 al 31)

### Tabla de Clientes

La tabla ahora muestra:
- **Celular**: Número de teléfono del cliente
- **Fecha Compra**: Fecha formateada (DD/MM/YYYY)
- **Fin Préstamo**: Fecha formateada (DD/MM/YYYY)
- **Día Pagos**: "Día X" o "N/A" si no está configurado

## ⚠️ Notas Importantes

- Los campos son **opcionales**, por lo que los clientes existentes no se verán afectados
- El campo **Día de Pagos** debe ser un número entre 1 y 31
- Las fechas se guardan en formato ISO (YYYY-MM-DD)
- El campo **Celular** se usará automáticamente en el Panel de Administración para WhatsApp

## ✅ Verificación

Después de ejecutar el SQL:

1. **Recarga la aplicación**
2. Ve a la sección **Clientes**
3. **Crea un nuevo cliente** o **edita uno existente**
4. Verifica que puedas ingresar los nuevos campos
5. Verifica que los campos se muestren correctamente en la tabla

---

**Ejecuta el script SQL y los nuevos campos estarán disponibles inmediatamente.** ✅



