# Verificación de Cambios Implementados

## ✅ Cambios Aplicados

### 1. Corrección de Quincenas, Semanas y Días
**Archivo:** `components/forms/VentaForm.tsx` (líneas 572-576)
- ✅ Para quincenal, diario y semanal: `plazo_meses = cantidad_cuotas` (sin convertir)
- ✅ Para mensual: `plazo_meses = cantidad_cuotas` (igual)

**Archivo:** `lib/services/amortizacion.ts`
- ✅ La función `calcularAmortizacionFrancesa` ahora acepta `tipo_plazo`
- ✅ Calcula fechas correctamente según el tipo (días, semanas, quincenas)

**Archivo:** `lib/services/ventas.ts` (líneas 519-528)
- ✅ Pasa `tipo_plazo` y parámetros necesarios a la función de amortización

### 2. Cargos por Mora en Pagos
**Archivo:** `components/forms/PagoForm.tsx`
- ✅ Importa `calcularTotalCargosMora` (línea 13)
- ✅ Estado `cargosMoraPendientes` (línea 48)
- ✅ Obtiene cargos por mora al cargar venta (línea 127)
- ✅ Suma cargos por mora al monto (líneas 159, 167, 231, 239)
- ✅ Muestra desglose visual (líneas 779-810)

**Archivo:** `lib/services/pagos.ts` (líneas 327-355)
- ✅ Calcula cargos por mora antes de validar
- ✅ Permite monto mayor al saldo si incluye mora
- ✅ Aplica correctamente el pago (mora + cuota)

## 🔍 Cómo Verificar

1. **Limpiar caché:**
   ```powershell
   Remove-Item -Recurse -Force .next
   ```

2. **Reiniciar servidor:**
   ```powershell
   npm run dev
   ```

3. **Limpiar caché del navegador:**
   - Presiona `Ctrl + Shift + Delete`
   - Selecciona "Caché" o "Imágenes y archivos en caché"
   - Haz clic en "Eliminar datos"

4. **Recargar página:**
   - Presiona `Ctrl + F5` (hard refresh)

5. **Verificar en consola del navegador (F12):**
   - Busca logs: `💰 [PagoForm] Cargos por mora calculados:`
   - Busca logs: `💰 [PagoForm] Monto calculado:`

## 🧪 Pruebas

### Prueba 1: Quincenas
1. Crear préstamo con 30 quincenas
2. Verificar que se crean 30 cuotas (no 15)
3. Verificar fechas (cada 15 días)

### Prueba 2: Semanas
1. Crear préstamo con 52 semanas
2. Verificar que se crean 52 cuotas (no ~12 meses)
3. Verificar fechas (cada 7 días)

### Prueba 3: Días
1. Crear préstamo con 90 días
2. Verificar que se crean 90 cuotas (no ~3 meses)
3. Verificar fechas (cada día)

### Prueba 4: Mora en Pagos
1. Seleccionar venta con cuotas vencidas
2. Verificar que aparece recuadro rojo con desglose
3. Verificar que el monto incluye mora + cuota
4. Registrar pago y verificar que se aplica correctamente
