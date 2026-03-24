# PWA – Service Worker y actualizaciones (Android)

## Archivos involucrados

- **Service Worker:** `public/sw.js` (estático, sin hash; Next no lo genera).
- **Registro:** `components/ServiceWorkerRegistration.tsx` (solo en móvil).
- **Config:** `next.config.js` (headers `Cache-Control: no-cache` para `/sw.js`).
- **Manifest:** `public/manifest.json` (no bloquea actualizaciones).

---

## Qué estaba mal

1. **Actualización del SW:** Aunque había `skipWaiting()` y `clients.claim()`, el cliente no recargaba al tomar control el nuevo SW, por lo que la PWA en Android podía seguir usando la versión antigua.
2. **Limpieza de caché:** Solo se borraban caches con prefijo `jasi-` distintos a los actuales; ahora se elimina cualquier cache que no sea los dos actuales (`STATIC_CACHE` y `PAGE_CACHE`).
3. **Rutas sensibles:** No se excluían explícitamente `/login`, `/session`, `/user`, `/profile`, `/auth`; podían quedar cacheadas y bloquear acceso o auth.
4. **Estrategia de HTML:** Las navegaciones no se interceptaban; el navegador podía servir HTML desde su caché y mostrar versión vieja. Ahora se usa **NetworkFirst** para documentos.
5. **Assets estáticos:** Se usaba Cache-First; ahora **StaleWhileRevalidate** para que se actualicen en segundo plano sin bloquear.
6. **Registro en el cliente:** No había `controllerchange` para recargar ni comprobación periódica de `registration.update()`.

---

## Cambios aplicados

### A) Service Worker (`public/sw.js`)

- **install:** `self.skipWaiting()` para que el nuevo SW pase a activo en cuanto esté listo.
- **activate:** `caches.keys()` y borrado de **todos** los caches que no sean `STATIC_CACHE` ni `PAGE_CACHE`; luego `self.clients.claim()`.
- **Bypass (no cachear):** `/api/*`, Supabase, auth, realtime, mapas, y rutas `/login`, `/session`, `/user`, `/profile`, `/auth`.
- **Métodos:** Solo se interceptan peticiones `GET`; POST/PUT/DELETE no se cachean.
- **HTML (navigate/document):** Estrategia **NetworkFirst** (red primero, fallback a caché y a `offline.html`).
- **Assets estáticos:** Estrategia **StaleWhileRevalidate** (respuesta desde caché y actualización en segundo plano).
- **Versión de caché:** `CACHE_VERSION = 'jasi-v6'` para invalidar caches antiguos en la próxima activación.

### B) Registro (`components/ServiceWorkerRegistration.tsx`)

- `registration.update()` justo después de `register()`.
- Listener `controllerchange`: al tomar control un nuevo SW se hace `window.location.reload()` para cargar la nueva versión.
- Intervalo cada 60 s (solo si la pestaña está visible) llamando a `registration.update()` para detectar nueva versión pronto.
- Cleanup al desmontar: clear del intervalo y eliminación del listener `controllerchange`.

### C) Configuración existente (sin cambios)

- **next.config.js:** Headers para `/sw.js`: `Cache-Control: no-cache, max-age=0` y `Service-Worker-Allowed: /`.
- **Manifest:** `start_url: "/"`, `scope: "/"`; no añade nada que impida actualizar el SW.
- **Build:** El SW es un archivo estático en `public/`; no se genera con hash, por lo que las actualizaciones se sirven correctamente.

---

## Comportamiento esperado en Android

- Al publicar una nueva versión, el SW se descarga (sin caché agresiva por los headers).
- El nuevo SW hace `skipWaiting()` y en **activate** limpia caches viejos y hace `clients.claim()`.
- El cliente recibe `controllerchange` y recarga la página, mostrando la nueva versión.
- Las rutas de API, auth, login, session, user, profile no se cachean; la autenticación no se bloquea.
- Las páginas HTML se piden primero a la red (NetworkFirst), reduciendo versiones antiguas en pantalla.
