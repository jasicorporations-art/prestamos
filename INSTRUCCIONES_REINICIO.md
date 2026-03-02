# 🔄 INSTRUCCIONES PARA VER LOS CAMBIOS

## ⚠️ IMPORTANTE: Sigue estos pasos EXACTAMENTE

### Paso 1: Detener el servidor
- Si tienes `npm run dev` corriendo, presiona `Ctrl + C` para detenerlo

### Paso 2: Limpiar caché completamente
```powershell
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules/.cache
```

### Paso 3: Reconstruir el proyecto
```powershell
npm run build
```

### Paso 4: Reiniciar el servidor
```powershell
npm run dev
```

### Paso 5: Limpiar caché del navegador
1. Presiona `Ctrl + Shift + Delete`
2. Selecciona "Caché" o "Imágenes y archivos en caché"
3. Selecciona "Todo el tiempo"
4. Haz clic en "Eliminar datos"

### Paso 6: Recargar la página
- Presiona `Ctrl + F5` (hard refresh)
- O `Ctrl + Shift + R`

### Paso 7: Verificar cambios
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Crea un préstamo nuevo con:
   - Tipo: Quincenal
   - Cantidad: 30 quincenas
4. Busca en la consola: `📊 [VentaForm] Datos antes de guardar:`
5. Verifica que muestre:
   - `cantidadCuotasFinal: 30`
   - `plazoMesesFinal: 30`

## ✅ Cambios aplicados en el código:

1. **Campo "Cantidad de Cuotas"** solo se muestra cuando es mensual
2. **Para quincenal/semanal/diario**: usa directamente `cantidad_plazo`
3. **`plazo_meses`** siempre es igual a `cantidad_cuotas` (sin conversión)

## 🔍 Si aún no funciona:

1. Verifica en la consola del navegador si hay errores (en rojo)
2. Comparte los logs que aparecen cuando creas un préstamo
3. Verifica en la base de datos que `plazo_meses` sea igual a `cantidad_cuotas`
