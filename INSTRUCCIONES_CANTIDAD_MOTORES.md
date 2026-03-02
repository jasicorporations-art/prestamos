# 📦 Sistema de Cantidad de Motores - Instrucciones

## ✅ Funcionalidad Agregada

He agregado un sistema completo de gestión de inventario con cantidades para los motores.

## 🔧 Cambios Realizados

### 1. Base de Datos
- ✅ Agregado campo `cantidad` a la tabla `motores`
- ✅ Script SQL creado: `supabase/agregar-cantidad-motores.sql`

### 2. Formulario de Motores
- ✅ Campo "Cantidad en Existencia" agregado
- ✅ Validación para que la cantidad sea un número entero positivo

### 3. Sistema de Ventas
- ✅ Al vender un motor, se descuenta automáticamente 1 unidad de la cantidad
- ✅ Si la cantidad llega a 0, el estado cambia automáticamente a "Vendido"
- ✅ Validación: No se puede vender si no hay stock disponible

### 4. Visualización
- ✅ Columna "Cantidad" agregada a la tabla de motores
- ✅ Colores indicativos:
  - 🟢 Verde: Stock normal (10+ unidades)
  - 🟡 Amarillo: Stock bajo (1-9 unidades)
  - 🔴 Rojo: Sin stock (0 unidades)
- ✅ Dashboard muestra total de unidades disponibles

## 📋 Pasos para Activar

### Paso 1: Ejecutar el Script SQL en Supabase

1. **Abre Supabase:**
   - Ve a tu proyecto en Supabase
   - Ve a **SQL Editor**

2. **Ejecuta el script:**
   - Abre el archivo `supabase/agregar-cantidad-motores.sql`
   - Copia TODO el contenido
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en **"Run"**

3. **Verifica:**
   - Deberías ver: "Success. No rows returned"
   - Ve a **Table Editor** > `motores`
   - Deberías ver la columna `cantidad`

### Paso 2: Actualizar Motores Existentes

Los motores existentes tendrán cantidad = 1 por defecto. Puedes:

1. **Editar cada motor** y actualizar la cantidad manualmente
2. **O ejecutar este SQL** para actualizar todos a una cantidad específica:
   ```sql
   UPDATE motores SET cantidad = 100 WHERE marca = 'Yamaha';
   UPDATE motores SET cantidad = 50 WHERE marca = 'Honda';
   -- etc.
   ```

### Paso 3: Reiniciar el Servidor

1. **Detén el servidor** (Ctrl + C)
2. **Reinicia:**
   ```powershell
   & "C:\Program Files\nodejs\npm.cmd" run dev
   ```
3. **Abre:** `http://localhost:3000`

## 🎯 Cómo Usar

### Crear un Motor con Cantidad

1. Ve a **Motores** > **Nuevo Motor**
2. Completa todos los campos
3. En **"Cantidad en Existencia"**, ingresa la cantidad (ej: 100)
4. Guarda

### Vender un Motor

1. Ve a **Ventas** > **Nueva Venta**
2. Selecciona un motor
3. Verás el stock disponible
4. Si hay stock, puedes crear la venta
5. Al guardar, se descontará automáticamente 1 unidad

### Ver Stock Disponible

- En la tabla de **Motores**, verás la columna "Cantidad" con colores:
  - Verde: Stock normal
  - Amarillo: Stock bajo
  - Rojo: Sin stock
- En el **Dashboard**, verás el total de unidades disponibles

## ⚠️ Importante

- **Cantidad mínima:** 0 (no puede ser negativa)
- **Descuento automático:** Cada venta descuenta 1 unidad
- **Estado automático:** Si cantidad = 0, el estado cambia a "Vendido"
- **Validación:** No se puede vender si cantidad = 0

## 🔄 Ejemplo de Uso

1. **Crear motor Yamaha con 100 unidades:**
   - Marca: Yamaha
   - Matrícula: YAM-001
   - Chasis: CHS001
   - Precio: $40,000
   - **Cantidad: 100**

2. **Vender 1 motor:**
   - Crear venta
   - Seleccionar el motor Yamaha
   - Guardar
   - **Resultado:** Cantidad ahora es 99

3. **Continuar vendiendo:**
   - Cada venta descuenta 1 unidad
   - Cuando llegue a 0, el estado cambia a "Vendido"

---

**Ejecuta el script SQL en Supabase y reinicia el servidor para activar esta funcionalidad.** 🚀



