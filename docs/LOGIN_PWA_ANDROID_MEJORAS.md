# Mejoras de login PWA/Android – Resumen de cambios

## Objetivo

Que el login en la app instalada en Android/PWA sea **rápido**, **estable** y que **no falle** por caché viejo, sesión corrupta, timeouts mal manejados, Service Worker, restauración incorrecta de sesión o falta de empresa/perfil cargado a tiempo.

---

## 1. Flujo de autenticación revisado

### Problemas detectados

- **getSession / getCurrentUser** sin timeout: en PWA/Android la red o el storage pueden tardar y la app quedaba colgada.
- **AuthGuard** llamaba getSession y luego getCurrentUser (dos round-trips); además esperaba perfil sin límite de tiempo.
- **Login** usaba un mensaje genérico ("Verifica tu conexión") en timeout y no diferenciaba errores de red, sesión o perfil.
- **Verificación de suscripción** en el guard podía tardar indefinidamente.

### Soluciones aplicadas

- **lib/utils/authTimeout.ts** (nuevo):
  - `withTimeout(promise, ms, fallback)`: evita esperas indefinidas.
  - `isNetworkError`, `isSessionError`: clasificación de errores.
  - `mapAuthErrorMessage(error, context)`: mensajes claros por tipo de error (red, sesión, credenciales, perfil, empresa, timeout).

- **lib/services/auth.ts**:
  - `getSession()`: timeout 10 s; ante timeout o error devuelve `null` (no cuelga ni lanza).
  - `getCurrentUser()`: timeout 10 s; ante timeout o error devuelve `null`.
  - `signIn()`: errores de Supabase traducidos con `mapAuthErrorMessage` (ej. "Usuario o contraseña incorrectos", "No se pudo conectar al servidor").

- **components/AuthGuard.tsx**:
  - Timeout global de verificación: 12 s (antes 15 s), mensaje: "La verificación de sesión tardó demasiado. Intenta de nuevo."
  - Una sola llamada a `getSession()`; se usa `session.user` (se evita un segundo `getCurrentUser()`).
  - Perfil con timeout 8 s; si no hay perfil a tiempo se redirige a login con: "No se pudo cargar tu perfil. Intenta de nuevo."
  - Suscripción con timeout 5 s; si no responde a tiempo se asume activa para no bloquear.
  - Mensaje de carga: "Verificando sesión..." y "Cargando tu cuenta..." según la fase.
  - En catch se usa `mapAuthErrorMessage` y se redirige a `/login?error=...` con el mensaje adecuado.

---

## 2. Service Worker y caché

### Cambios en public/sw.js

- **Bypass (no cachear)** ampliado para no servir respuestas viejas de auth/API/sesión/perfil/empresa:
  - Ya existían: `/api/*`, Supabase, `auth.`, realtime, `/login`, `/session`, `/user`, `/profile`, `/auth`.
  - Añadidos: `/logout`, `/perfil`, `/perfiles`, `/permisos`, `/empresa`, `/empresas`, `/actualizar-contrasena`, `/recuperar-contrasena`.

Con esto se evita que el SW devuelva caché para login, logout, sesión, perfil, empresa o permisos.

---

## 3. Cliente Supabase y restauración de sesión

- **getSession / getCurrentUser** con timeout 10 s y fallback a `null`: si la red o el storage tardan (típico en PWA/Android), la app no se queda colgada y se redirige a login con mensaje claro.
- Ante cualquier error en getSession/getCurrentUser se devuelve `null` (no se lanza), para que el guard pueda redirigir a login en lugar de mostrar error genérico.
- No se añadieron reintentos infinitos; solo timeouts y un reintento explícito de perfil en login (ver abajo).

---

## 4. Perfil / empresa / sucursal

- **Login (app/login/page.tsx)**:
  - `getPerfilWithRetry()`: obtiene perfil con timeout 10 s; si falla o da null, invalida caché y reintenta una vez.
  - Mensajes de carga: "Conectando...", "Cargando tu cuenta...".
  - Consulta de empresa (status): timeout 4 s; si no responde se sigue (no se bloquea el login).
  - Errores mostrados al usuario: "No se pudo cargar tu perfil. Contacta al administrador.", etc., en lugar de genéricos.

- **CompaniaContext**:
  - Timeout de inicialización: 4 s (antes 5 s); al llegar al timeout se usa `compania_actual` de localStorage o null y se deja de cargar (no se bloquea la app).

- **AuthGuard**:
  - Si no hay perfil en 8 s se redirige a login con mensaje específico; no se espera indefinidamente.

---

## 5. Logs y mensajes de error

- **Login**: en desarrollo, logs de inicio de login, auth OK, perfil OK y redirección.
- **AuthGuard**: en desarrollo, logs de getSession y sesión OK; warning si perfil no disponible.
- **Mensajes al usuario** (reemplazo de genéricos):
  - Timeout login: "El servidor tardó en responder. Intenta de nuevo en unos segundos."
  - Timeout guard: "La verificación de sesión tardó demasiado. Intenta de nuevo."
  - Red: "No se pudo conectar al servidor. Comprueba tu conexión a internet e intenta de nuevo."
  - Sesión: "La sesión no pudo validarse. Inicia sesión de nuevo."
  - Perfil: "No se pudo cargar tu perfil. Intenta de nuevo." / "... Contacta al administrador."
  - Credenciales: "Usuario o contraseña incorrectos."
- **Página de login**: muestra el mensaje que viene en `?error=...` (por ejemplo tras redirección desde el guard).

---

## 6. Timeouts y fallbacks

| Paso | Timeout | Fallback |
|------|---------|----------|
| getSession | 10 s | null → redirect login |
| getCurrentUser | 10 s | null → redirect login |
| AuthGuard verificación total | 12 s | redirect login con mensaje |
| Perfil en AuthGuard | 8 s | redirect login "No se pudo cargar tu perfil..." |
| Suscripción en AuthGuard | 5 s | asumir activa (no bloquear) |
| Login total | 18 s | mensaje "El servidor tardó en responder..." |
| Perfil en login | 10 s + 1 reintento | error "No se pudo cargar tu perfil..." |
| Empresa (status) en login | 4 s | continuar (no bloquear) |
| CompaniaContext init | 4 s | localStorage o null |

---

## 7. Archivos modificados

| Archivo | Cambios |
|---------|---------|
| **lib/utils/authTimeout.ts** | Nuevo: withTimeout, isNetworkError, isSessionError, mapAuthErrorMessage |
| **lib/services/auth.ts** | Timeouts en getSession/getCurrentUser; mapAuthErrorMessage en signIn; getSession/getCurrentUser devuelven null ante error |
| **components/AuthGuard.tsx** | Timeouts 12 s + 8 s perfil; una sola getSession; mensajes de carga; mapAuthErrorMessage; timeout suscripción 5 s |
| **app/login/page.tsx** | getPerfilWithRetry; loadingStep; timeout empresa 4 s; mensajes específicos; lectura de ?error=; logs en dev |
| **public/sw.js** | Bypass ampliado: logout, perfil, perfiles, permisos, empresa, empresas, actualizar/recuperar-contrasena |
| **lib/contexts/CompaniaContext.tsx** | Timeout 4 s en init |
| **app/dashboard/page.tsx** | Mensaje de error de carga más específico |

---

## 8. Comportamiento esperado

- **Navegador**: el login sigue funcionando igual, con mensajes más claros y sin colgarse.
- **PWA/Android**:
  - Login más rápido: timeouts acotados y un reintento de perfil.
  - No depende de caché viejo: SW no cachea auth, API, login, session, perfil, empresa.
  - No falla por sesión corrupta: getSession/getCurrentUser devuelven null y se redirige a login con mensaje claro.
  - No falla por timeouts mal manejados: todos los pasos críticos tienen timeout y fallback.
  - No falla por Service Worker: rutas sensibles en bypass y SW actualizado (skipWaiting/clients.claim ya estaban).
  - No falla por restauración incorrecta de Supabase: timeouts y null evitan bloqueos.
  - No falla por falta de empresa/perfil a tiempo: timeouts y mensajes "Cargando tu cuenta..." o redirección con mensaje específico.

Si algo falla (red, perfil, empresa), el usuario ve un mensaje concreto y puede usar "¿Problemas al iniciar sesión? Limpiar datos y reintentar" para hacer un re-login limpio.
