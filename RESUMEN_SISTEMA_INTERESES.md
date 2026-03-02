# 💰 Sistema de Intereses por Plazo de Financiamiento

## ✅ Funcionalidades Implementadas

### 1. Cálculo Automático de Interés

El sistema calcula automáticamente el interés o descuento según el plazo de financiamiento:

- **Plazos cortos (1-6 meses)**: Descuentos o interés mínimo
- **Plazos medianos (7-12 meses)**: Interés moderado
- **Plazos largos (13-24 meses)**: Mayor interés

### 2. Tabla de Intereses

| Plazo | Tipo | Porcentaje | Ejemplo (Motor $10,000) |
|-------|------|------------|-------------------------|
| 1 mes | Descuento | -2% | $9,800 |
| 2 meses | Descuento | -1% | $9,900 |
| 3 meses | Sin interés | 0% | $10,000 |
| 6 meses | Interés | 3% | $10,300 |
| 12 meses | Interés | 9% | $10,900 |
| 18 meses | Interés | 15% | $11,500 |
| 24 meses | Interés | 22% | $12,200 |

### 3. Formulario de Venta Mejorado

El formulario ahora incluye:
- **Campo de Plazo**: Ingresar el plazo en meses (1-24)
- **Cálculo Automático**: El monto total se ajusta automáticamente
- **Vista Previa**: Muestra el precio base, interés/descuento y monto final
- **Formato Legible**: Muestra el plazo en formato legible (ej: "12 meses (1 año)")

### 4. Visualización en Factura

La factura ahora muestra:
- **Precio Base**: Precio original del motor
- **Plazo de Financiamiento**: Tiempo acordado
- **Interés/Descuento Aplicado**: Porcentaje y monto
- **Monto Total**: Precio final con interés aplicado

### 5. Tabla de Ventas

La tabla de ventas muestra:
- **Columna de Plazo**: Muestra los meses y el porcentaje de interés
- **Monto Total**: Con indicador del precio base si hay diferencia

## 🔧 Cómo Funciona

### Al Crear una Venta

1. **Seleccionas el motor** (precio base: $10,000)
2. **Ingresas el plazo** (ej: 12 meses)
3. **El sistema calcula automáticamente**:
   - Interés: 9% para 12 meses
   - Monto del interés: $900
   - **Monto total: $10,900**
4. **Ingresas la cantidad de cuotas** (ej: 12)
5. **Valor por cuota**: $10,900 ÷ 12 = $908.33

### Ejemplo Práctico

**Escenario:**
- Motor: $10,000
- Plazo: 6 meses
- Cuotas: 6

**Cálculo:**
- Interés: 3%
- Monto interés: $300
- **Monto total: $10,300**
- **Valor por cuota: $1,716.67**

## 📊 Configuración de Intereses

### Plazos Cortos (Incentivo)
- **1-2 meses**: Descuento del 1-2% (pago rápido)
- **3 meses**: Sin interés (pago a corto plazo)
- **4-6 meses**: Interés bajo (1-3%)

### Plazos Medianos (Equilibrado)
- **7-12 meses**: Interés moderado (4-9%)

### Plazos Largos (Mayor Riesgo)
- **13-18 meses**: Interés alto (10-15%)
- **19-24 meses**: Interés muy alto (16-22%)

## 🚀 Pasos para Aplicar

### 1. Ejecutar el Script SQL

1. Ve a **Supabase** → **SQL Editor**
2. Copia y pega el contenido de `supabase/agregar-plazo-ventas.sql`
3. Haz clic en **"Run"**

### 2. Verificar

1. Recarga la aplicación
2. Ve a **Ventas** → **Nueva Venta**
3. Verifica que aparezca el campo **"Plazo de Financiamiento"**
4. Ingresa un plazo y verifica que el monto se ajuste automáticamente

## 📝 Archivos Creados/Modificados

1. **`lib/services/interes.ts`**: Servicio de cálculo de intereses
2. **`supabase/agregar-plazo-ventas.sql`**: Script SQL para agregar campos
3. **`components/forms/VentaForm.tsx`**: Formulario actualizado con plazo
4. **`types/index.ts`**: Tipo Venta actualizado
5. **`app/ventas/[id]/factura/page.tsx`**: Factura actualizada
6. **`app/ventas/page.tsx`**: Tabla de ventas actualizada

## ⚙️ Personalización

### Cambiar los Porcentajes de Interés

Edita `lib/services/interes.ts` y modifica el array `CONFIGURACION_INTERESES`:

```typescript
const CONFIGURACION_INTERESES: ConfiguracionInteres[] = [
  { plazoMeses: 3, porcentajeInteres: 0, tipo: 'interes' },
  { plazoMeses: 6, porcentajeInteres: 5, tipo: 'interes' }, // Cambiar a 5%
  // ... más configuraciones
]
```

### Agregar Más Plazos

Simplemente agrega más entradas al array `CONFIGURACION_INTERESES`.

## ✅ Resultado

Ahora el sistema:
- ✅ Calcula automáticamente el interés según el plazo
- ✅ Aplica descuentos para plazos cortos
- ✅ Aplica intereses para plazos largos
- ✅ Muestra el desglose en el formulario
- ✅ Incluye el interés en la factura
- ✅ Permite personalizar los porcentajes fácilmente

---

**Ejecuta el script SQL y el sistema de intereses estará completamente funcional.** ✅



