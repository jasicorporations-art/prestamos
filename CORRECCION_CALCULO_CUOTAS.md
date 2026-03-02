# 🔧 Corrección: Cálculo de Cuotas Después de Pago Extraordinario

## Problema Identificado

Cuando se hace un pago extraordinario (mayor a una cuota), el valor de las cuotas no se calculaba correctamente después del pago.

**Ejemplo del error:**
- Pago de $100,000
- El formulario mostraba que las cuotas quedarían en $15,595
- Pero después del pago, las cuotas quedaron en $11,153.62

## Causa del Problema

1. **Conteo incorrecto de cuotas pagadas**: Usaba `pagosExistentes.length` en lugar de contar cuotas únicas por `numero_cuota`
2. **Cálculo incorrecto después del pago**: Usaba las cuotas pendientes ANTES del pago, pero debería usar las cuotas pendientes DESPUÉS del pago (restando 1 porque se registra una nueva cuota)

## Corrección Aplicada

### 1. Conteo Correcto de Cuotas Pagadas

**Antes:**
```typescript
const cuotasPagadas = pagosExistentes.length
```

**Ahora:**
```typescript
const cuotasPagadasSet = new Set(
  pagosExistentes
    .map(p => p.numero_cuota)
    .filter((n): n is number => n !== null && n !== undefined)
)
const cuotasPagadas = cuotasPagadasSet.size
```

### 2. Cálculo Correcto Después del Pago

**Antes:**
```typescript
const nuevoValorCuota = nuevoSaldo > 0 && numeroCuotasPendientes > 0
  ? nuevoSaldo / numeroCuotasPendientes
  : nuevoSaldo
```

**Ahora:**
```typescript
// Después del pago, las cuotas pendientes se reducen en 1
const numeroCuotasPendientesDespues = Math.max(0, numeroCuotasPendientesAntes - 1)
const nuevoValorCuota = nuevoSaldo > 0 && numeroCuotasPendientesDespues > 0
  ? Math.round((nuevoSaldo / numeroCuotasPendientesDespues) * 100) / 100
  : nuevoSaldo
```

## Ejemplo Corregido

**Situación:**
- Venta: $280,000 en 18 cuotas
- Valor original por cuota: $15,555.56
- Pagos realizados: 3 cuotas
- Saldo pendiente: $233,333.33
- Cuotas restantes: 15

**Cliente paga $100,000:**

**Cálculo ANTES del pago (mostrado en formulario):**
- Cuotas pendientes: 15
- Valor por cuota actual: $233,333.33 ÷ 15 = $15,555.56

**Cálculo DESPUÉS del pago:**
- Nuevo saldo: $233,333.33 - $100,000 = $133,333.33
- Cuotas pendientes DESPUÉS: 15 - 1 = 14 (se resta 1 porque se registra una nueva cuota)
- Nuevo valor por cuota: $133,333.33 ÷ 14 = $9,523.81

**Resultado:**
- El formulario ahora mostrará correctamente que las cuotas quedarán en $9,523.81
- Después del pago, el panel de administración mostrará $9,523.81

## Verificación

Para verificar que funciona:

1. Seleccionar una venta con cuotas pendientes
2. Ver el valor de cuota actual en el formulario
3. Ingresar un monto mayor a una cuota
4. Verificar que el "Nuevo valor por cuota" sea correcto
5. Registrar el pago
6. Verificar en el panel de administración que el valor de cuota coincida

## Archivos Modificados

- **`components/forms/PagoForm.tsx`**: 
  - Usa Set para contar cuotas únicas pagadas
  - Calcula correctamente las cuotas pendientes después del pago
  - Redondea a 2 decimales para precisión



