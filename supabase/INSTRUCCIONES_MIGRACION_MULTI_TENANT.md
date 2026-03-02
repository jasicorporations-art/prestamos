# Migración Multi-Tenant: UUID y RLS

## Problema
Los clientes y préstamos no se visualizan en las 3 PWA debido a:
- Inconsistencia entre `empresa_id` (UUID) y `compania_id` (a veces nombre)
- RLS con `app_id` hardcodeado (`'electro'`)
- `get_user_empresa_id()` no resolvía nombres a UUID

## Solución

### 1. Ejecutar la migración
En **Supabase → SQL Editor**, ejecuta:
```
supabase/migracion-multi-tenant-uuid-rls.sql
```

**Si hay deadlock**, ejecuta cada parte por separado (en orden):
1. `migracion-multi-tenant-PARTE-1.sql` (columnas y funciones)
2. `migracion-multi-tenant-PARTE-2.sql` (backfill de datos)
3. `migracion-multi-tenant-PARTE-3.sql` (RLS e índices)

Antes de ejecutar: cierra la app y pestañas que usen la base de datos para reducir conexiones activas.

### 2. Cambios aplicados

| Aspecto | Antes | Después |
|---------|-------|---------|
| **empresa_id** | VARCHAR, podía ser nombre o UUID | TEXT con UUID (resuelve nombre→id) |
| **get_user_empresa_id()** | Devolvía valor crudo del perfil | Resuelve nombre a UUID de `empresas` |
| **RLS pagos** | `app_id = 'electro'` hardcodeado | Solo filtra por `empresa_id` (app_id en capa app) |
| **super_admin** | Sin política explícita | Política que permite ver todo |

### 3. Filtros en la aplicación
La app ya aplica correctamente:
- **empresa_id/compania_id**: `withAppIdFilter` + `orEmpresaCompania` en servicios
- **app_id**: `withAppIdFilter` en cada query (NEXT_PUBLIC_APP_ID)

### 4. Campos de ventas
- `monto_total`: Monto total del préstamo
- `saldo_pendiente`: Saldo por cobrar (se usa para filtrar activos)

### 5. Verificación post-migración
```sql
-- Ver empresa del usuario actual (ejecutar como usuario autenticado)
SELECT get_user_empresa_id();

-- Verificar datos
SELECT id, nombre_completo, empresa_id, app_id FROM clientes LIMIT 5;
SELECT id, numero_prestamo, empresa_id, app_id FROM ventas LIMIT 5;
```

### 6. Si un perfil tiene empresa por nombre
La función `resolve_empresa_uuid()` convierte automáticamente:
- `empresas.nombre` → `empresas.id` (UUID)
- Si ya es UUID, lo devuelve tal cual
