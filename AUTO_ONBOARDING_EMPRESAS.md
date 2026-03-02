# Auto-Onboarding de Empresas y Sucursales

## Resumen

Al registrar una nueva empresa, el sistema crea automáticamente una sucursal principal y redirige al usuario directamente al Dashboard, sin pasar por pantallas de configuración.

## Funcionalidad implementada

### 1. Trigger de registro
- Al insertar un registro en la tabla `empresas`, se dispara automáticamente la función `crear_sucursal_principal_on_empresa_insert`.

### 2. Clonación de datos → Sucursal Principal
- **nombre**: Nombre de la compañía + '(Principal)'
- **direccion**: Dirección proporcionada en el registro
- **telefono**: Teléfono proporcionado en el registro  
- **empresa_id**: ID de la empresa recién creada
- **activa**: `true` (sucursal activa por defecto)

### 3. Configuración por defecto
- La sucursal se crea como activa (`activa = true`)
- El perfil del Admin se crea con `sucursal_id` asignado a la sucursal principal

### 4. Flujo de usuario
- Tras el registro exitoso, el usuario es redirigido al **Dashboard** (no al login ni a configuración)
- La compañía se guarda en el contexto y el usuario puede operar inmediatamente

### 5. Rollback en errores
- Si la creación de la sucursal falla, el INSERT en `empresas` se revierte automáticamente (transacción)
- Evita cuentas huérfanas sin sucursales

---

## Pasos para activar

### 1. Ejecutar el script SQL en Supabase

En el **SQL Editor** de tu proyecto Supabase, ejecuta el contenido completo de:

```
supabase/auto-onboarding-empresa-sucursal.sql
```

Este script:
- Agrega las columnas `direccion` y `telefono` a la tabla `empresas` (si no existen)
- Crea la función `crear_sucursal_principal_on_empresa_insert`
- Crea el trigger `on_empresa_created_crear_sucursal_principal` en la tabla `empresas`

### 2. Verificación

Tras ejecutar el script:
- Nuevos registros en `/register` crearán automáticamente la sucursal principal
- El usuario será redirigido al Dashboard con su sucursal ya asignada

---

## Cambios en el código

| Archivo | Cambio |
|---------|--------|
| `lib/services/empresas.ts` | `registrarEmpresa` ahora acepta `direccion` y `telefono` |
| `app/register/page.tsx` | Pasa dirección y teléfono; asigna `sucursal_id` al perfil; redirige a Dashboard |
| `supabase/auto-onboarding-empresa-sucursal.sql` | Nuevo script con trigger y función |

---

## Configuración automática de Ruta A

Tras crear la sucursal principal, se crea automáticamente una **Ruta A** (ver `supabase/auto-onboarding-ruta-a.sql`). Ejecuta ese script en Supabase para activar:

- Cada sucursal nueva tendrá una "Ruta A" lista para cobranza
- Los nuevos préstamos se asignan por defecto a la Ruta A
- Puedes editar el nombre de la ruta en Admin → Rutas (ej: "Ruta Centro", "Cobranza Norte")

---

## Empresas existentes

Las empresas registradas **antes** de ejecutar este script no tienen sucursal automática. Deberán crear su sucursal manualmente desde **Admin → Sucursales**.
