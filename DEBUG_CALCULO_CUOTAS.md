# 🔍 Debug: Cálculo de Cuotas y Distribución de Pagos

## Problema Reportado
"No se está restando bien y no se está distribuyendo a las cuotas"

## Análisis del Problema

### 1. Cálculo de Cuotas Pendientes
**Antes:**
- Usaba `pagos.length` para contar cuotas pagadas
- Problema: Si hay múltiples pagos para la misma cuota, cuenta incorrectamente

**Ahora:**
- Usa `Set` de `numero_cuota` para contar cuotas únicas pagadas
- Asegura que cada cuota se cuenta solo una vez

### 2. Cálculo del Valor de Cuota
**Antes:**
- `saldo_pendiente / numeroCuotasPendientes`
- Podía tener problemas de precisión con decimales

**Ahora:**
- `Math.round((saldo_pendiente / numeroCuotasPendientes) * 100) / 100`
- Redondea a 2 decimales para evitar problemas de precisión

### 3. Actualización del Saldo
**Antes:**
- `nuevoSaldo = venta.saldo_pendiente - pago.monto`
- No redondeaba

**Ahora:**
- `nuevoSaldoRedondeado = Math.round(nuevoSaldo * 100) / 100`
- Redondea a 2 decimales antes de actualizar

## Ejemplo de Cálculo Correcto

**Situación:**
- Venta: $63,000 en 18 cuotas
- Valor original por cuota: $3,500
- Pagos realizados: 4 cuotas ($14,000)
- Saldo pendiente: $49,000
- Cuotas restantes: 14

**Cliente paga $10,000 (pago extraordinario):**

1. **Nuevo saldo**: $49,000 - $10,000 = $39,000
2. **Cuotas pagadas**: 4 (se mantiene, solo se cuenta una vez)
3. **Cuotas restantes**: 18 - 4 = 14 (se mantiene)
4. **Nuevo valor por cuota**: $39,000 ÷ 14 = $2,785.71

**Distribución:**
- Cada una de las 14 cuotas restantes ahora vale $2,785.71
- El exceso de $10,000 se distribuye automáticamente entre las 14 cuotas
- Reducción por cuota: $3,500 - $2,785.71 = $714.29

## Verificación

Para verificar que funciona correctamente:

1. **Crear una venta** con 18 cuotas de $3,500
2. **Registrar 4 pagos** normales ($3,500 cada uno)
3. **Verificar saldo**: Debe ser $49,000
4. **Registrar pago extraordinario** de $10,000
5. **Verificar nuevo saldo**: Debe ser $39,000
6. **Verificar valor de cuota en panel admin**: Debe ser $2,785.71
7. **Verificar cuotas restantes**: Deben ser 14

## Archivos Modificados

1. **`lib/services/cuotas.ts`**:
   - Usa `Set` para contar cuotas únicas pagadas
   - Redondea el valor de cuota a 2 decimales
   - Asegura que `numeroCuotasPendientes` nunca sea negativo

2. **`lib/services/pagos.ts`**:
   - Redondea el nuevo saldo a 2 decimales antes de actualizar

## Próximos Pasos

1. Probar con una venta real
2. Verificar que el saldo se actualiza correctamente
3. Verificar que el valor de cuota se recalcula correctamente
4. Verificar que se distribuye correctamente entre las cuotas restantes



