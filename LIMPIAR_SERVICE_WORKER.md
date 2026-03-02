# 🔧 Cómo Limpiar el Service Worker

## ⚠️ IMPORTANTE

El Service Worker se ha actualizado, pero necesitas **limpiar el Service Worker antiguo** para que el nuevo funcione.

## 🚀 Pasos para Limpiar

### Paso 1: Abrir DevTools
1. Presiona **F12** en tu navegador
2. O haz clic derecho > "Inspeccionar"

### Paso 2: Ir a Service Workers
1. En DevTools, ve a la pestaña **"Application"** (o "Aplicación")
2. En el menú lateral, expande **"Service Workers"**
3. Deberías ver el Service Worker registrado

### Paso 3: Desregistrar el Service Worker
1. Haz clic en **"Unregister"** (Desregistrar) junto al Service Worker
2. O marca la casilla **"Bypass for network"** (Omitir para red)

### Paso 4: Limpiar el Caché
1. En el menú lateral, expande **"Storage"** (Almacenamiento)
2. Haz clic en **"Clear site data"** (Limpiar datos del sitio)
3. Asegúrate de que estén marcadas:
   - ✅ Cache storage
   - ✅ Service Workers
   - ✅ Local storage (opcional)

### Paso 5: Recargar la Página
1. Presiona **Ctrl + Shift + R** (recarga forzada sin caché)
2. O cierra y vuelve a abrir el navegador

## ✅ Verificación

Después de limpiar:

1. **Abre la consola** (F12 > Console)
2. **No deberías ver errores** del Service Worker
3. **Deberías ver**: `Service Worker registrado exitosamente`
4. **Todos los pagos deberían funcionar**

## 🔍 Si el Problema Persiste

### Opción 1: Deshabilitar Temporalmente el Service Worker

En `components/ServiceWorkerRegistration.tsx`, comenta temporalmente:

```typescript
// navigator.serviceWorker.register('/sw.js')
```

### Opción 2: Usar Modo Incógnito

1. Abre una ventana de incógnito (Ctrl + Shift + N)
2. Ve a `http://localhost:3000`
3. El Service Worker no debería estar activo

### Opción 3: Eliminar Manualmente

1. En DevTools > Application > Service Workers
2. Haz clic en "Unregister"
3. En Application > Storage > Clear site data
4. Cierra todas las pestañas del navegador
5. Vuelve a abrir

## 📝 Nota

El nuevo Service Worker tiene el nombre `nazaret-reynoso-v2`, lo que forzará una actualización automática cuando se registre.

---

**Sigue los pasos para limpiar el Service Worker y los errores deberían desaparecer.** ✅



