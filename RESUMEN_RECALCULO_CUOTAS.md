# 🔄 Sistema de Recalculo Automático de Cuotas

## ✅ Funcionalidad Implementada

Cuando un cliente paga **más de lo que corresponde a una cuota**, el sistema **recalcula automáticamente** el monto de las cuotas restantes, manteniendo el número de cuotas pero reduciendo el valor de cada una (pago a capital).

## 🔧 Cómo Funciona

### Ejemplo Práctico

**Situación Inicial:**
- Deuda total: $63,000
- Cuotas totales: 18 meses
- Valor por cuota: $63,000 ÷ 18 = $3,500
- Cuotas pagadas: 4
- Cuotas restantes: 14
- Saldo pendiente: $63,000 - (4 × $3,500) = $49,000

**Cliente Paga:**
- Monto pagado: $10,000 (más de una cuota)

**Cálculo Automático:**
1. **Nuevo saldo**: $49,000 - $10,000 = $39,000
2. **Cuotas restantes**: 14 (se mantienen)
3. **Nuevo valor por cuota**: $39,000 ÷ 14 = **$2,785.71**

**Resultado:**
- El número de cuotas se mantiene en 14
- El valor por cuota se reduce de $3,500 a $2,785.71
- El cliente paga menos en cada cuota restante (pago a capital)

## 📊 Lógica de Recalculo

### Paso 1: Detectar Pago Mayor a Cuota

El sistema compara:
- **Monto del pago** vs **Valor de cuota actual**
- Si el pago es mayor, activa el recálculo

### Paso 2: Calcular Nuevo Saldo

```
Nuevo Saldo = Saldo Pendiente - Monto del Pago
```

### Paso 3: Mantener Número de Cuotas

```
Cuotas Restantes = Cuotas Totales - Cuotas Ya Pagadas
```

**El número de cuotas NO cambia**, se mantiene igual.

### Paso 4: Recalcular Valor de Cuota

```
Nuevo Valor por Cuota = Nuevo Saldo ÷ Cuotas Restantes
```

El valor de cada cuota se reduce porque el cliente está pagando capital.

## 🎯 Beneficios

1. **Flexibilidad**: El cliente puede pagar más cuando tenga disponibilidad
2. **Reducción de Monto**: Al pagar más, el monto de cada cuota restante se reduce
3. **Pago a Capital**: El exceso se aplica directamente al capital pendiente
4. **Transparencia**: El sistema muestra claramente el recálculo
5. **Automatización**: No requiere intervención manual

## 📝 Visualización en el Formulario

Cuando el cliente ingresa un monto mayor a la cuota, el formulario muestra:

- ⚠️ **Alerta**: "Pago Mayor a la Cuota"
- **Información**: Explica que las cuotas se recalcularán
- **Nuevo saldo estimado**: Muestra el saldo después del pago

## ⚠️ Consideraciones

1. **Mantiene Número de Cuotas**: El número de cuotas restantes NO cambia
2. **Reduce Valor de Cuota**: El valor de cada cuota se recalcula basándose en el nuevo saldo
3. **Pago a Capital**: El exceso se aplica al capital, reduciendo el monto de las cuotas futuras
4. **Cálculo Automático**: El sistema calcula automáticamente el nuevo valor por cuota

## 🔍 Ejemplo Detallado

**Escenario:**
- Venta: $63,000 en 18 cuotas
- Valor por cuota: $3,500
- Pagos realizados: 4 cuotas ($14,000)
- Saldo pendiente: $49,000
- Cuotas restantes: 14

**Cliente paga $10,000:**

1. **Nuevo saldo**: $49,000 - $10,000 = $39,000
2. **Cuotas restantes**: 14 (se mantienen)
3. **Nuevo valor por cuota**: $39,000 ÷ 14 = **$2,785.71**
4. **Reducción por cuota**: $3,500 - $2,785.71 = **$714.29 menos por cuota**
5. **Ahorro total**: $714.29 × 14 = **$10,000** (el exceso pagado)

## ✅ Archivos Modificados

1. **`lib/services/pagos.ts`**: Lógica de recálculo en `create`
2. **`lib/services/ventas.ts`**: Método `updateCantidadCuotas`
3. **`components/forms/PagoForm.tsx`**: Visualización de alerta cuando el pago es mayor

## 🎨 Interfaz

El formulario ahora muestra:
- Valor por cuota actual
- Cuotas restantes estimadas
- Alerta cuando el pago es mayor a la cuota
- Nuevo saldo estimado después del pago

---

**El sistema ahora recalcula automáticamente las cuotas cuando el cliente paga más de lo correspondiente a una cuota.** ✅

