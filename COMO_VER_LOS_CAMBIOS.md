# 🔄 Cómo Ver los Cambios Recientes

## ⚠️ Problema: Los Cambios No Se Ven

Si los cambios recientes no se reflejan en tu navegador, es porque el **Service Worker está cacheando la versión antigua**.

## ✅ Solución Rápida

### Opción 1: Recarga Forzada (Más Rápido)

1. **Presiona `Ctrl + Shift + R`** (Windows/Linux) o **`Cmd + Shift + R`** (Mac)
2. Esto fuerza al navegador a recargar sin usar el caché

### Opción 2: Limpiar Caché del Navegador

#### En Chrome/Edge:

1. Presiona **F12** para abrir DevTools
2. Ve a la pestaña **"Application"** (Aplicación)
3. En el menú lateral, expande **"Service Workers"**
4. Haz clic en **"Unregister"** en cada Service Worker listado
5. Expande **"Storage"** (Almacenamiento)
6. Haz clic en **"Clear site data"** (Limpiar datos del sitio)
7. Marca **TODAS** las opciones:
   - ✅ Cache storage
   - ✅ Service Workers
   - ✅ Local storage
   - ✅ Session storage
8. Haz clic en **"Clear site data"**
9. **Cierra todas las pestañas** del sitio
10. **Vuelve a abrir** el navegador
11. Ve a `https://dealers.jasicorporations.com`
12. Presiona **Ctrl + Shift + R** para recargar

#### En Firefox:

1. Presiona **F12** para abrir DevTools
2. Ve a la pestaña **"Almacenamiento"**
3. Haz clic derecho en el dominio > **"Limpiar todo"**
4. Cierra y vuelve a abrir el navegador

### Opción 3: Modo Incógnito (Para Verificar)

1. Abre una ventana de incógnito (Ctrl + Shift + N)
2. Ve a `https://dealers.jasicorporations.com`
3. Los cambios deberían verse inmediatamente

## 📋 Cambios Recientes que Deberías Ver

### 1. En "Nuevo Préstamo" (Formulario de Venta):
- ✅ "Valor de Préstamo" → **"Valor del Vehículo"**
- ✅ "Préstamos Disponibles" → **"Vehículos Disponibles"**
- ✅ Nueva sección: **"Información del Vehículo"** con:
  - Matrícula
  - Placa
  - Número de Chasis

### 2. En "Nuevo Vehículo" (Formulario de Motor):
- ✅ "Valor de Préstamo" → **"Valor del Vehículo"**
- ✅ "Préstamos Disponibles" → **"Vehículos Disponibles"**
- ✅ "Estado" → **"Estado del Vehículo"**

### 3. En Página de Registro:
- ✅ "JASICORPORATIONS GESTION DE PRESTAMOS" → **"JASICORPORATIONS DEALERS"**

## 🔍 Verificación

Después de limpiar el caché:

1. Ve a **"Emitir Préstamos"** (`/ventas`)
2. Haz clic en **"Emitir Nuevo Préstamo"**
3. Selecciona un vehículo
4. Deberías ver:
   - La sección azul con "Información del Vehículo"
   - Los campos: Matrícula, Placa, Número de Chasis
   - "Vehículos Disponibles" en lugar de "Préstamos Disponibles"

## 🚨 Si Aún No Funciona

1. **Verifica que estés en la URL correcta:**
   - `https://dealers.jasicorporations.com`
   - O `https://cursor-nu-black-five.vercel.app`

2. **Espera 2-3 minutos** después del despliegue (a veces tarda en propagarse)

3. **Prueba en otro navegador** para confirmar que es un problema de caché

4. **Contacta al desarrollador** si el problema persiste después de seguir todos los pasos

