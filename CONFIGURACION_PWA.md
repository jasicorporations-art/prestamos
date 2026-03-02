# 📱 Configuración PWA con next-pwa

## ✅ Configuración Completada

La aplicación está configurada como PWA (Progressive Web App) usando `next-pwa`, lo que permite instalarla en Android e iOS.

## 🔧 Configuración Implementada

### 1. **next.config.js**
- Plugin `next-pwa` configurado
- Destino: `public` (genera el service worker en `/public/sw.js`)
- Registro automático del service worker
- Caché offline configurado

### 2. **manifest.json**
- Configurado para Android e iOS
- Iconos incluidos (192x192, 512x512, apple-touch-icon)
- Theme color y background color configurados
- Shortcuts para acceso rápido

### 3. **app/layout.tsx**
- Meta tags para iOS (`apple-mobile-web-app-capable`)
- Enlaces a iconos y manifest
- Viewport configurado

## 📦 Archivos Generados

Después de hacer `npm run build`, next-pwa generará automáticamente:
- `/public/sw.js` - Service Worker principal
- `/public/workbox-*.js` - Archivos de Workbox para caché
- `/public/worker-*.js` - Workers adicionales

**Nota:** Estos archivos están en `.gitignore` y se generan automáticamente en cada build.

## 🚀 Cómo Funciona

### En Desarrollo (`npm run dev`)
- El service worker está **deshabilitado** para facilitar el desarrollo
- No se generan archivos PWA

### En Producción (`npm run build`)
- Se genera automáticamente el service worker en `/public/sw.js`
- Se configuran estrategias de caché offline
- La app puede funcionar sin conexión

## 📱 Instalación en Dispositivos

### Android
1. Abre la app en Chrome
2. Aparecerá un banner "Agregar a pantalla de inicio"
3. O ve a Menú → "Agregar a pantalla de inicio"
4. La app se instalará como una app nativa

### iOS (Safari)
1. Abre la app en Safari
2. Toca el botón de compartir (cuadrado con flecha)
3. Selecciona "Agregar a pantalla de inicio"
4. La app se instalará como una app nativa

## 🔍 Verificación

Para verificar que la PWA está funcionando:

1. **Build de producción:**
   ```bash
   npm run build
   ```

2. **Verificar archivos generados:**
   - Debe existir `/public/sw.js`
   - Debe existir `/public/workbox-*.js`

3. **En el navegador:**
   - Abre DevTools → Application → Service Workers
   - Debe aparecer el service worker registrado
   - Abre DevTools → Application → Manifest
   - Debe mostrar el manifest correctamente

4. **Lighthouse:**
   - Ejecuta Lighthouse en Chrome DevTools
   - Debe pasar las pruebas de PWA

## ⚙️ Configuración Avanzada

### Personalizar Caché
Edita `next.config.js` para modificar las estrategias de caché:

```javascript
runtimeCaching: [
  {
    urlPattern: /^https?.*/,
    handler: 'NetworkFirst', // o 'CacheFirst', 'StaleWhileRevalidate', etc.
    options: {
      cacheName: 'offlineCache',
      expiration: {
        maxEntries: 200,
      },
    },
  },
]
```

### Deshabilitar PWA en Desarrollo
Ya está configurado: `disable: process.env.NODE_ENV === 'development'`

## 🐛 Solución de Problemas

### El service worker no se registra
- Verifica que estés en producción (`npm run build && npm start`)
- Revisa la consola del navegador para errores
- Verifica que `/public/sw.js` existe después del build

### La app no se puede instalar
- Verifica que el manifest.json sea válido
- Asegúrate de que los iconos existan en `/public`
- Verifica que estés usando HTTPS (requerido para PWA)

### Caché no funciona
- Limpia el caché del navegador
- Verifica que el service worker esté activo
- Revisa la configuración de `runtimeCaching`

## 📚 Recursos

- [next-pwa Documentation](https://github.com/shadowwalker/next-pwa)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)

