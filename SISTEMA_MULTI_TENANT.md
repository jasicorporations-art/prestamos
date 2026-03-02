# Sistema Multi-Tenant - Gestión de Préstamos

Este sistema permite que múltiples compañías de préstamos utilicen la misma aplicación de forma independiente. Cada compañía solo puede ver y gestionar sus propios datos.

## Características

- **Selección de Compañía en Login**: Los usuarios deben seleccionar su compañía al iniciar sesión
- **Validación de Compañía**: El sistema valida que el usuario pertenezca a la compañía seleccionada
- **Filtrado Automático**: Todos los datos (clientes, préstamos, ventas, pagos) se filtran automáticamente por compañía
- **Aislamiento de Datos**: Cada compañía solo ve sus propios datos

## Configuración Inicial

### 1. Ejecutar Scripts SQL en Supabase

Ejecuta los siguientes scripts en el orden indicado en el SQL Editor de Supabase:

#### a) Agregar campo `compania_id` a todas las tablas
```sql
-- Ejecutar: supabase/agregar-compania-id.sql
```
Este script agrega el campo `compania_id` a las tablas:
- `clientes`
- `motores` (préstamos)
- `ventas`
- `pagos`

#### b) Crear función para obtener compañías disponibles
```sql
-- Ejecutar: supabase/funcion-obtener-companias.sql
```
Esta función permite obtener todas las compañías únicas de los usuarios registrados.

### 2. Registro de Usuarios

Cuando un usuario se registra en `/register`, debe proporcionar:
- Nombre de la compañía
- Sus datos personales
- Email y contraseña

La compañía se guarda en `user_metadata.compania` del usuario en Supabase Auth.

## Uso del Sistema

### Inicio de Sesión

1. El usuario accede a `/login`
2. **Selecciona su compañía** del menú desplegable (o la escribe si no aparece)
3. Ingresa su email y contraseña
4. El sistema valida que el usuario pertenezca a la compañía seleccionada
5. Si la validación es exitosa, se guarda la compañía en el contexto y el usuario puede acceder

### Funcionamiento Automático

Una vez que el usuario inicia sesión:
- Todos los clientes mostrados pertenecen a su compañía
- Todos los préstamos mostrados pertenecen a su compañía
- Todas las ventas mostradas pertenecen a su compañía
- Todos los pagos mostrados pertenecen a su compañía

### Creación de Nuevos Registros

Cuando se crea un nuevo registro (cliente, préstamo, venta, pago):
- El sistema automáticamente asigna el `compania_id` del usuario actual
- No es necesario especificar manualmente la compañía

## Estructura de Datos

### Campo `compania_id`

El campo `compania_id` es un `VARCHAR(255)` que almacena el nombre de la compañía. Se usa para:
- Filtrar consultas en todas las tablas
- Asegurar que los datos estén aislados por compañía
- Validar que los usuarios solo accedan a datos de su compañía

### Índices

Se han creado índices en `compania_id` para mejorar el rendimiento:
- `idx_clientes_compania`
- `idx_motores_compania`
- `idx_ventas_compania`
- `idx_pagos_compania`

## Triggers Automáticos

El sistema incluye triggers que:
- Actualizan automáticamente `compania_id` en `pagos` cuando se crea o actualiza una `venta`
- Actualizan automáticamente `compania_id` en `pagos` cuando se inserta un nuevo `pago`

## Seguridad

- Los usuarios solo pueden iniciar sesión si su compañía coincide con la seleccionada
- Todas las consultas filtran automáticamente por `compania_id`
- Los datos están completamente aislados entre compañías
- Al cerrar sesión, se limpia la información de la compañía

## Notas Importantes

1. **Migración de Datos Existentes**: Si ya tienes datos en la base de datos, necesitarás actualizar los registros existentes con `compania_id`. Puedes hacerlo manualmente o crear un script de migración.

2. **Nombres de Compañía**: Los nombres de compañía deben ser consistentes. Se recomienda usar el mismo nombre exacto al registrar usuarios de la misma compañía.

3. **Función RPC**: La función `obtener_companias_disponibles()` requiere permisos `SECURITY DEFINER` para acceder a la tabla `auth.users`. Asegúrate de que los permisos estén configurados correctamente.

## Solución de Problemas

### Las compañías no aparecen en el login

1. Verifica que la función `obtener_companias_disponibles()` esté creada en Supabase
2. Verifica que los usuarios tengan `compania` en su `user_metadata`
3. Si no aparece ninguna compañía, el sistema permite escribir la compañía manualmente

### Error "El usuario no pertenece a la compañía seleccionada"

- Verifica que el nombre de la compañía en `user_metadata.compania` coincida exactamente con el nombre seleccionado
- Los nombres son case-sensitive (distingue mayúsculas y minúsculas)

### Los datos no se filtran correctamente

- Verifica que el campo `compania_id` esté presente en todas las tablas
- Verifica que los índices estén creados
- Revisa la consola del navegador para errores



