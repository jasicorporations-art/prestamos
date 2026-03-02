# Diagnóstico: Loading Infinito en Web

## 1. Causa raíz

### Request que se queda colgado

El loading infinito ocurre cuando:

1. **CompaniaContext tarda** – `getPerfilActual()` o `getSession()` se bloquean → `companiaLoading` no pasa a `false` hasta el timeout (5–8 s).
2. **Queries sin DataGate** – El dashboard (y otras páginas) ejecutan `loadData()` cuando `!companiaLoading`, pero **no comprueban si `compania` existe**. Si `compania` es `null` (perfil sin `empresa_id`, timeout, etc.):
   - `ventasService.getAll()` usa `getCompaniaActual()` que devuelve `null`
   - La query se ejecuta sin filtro `empresa_id`
   - RLS con `get_user_empresa_id()` devuelve `NULL` → políticas bloquean o devuelven vacío
   - La UI puede quedar en loading si hay errores no manejados o estados inconsistentes
3. **AuthGuard sin timeout** – Si `checkAuth` se bloquea (p. ej. `getPerfilActual` o `subscriptionService.isActive()`), el spinner de “Verificando autenticación” no termina nunca.
4. **Errores 401/403/406 sin manejo** – Si la query falla por sesión, RLS o `.single()` sin filas, el error no se muestra y la UI sigue en loading.

### Flujo problemático

```
App mount → CompaniaContext init → getSession() → getPerfilActual() [LENTO/BLOQUEADO]
         → AuthGuard checkAuth → getSession() → getCurrentUser() → getPerfilActual() [DUPLICADO]
         → Dashboard useEffect → !companiaLoading → loadData() [PERO compania puede ser null]
         → ventasService.getAll() con compania=null → RLS/get_user_empresa_id() → bloqueo o vacío
         → loading nunca se pone false si hay error no capturado
```

---

## 2. Cambios realizados

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `lib/utils/authInstrumentation.ts` | `dataTraceStart`, `dataTraceEnd`, `logRequest` para carga de datos |
| `app/dashboard/page.tsx` | DataGate (solo loadData si `compania` o `esSuperAdmin`), manejo 401/403/406, UI “No empresa asignada” |
| `lib/contexts/CompaniaContext.tsx` | Timeout 5 s, fast path sin sesión, menos bloqueos |
| `components/AuthGuard.tsx` | Timeout 15 s en `checkAuth` para evitar loading infinito |

### Resumen

1. **DataGate** – El dashboard solo llama a `loadData()` cuando `compania` existe o el usuario es `super_admin`.
2. **UI “No empresa asignada”** – Si `companiaLoading=false` y `compania=null` (y no es super_admin), se muestra mensaje claro en lugar de loading.
3. **Manejo de errores** – 401 → “Sesión expirada”, 403 → “Sin permiso”, 406 → “Datos no encontrados / perfil sin empresa”.
4. **Timeouts** – AuthGuard 15 s, CompaniaContext 5 s.
5. **Instrumentación** – En dev: `[DataTrace]` con tiempos de carga.

---

## 3. Cómo probar (pasos exactos en web)

1. **Login y dashboard**
   - Ir a `/login`, iniciar sesión
   - Debe redirigir a `/dashboard`
   - En < 5 s debe verse el resumen (o error explícito)

2. **Consola (F12)**
   - En dev deberían aparecer logs `[DataTrace]` con tiempos
   - Revisar Network: `/auth/v1`, `rest/v1/*` – sin bucles ni requests repetidos

3. **Perfil sin empresa**
   - Usuario con `empresa_id` null en `perfiles`
   - Debe mostrarse “No tienes empresa asignada” (no loading infinito)

4. **Red lenta**
   - DevTools → Network → Slow 3G
   - Debe aparecer timeout o error con “Reintentar” en ~25 s

5. **Cookies bloqueadas**
   - Bloquear cookies de terceros
   - Debe mostrarse error de sesión, no loading infinito

---

## 4. Edge cases y mitigaciones

| Caso | Comportamiento | Mitigación |
|------|----------------|------------|
| Perfil sin `empresa_id` | “No empresa asignada” | Verificar trigger `handle_new_user_perfil` o backfill en registro |
| `empresa_id` null | Mismo mensaje | Seed/trigger que asigne empresa al crear perfil |
| Cookies bloqueadas | Error de sesión | Supabase usa localStorage por defecto; revisar `site_url` y `redirect_urls` |
| RLS bloqueando | Error 403 con mensaje | Revisar políticas y `get_user_empresa_id()` |
| `.single()` sin filas (406) | Mensaje “Datos no encontrados” | Usar `.maybeSingle()` donde aplique |
| Timeout CompaniaContext | Fallback a localStorage | Reducido a 5 s |
| Timeout AuthGuard | Redirect a login con error | 15 s |
| Timeout loadData | “Tiempo de espera agotado” + Reintentar | 25 s |

---

## 5. Patrón para otras páginas (clientes, ventas, pagos)

Aplicar el mismo DataGate donde se use `useCompania()`:

```tsx
// Antes (puede cargar con compania null)
useEffect(() => {
  if (!companiaLoading) loadData()
}, [companiaLoading, compania])

// Después (DataGate)
useEffect(() => {
  if (companiaLoading) return
  if (!compania) {
    setLoading(false)
    return
  }
  loadData()
}, [companiaLoading, compania])
```

Y añadir UI para “No empresa asignada” cuando `!compania && !companiaLoading`.
