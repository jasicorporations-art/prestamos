# 💰 Sistema de Cargos por Mora - Pagos Atrasados

## ✅ Funcionalidades Implementadas

### 1. Cálculo Automático de Cargos
- **Detección Automática**: Identifica cuotas vencidas automáticamente
- **Cálculo de Días**: Calcula los días de atraso desde la fecha de vencimiento
- **Período de Gracia**: 5 días de gracia antes de aplicar el cargo
- **Cargo Proporcional**: 0.5% por día de atraso sobre el monto de la cuota
- **Cargo Mínimo**: $100 mínimo por cuota atrasada

### 2. Visualización en la Interfaz
- **Dashboard**: Muestra el total de cargos por mora pendientes
- **Lista de Ventas**: Indica con icono de advertencia las ventas con cargos
- **Detalle de Pagos**: Muestra desglose completo de cargos por cuota
- **Alertas Visuales**: Iconos y colores rojos para indicar pagos atrasados

### 3. Configuración del Sistema
- **Porcentaje de Mora**: 0.5% diario (configurable)
- **Días de Gracia**: 5 días (configurable)
- **Cargo Mínimo**: $100 (configurable)

## 🔧 Cómo Funciona

### Cálculo de Fechas de Vencimiento
- Las cuotas se calculan mensualmente desde la fecha de venta
- Cuota 1 vence 1 mes después de la venta
- Cuota 2 vence 2 meses después de la venta
- Y así sucesivamente...

### Cálculo de Cargos
1. **Verifica si la cuota está vencida**:
   - Compara la fecha de vencimiento con la fecha actual
   - Si no hay pago registrado para esa cuota

2. **Calcula días de atraso**:
   - Días desde la fecha de vencimiento hasta hoy
   - Resta los días de gracia (5 días)

3. **Aplica el cargo**:
   - Monto de la cuota × 0.5% × días con cargo
   - Mínimo $100 por cuota atrasada

### Ejemplo de Cálculo

**Escenario:**
- Venta: $10,000 en 5 cuotas
- Cuota mensual: $2,000
- Cuota 1 vencida hace 15 días
- Días de gracia: 5 días

**Cálculo:**
- Días de atraso: 15 días
- Días con cargo: 15 - 5 = 10 días
- Cargo por día: $2,000 × 0.5% = $10/día
- Cargo total: $10 × 10 días = $100
- **Cargo aplicado: $100** (mínimo)

## 📋 Dónde se Muestra

### 1. Dashboard Principal
- Muestra el total de cargos por mora en la tarjeta "Total por Cobrar"
- Indicador visual con icono de advertencia

### 2. Lista de Ventas
- Icono de advertencia (⚠️) junto al saldo pendiente
- Muestra el monto adicional de cargos por mora
- Color rojo para destacar

### 3. Detalle de Pagos de una Venta
- Sección destacada con todos los cargos
- Desglose por cuota:
  - Número de cuota
  - Fecha de vencimiento
  - Días de atraso
  - Monto del cargo
- Total de cargos por mora

## ⚙️ Configuración

Los parámetros están en `lib/services/mora.ts`:

```typescript
const CONFIG_MORA = {
  porcentajeMora: 0.5,    // 0.5% por día
  diasGracia: 5,          // 5 días de gracia
  montoMinimo: 100,       // $100 mínimo
}
```

Puedes modificar estos valores según tus necesidades.

## 📊 Ejemplo Práctico

**Venta realizada el 1 de enero:**
- Monto: $20,000
- Cuotas: 4 cuotas de $5,000
- Fechas de vencimiento:
  - Cuota 1: 1 de febrero
  - Cuota 2: 1 de marzo
  - Cuota 3: 1 de abril
  - Cuota 4: 1 de mayo

**Estado actual (15 de marzo):**
- ✅ Cuota 1: Pagada
- ❌ Cuota 2: Vencida (14 días de atraso)
- ⏳ Cuota 3: Aún no vence
- ⏳ Cuota 4: Aún no vence

**Cálculo de cargo para Cuota 2:**
- Días de atraso: 14 días
- Días con cargo: 14 - 5 = 9 días
- Cargo: $5,000 × 0.5% × 9 = $225
- **Cargo aplicado: $225**

## ✅ Beneficios

- ✅ **Automático**: No requiere intervención manual
- ✅ **Transparente**: Muestra claramente los cargos
- ✅ **Justo**: Período de gracia antes de aplicar cargos
- ✅ **Proporcional**: El cargo aumenta con los días de atraso
- ✅ **Mínimo Garantizado**: Cargo mínimo para evitar montos muy pequeños

## 🔄 Actualización

Los cargos se calculan en tiempo real cada vez que:
- Se carga la lista de ventas
- Se visualiza el dashboard
- Se accede al detalle de pagos de una venta

**Nota**: Los cargos se calculan pero no se aplican automáticamente al saldo. Se muestran como información adicional para que el usuario pueda cobrarlos cuando se registre el pago.

---

**El sistema de cargos por mora está completamente funcional y se muestra en toda la interfaz.** ✅



