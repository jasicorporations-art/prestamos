# Guía: Base de datos para 3 PWAs (electro, dealer, prestamos)

## Orden de ejecución en Supabase SQL Editor

### Si la base está **vacía** (recién creada)

1. **Ejecutar primero** el esquema base completo (01 a 14 de tu código) en este orden:
   - 01 - ESQUEMA BASE (motores, clientes, ventas, pagos)
   - 02 - EMPRESAS
   - 03 - SUCURSALES, PERFILES, ACTIVIDAD
   - 04 - TÉRMINOS Y LEGAL
   - 05 - TRIGGER handle_new_user
   - 06 - CAMPOS ADICIONALES
   - 07 - COMPANIA_ID Y APP_ID
   - 08 - GEOLOCALIZACIÓN
   - 09 - RUTAS DE COBRO
   - 10 - CAJAS Y TESORERÍA
   - 11 - CUOTAS DETALLADAS
   - 12 - WHATSAPP
   - 13 - OTRAS TABLAS
   - 14 - FUNCIONES Y RLS (solo get_user_empresa_id y verificar_empresa_disponible)

2. **Ejecutar después** el script maestro:
   ```
   supabase/EJECUTAR_MULTI_PWA_MASTER.sql
   ```

### Si la base **ya tiene** tablas creadas (solo necesitas corregir)

Ejecuta **solo** el script maestro:
```
supabase/EJECUTAR_MULTI_PWA_MASTER.sql
```

**Nota:** Si al ejecutar el maestro aparece error de `rutas` no existe, ejecuta primero la sección 09 (Rutas de Cobro) de tu esquema base y luego vuelve a ejecutar el maestro.

---

## Qué hace el script maestro

| Sección | Descripción |
|---------|-------------|
| 1 | Función `is_super_admin()` para evitar recursión en RLS |
| 2 | RLS de perfiles: propio perfil, empresa, super_admin |
| 3 | Columna `ruta_id` en perfiles (Mi Ruta de Hoy) |
| 4 | Quitar constraint de rol (permite super_admin) |
| 5 | Crear/actualizar perfiles super_admin (johnrijo6@gmail.com, admin@jasicorporations.com) |
| 6 | Trigger `handle_new_user` mejorado (primer usuario = Admin, soporta app_id) |
| 7 | Rellenar `app_id` solo donde es NULL (no sobrescribe datos existentes) |
| 8 | Cajas: empresa_id, app_id, RLS deshabilitado |
| 9 | actividad_logs: políticas para empresa y super_admin |

---

## Configuración por PWA

Cada PWA debe tener en su `.env`:

| PWA | NEXT_PUBLIC_APP_ID |
|-----|---------------------|
| Electro | `electro` |
| Dealer | `dealer` |
| Préstamos | `prestamos` |

Al registrar usuarios, la app debe enviar `app_id` en `user_metadata` para que el trigger asigne el perfil correcto.

---

## Scripts que **NO** debes ejecutar

- ❌ `ALTER TABLE perfiles DISABLE ROW LEVEL SECURITY` — deja la tabla sin protección
- ❌ `UPDATE ... SET app_id = 'electro'` en todas las filas — sobrescribe datos de las otras PWAs
- ❌ El bloque que asigna `rol = 'Admin'` a un `user_id` fijo (`b4f8db56-...`) — usa el trigger en su lugar

---

## Verificación

Después de ejecutar, comprueba:

```sql
-- Super admins
SELECT u.email, p.rol, p.app_id 
FROM auth.users u
LEFT JOIN perfiles p ON p.user_id = u.id
WHERE u.email IN ('johnrijo6@gmail.com', 'admin@jasicorporations.com');
```

Debe mostrar `rol = super_admin` y `app_id = NULL` (acceso a todas las apps).
