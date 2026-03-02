# Persistencia de sesión en Web

## Problema

En web no existía persistencia de sesión:
- `Object.keys(localStorage).filter(k => k.includes('sb-') && k.includes('auth'))` => `[]`
- `auth.uid()` y `get_user_empresa_id()` devolvían null
- RLS bloqueaba y "desaparecían" clientes/ventas/motores
- Android sí persistía sesión y funcionaba correctamente

## Cambios realizados

### 1. Cliente Supabase (lib/supabase.ts)

- **Antes**: `createBrowserClient` de `@supabase/ssr` (usa cookies por defecto)
- **Ahora**: `createClient` de `@supabase/supabase-js` con **localStorage** explícito

Configuración auth:
```ts
auth: {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  storageKey: 'sb-auth',
  storage: typeof window !== 'undefined' ? window.localStorage : undefined
}
```

- **Singleton**: un solo cliente para toda la app
- **SSR**: en server (`window === undefined`) se crea cliente sin persistencia para evitar errores

### 2. SupabaseAuthProvider (lib/contexts/SupabaseAuthProvider.tsx)

- **Boot**: `await supabase.auth.getSession()` al montar
- **onAuthStateChange**: suscripción para rehidratar sesión
- **Cache**: limpia `jasi_clientes_cache_*` cuando no hay sesión o cambia usuario

### 3. Layout (app/layout.tsx)

- `SupabaseAuthProvider` envuelve `CompaniaProvider` y `AuthGuard`
- Orden: `SupabaseAuthProvider` → `CompaniaProvider` → `AuthGuard` → `ConditionalLayout`

### 4. Logs de diagnóstico (solo en development)

- `[Supabase] Cliente creado | storage: localStorage | key: sb-auth | projectRef: xxx`
- `[SupabaseAuth] boot getSession: { hasSession, userId, error }`
- `[SupabaseAuth] onAuthStateChange: { event, hasSession }`
- `[Supabase] clientes getAll: { status, message, hint }` (ejemplo en clientes)

### 5. Limpieza de cache (lib/utils/swCleanup.ts)

- `jasi_clientes_cache` añadido a claves que se limpian en `ejecutarLimpiezaSesion()` (signOut)
- `SupabaseAuthProvider` limpia cache cuando `onAuthStateChange` indica sesión cerrada

### 6. Verificar misma config que Android

En desarrollo, la consola muestra `projectRef` (ej: `kpqvzkgsbawfqdsxjdjc`). Verifica que web y Android usen:
- Mismo `NEXT_PUBLIC_SUPABASE_URL`
- Mismo `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Verificación

Tras login en web:
```js
// En consola del navegador
Object.keys(localStorage).filter(k => k.includes('sb-') || k.includes('auth'))
// Debería incluir 'sb-auth' o similar
```

## Nota sobre API routes

Las API routes usan `createClientFromRequest` que lee **cookies**. Con el cliente en localStorage, las cookies no tendrán la sesión. Las llamadas directas a Supabase desde el cliente (`supabase.from()`) sí funcionan porque usan el JWT de localStorage. Si alguna API route necesita la sesión del usuario, habría que pasar el token vía header `Authorization`.
