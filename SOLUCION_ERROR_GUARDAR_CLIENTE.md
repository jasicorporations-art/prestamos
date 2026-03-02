# 🔧 Solución: Error al Guardar Cliente

## ⚠️ Problema

Al intentar guardar un cliente, aparece el error: "Error al guardar el cliente"

## 🔍 Causas Posibles

### 1. Campos Nuevos No Existen en la Base de Datos (Más Común)

Si agregaste los campos nuevos (celular, fecha_compra, fecha_finalizacion_prestamo, dia_pagos) pero **NO ejecutaste el script SQL**, la base de datos no tiene esas columnas.

**Solución:**
1. Ve a **Supabase** → **SQL Editor**
2. Copia y pega el contenido de `supabase/agregar-campos-clientes.sql`
3. Haz clic en **"Run"** para ejecutar el script
4. Verifica que los campos se agregaron correctamente

### 2. Error de Validación

Los campos pueden tener valores inválidos:
- **Día de Pagos**: Debe ser un número entre 1 y 31
- **Fechas**: Deben estar en formato válido
- **Cédula**: Debe ser única (no puede haber dos clientes con la misma cédula)

### 3. Error de Conexión

Problemas de conexión con Supabase.

## ✅ Solución Aplicada

He mejorado el manejo de errores para mostrar mensajes más específicos:

- ✅ Detecta si faltan columnas en la base de datos
- ✅ Muestra el mensaje de error específico de Supabase
- ✅ Filtra campos vacíos antes de enviar
- ✅ Valida el formato de fechas

## 🚀 Pasos para Resolver

### Paso 1: Verificar que el SQL se Ejecutó

1. Ve a **Supabase** → **Table Editor**
2. Selecciona la tabla **`clientes`**
3. Verifica que existan estas columnas:
   - `celular` (VARCHAR)
   - `fecha_compra` (DATE)
   - `fecha_finalizacion_prestamo` (DATE)
   - `dia_pagos` (INTEGER)

### Paso 2: Si Faltan las Columnas

1. Ve a **Supabase** → **SQL Editor**
2. Copia y pega este script:

```sql
-- Agregar campos adicionales a la tabla de clientes
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS celular VARCHAR(20);

ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS fecha_compra DATE;

ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS fecha_finalizacion_prestamo DATE;

ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS dia_pagos INTEGER CHECK (dia_pagos >= 1 AND dia_pagos <= 31);
```

3. Haz clic en **"Run"**

### Paso 3: Recargar la Aplicación

1. Recarga la página del navegador
2. Intenta crear o editar un cliente nuevamente

## 🔍 Verificar el Error Específico

Si el error persiste:

1. **Abre la consola del navegador** (F12)
2. **Intenta guardar un cliente**
3. **Revisa el mensaje de error** en la consola
4. El mensaje ahora será más específico y te dirá exactamente qué está fallando

## 📝 Notas

- Los campos nuevos son **opcionales**, puedes guardar un cliente sin llenarlos
- Si solo llenas los campos básicos (nombre, cédula, dirección, garante), debería funcionar
- El error más común es que no se ejecutó el script SQL para agregar las columnas

---

**Ejecuta el script SQL y el error debería desaparecer.** ✅



