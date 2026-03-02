# 📋 Agregar Campo de Plazo a Ventas

## ✅ Campo Agregado

Se ha agregado el campo **`plazo_meses`** a la tabla de ventas para calcular el interés según el plazo de financiamiento.

## 🚀 Pasos para Aplicar

### Paso 1: Ejecutar el Script SQL

1. Ve a tu proyecto en **Supabase**
2. Abre el **SQL Editor**
3. Copia y pega el contenido del archivo `supabase/agregar-plazo-ventas.sql`
4. Haz clic en **"Run"** para ejecutar el script

### Paso 2: Verificar los Campos

1. Ve a **Table Editor** en Supabase
2. Selecciona la tabla **`ventas`**
3. Verifica que los nuevos campos aparezcan:
   - `plazo_meses` (INTEGER)
   - `porcentaje_interes` (DECIMAL)
   - `tipo_interes` (VARCHAR)

## 📝 Cambios en el Código

Los siguientes archivos han sido actualizados:

1. **`types/index.ts`**: Agregados los campos al tipo `Venta`
2. **`components/forms/VentaForm.tsx`**: Agregado campo de plazo y cálculo automático de interés
3. **`lib/services/interes.ts`**: Servicio para calcular intereses según el plazo
4. **`app/ventas/[id]/factura/page.tsx`**: Muestra el interés aplicado en la factura
5. **`app/ventas/page.tsx`**: Muestra el plazo en la tabla de ventas

## 🎨 Sistema de Intereses

### Plazos Cortos (1-6 meses)
- **1-2 meses**: Descuento del 1-2%
- **3 meses**: Sin interés
- **4-6 meses**: Interés del 1-3%

### Plazos Medianos (7-12 meses)
- **7-12 meses**: Interés del 4-9%

### Plazos Largos (13-24 meses)
- **13-18 meses**: Interés del 10-15%
- **19-24 meses**: Interés del 16-22%

## ✅ Verificación

Después de ejecutar el SQL:

1. **Recarga la aplicación**
2. Ve a la sección **Ventas**
3. **Crea una nueva venta**
4. Ingresa un **plazo en meses** (ej: 12)
5. Verifica que el **monto total se ajuste automáticamente** con el interés
6. Verifica que la **factura muestre el interés aplicado**

---

**Ejecuta el script SQL y el sistema de intereses estará disponible inmediatamente.** ✅



