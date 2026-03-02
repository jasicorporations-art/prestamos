# PR: Fix Login Web Lento vs App Rápida

## 1. Diagnóstico (Causa Raíz)

### Evidencia observada

- **Android (PWA/App)**: Login rápido (~1–2 s)
- **Web (navegadores)**: Login lento o que se queda cargando
- Mensaje en consola: `[CompaniaContext] Timeout inicializando compañía`

### Causas identificadas

1. **Fetches repetidos de perfil**  
   `getPerfilActual()` se llamaba varias veces tras el login:
   - En `onSubmit` del login
   - En `CompaniaContext.onAuthStateChange`
   - En `AuthGuard.checkAuth`
   - Cada llamada hacía `getUser()` + `from('perfiles').select()`

2. **Orden subóptimo en CompaniaContext**  
   Siempre se llamaba a `getPerfilActual()` aunque `user_metadata.compania` ya tuviera el valor.

3. **Sin guard de timeout**  
   Si `getPerfilActual()` o RLS se colgaban, el login podía quedar indefinidamente en “Iniciando sesión...”.

4. **Sin instrumentación**  
   No había forma de medir tiempos ni ver dónde se bloqueaba el flujo.

### Flujo App vs Web

| Paso | App (Android) | Web |
|------|---------------|-----|
| signInWithPassword | Rápido (secure storage) | Rápido |
| Persistencia sesión | Native storage | localStorage/cookies |
| getPerfilActual | 1 vez, cache nativo | Varias veces, sin cache |
| CompaniaContext | Menos listeners | Varios listeners |
| RLS / rest/v1 | Mismo backend | Mismo backend |

La diferencia principal está en el número de llamadas a perfil y en la falta de cache en web.

---

## 2. Cambios realizados

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `lib/utils/authInstrumentation.ts` | **Nuevo**. Trazas de tiempos en dev (clickLogin, signInResolved, perfilFetched, etc.) |
| `lib/services/perfiles.ts` | Cache en memoria de perfil por `user_id`, invalidación en signOut |
| `lib/services/auth.ts` | Llamada a `invalidatePerfilCache()` en `signOut` |
| `lib/contexts/CompaniaContext.tsx` | Uso de metadata antes de perfil, invalidación de cache en SIGNED_OUT, instrumentación |
| `app/login/page.tsx` | Instrumentación, timeout 25 s, botón Reintentar, uso de cache de perfil |
| `lib/utils/compania.ts` | Ya tenía timeout 6 s en `getCompaniaActualOrFromPerfil` |

### Resumen de cambios

1. **Cache de perfil**  
   - `perfilCache: { userId, perfil }` en `perfilesService`  
   - Se rellena en `getPerfilActual()`  
   - Se invalida en `signOut` y en `SIGNED_OUT`

2. **Optimización CompaniaContext**  
   - Si existe `user_metadata.compania`, se usa directamente sin llamar a `getPerfilActual()`

3. **Instrumentación**  
   - En dev: logs `[AuthTrace]` con tiempos desde click hasta redirect

4. **Guard de timeout**  
   - Timeout de 25 s en login  
   - Mensaje de error + botón “Reintentar”

---

## 3. Cómo probar

### Pasos exactos

1. **DevTools abierto (F12)**  
   - Pestaña Console  
   - Pestaña Network (opcional, para ver `/auth/v1` y `rest/v1/*`)

2. **Login en web**  
   - Ir a `/login`  
   - Escribir email y contraseña  
   - Pulsar “Iniciar Sesión”  
   - Observar en consola (solo en dev):
     ```
     [AuthTrace] clickLogin: +0ms
     [AuthTrace] signInRequest: +Xms
     [AuthTrace] signInResolved: +Yms
     [AuthTrace] perfilFetched: +Zms
     [AuthTrace] onAuthStateChangeSignedIn: +Wms
     [AuthTrace] uiRedirect: +Vms
     [AuthTrace] === RESUMEN === { ... totalMs: N }
     ```

3. **Verificación en distintos entornos**  
   - Chrome, Edge, Firefox  
   - Modo incógnito  
   - Localhost y producción (dominio real)

4. **Timeout**  
   - Simular red lenta (DevTools → Network → Slow 3G)  
   - Comprobar que tras ~25 s aparece el mensaje de error y el botón “Reintentar”

---

## 4. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Cache desactualizado si cambia perfil en otra pestaña | Cache se invalida en SIGNED_OUT; sesión única por usuario |
| Timeout demasiado corto en redes lentas | 25 s es conservador; se puede subir si hace falta |
| Instrumentación en producción | Solo activa con `NODE_ENV=development` |
| Múltiples listeners `onAuthStateChange` | Cada uno hace `unsubscribe` en cleanup; no hay duplicados problemáticos |

---

## 5. Checklist de validación post-fix

- [ ] Login en Chrome < 5 s (red normal)
- [ ] Login en Edge y Firefox correcto
- [ ] Login en modo incógnito correcto
- [ ] No hay bucles de requests en Network
- [ ] No hay errores de CORS ni cookies en Console
- [ ] Timeout + Reintentar funcionan con red lenta
- [ ] Logout limpia cache (no se reutiliza perfil de sesión anterior)
- [ ] Producción: mismo flujo que en localhost
- [ ] RLS intacto (sin `service_role` en cliente)
- [ ] Tokens solo en storage seguro (localStorage/cookies de Supabase)
