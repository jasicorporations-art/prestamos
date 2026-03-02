# Sistema Multiusuario y Sucursales - DEALERS JASICORPORATIONS

## 📋 Descripción General

Se ha implementado un sistema completo de multiusuarios y sucursales que permite:

1. **Búsqueda Global de Clientes**: Cualquier sucursal puede buscar y ver clientes creados en otras sucursales
2. **Gestión Multi-sucursal de Créditos**: Ver todos los créditos de un cliente sin importar la sucursal
3. **Pagos Multi-sucursal**: Cualquier sucursal puede registrar pagos con metadatos completos
4. **Alertas de Créditos Activos**: Aviso visual cuando un cliente ya tiene crédito activo
5. **Historial de Actividad**: Logs completos de todas las acciones realizadas por usuarios

## 🚀 Pasos para Implementar

### Paso 1: Ejecutar Script SQL

1. **Abre Supabase Dashboard**:
   - Ve a tu proyecto en Supabase: https://app.supabase.com
   - Navega a **SQL Editor**

2. **Ejecuta el Script SQL**:
   - Copia el contenido del archivo `supabase/multiusuario-sucursales.sql`
   - Pégalo en el SQL Editor
   - Haz clic en **"Run"** para ejecutarlo
   - Verifica que se ejecutó correctamente (debe mostrar "Success")

### Paso 2: Crear Sucursales

Después de ejecutar el script SQL, necesitas crear las sucursales de tu empresa:

1. **Desde Supabase SQL Editor**, ejecuta:

```sql
-- Ejemplo: Crear sucursales
-- Reemplaza los valores con los de tu empresa

INSERT INTO sucursales (nombre, direccion, telefono, empresa_id, activa)
VALUES 
  ('Sucursal Norte', 'Dirección Norte', '(809) 123-4567', 'TU_EMPRESA_ID', true),
  ('Sucursal Sur', 'Dirección Sur', '(809) 234-5678', 'TU_EMPRESA_ID', true),
  ('Sucursal Centro', 'Dirección Centro', '(809) 345-6789', 'TU_EMPRESA_ID', true);
```

**Nota**: Reemplaza `'TU_EMPRESA_ID'` con el ID de tu empresa actual (puedes obtenerlo desde `localStorage.getItem('compania_actual')` en la consola del navegador).

### Paso 3: Crear Perfiles de Usuarios

Para cada usuario, necesitas crear un perfil con su rol y sucursal:

1. **Obtener el User ID del usuario**:
   - Ve a Supabase Dashboard > Authentication > Users
   - Copia el UUID del usuario

2. **Crear el perfil**:

```sql
-- Ejemplo: Crear perfil para un usuario
-- Reemplaza los valores

INSERT INTO perfiles (user_id, nombre_completo, rol, sucursal_id, empresa_id, activo)
VALUES 
  (
    'UUID_DEL_USUARIO',  -- Reemplaza con el UUID del usuario
    'Nombre Completo del Usuario',
    'Admin',  -- o 'Vendedor'
    'UUID_DE_LA_SUCURSAL',  -- Reemplaza con el UUID de la sucursal
    'TU_EMPRESA_ID',
    true
  );
```

### Paso 4: Verificar Funcionalidad

1. **Búsqueda Global de Clientes**:
   - Inicia sesión como cualquier usuario
   - Ve a la página de Clientes
   - Verifica que puedes buscar y ver clientes de cualquier sucursal

2. **Perfil de Cliente**:
   - Haz clic en el icono de carpeta junto a un cliente
   - Verifica que se muestran TODOS sus créditos (activos y finalizados)
   - Cada crédito debe mostrar la sucursal donde se originó

3. **Alerta de Crédito Activo**:
   - Ve a Emitir Financiamiento
   - Selecciona un cliente que ya tenga un crédito activo
   - Debe aparecer una alerta roja indicando el saldo pendiente

4. **Registro de Pagos**:
   - Registra un pago desde cualquier sucursal
   - El pago debe guardar automáticamente:
     - Usuario que cobró
     - Sucursal donde se cobró
     - Fecha y hora exacta

5. **Historial de Actividad** (Solo Admin):
   - Inicia sesión como Admin
   - Debe aparecer el enlace "Historial" en la navegación
   - Verifica que se registran las actividades:
     - Creación de clientes
     - Emisión de créditos
     - Registro de pagos

## 📊 Estructura de Datos

### Nuevas Tablas Creadas:

1. **`sucursales`**: Almacena información de las sucursales
   - `id`, `nombre`, `direccion`, `telefono`, `empresa_id`, `activa`

2. **`perfiles`**: Perfiles de usuarios con roles y sucursales
   - `id`, `user_id`, `nombre_completo`, `rol` (Admin/Vendedor), `sucursal_id`, `empresa_id`

3. **`actividad_logs`**: Historial de actividad del sistema
   - `id`, `usuario_id`, `usuario_nombre`, `sucursal_id`, `sucursal_nombre`, `accion`, `detalle`, `fecha_hora`

### Campos Agregados a Tablas Existentes:

- **`clientes`**: `empresa_id`, `sucursal_id`
- **`ventas`**: `empresa_id`, `sucursal_id`
- **`pagos`**: `empresa_id`, `sucursal_id`, `usuario_que_cobro`, `sucursal_donde_se_cobro`, `fecha_hora`

## 🔐 Roles y Permisos

- **Admin**: 
  - Acceso completo al sistema
  - Puede ver el Historial de Actividad
  - Puede ver todas las sucursales

- **Vendedor**:
  - Acceso estándar
  - Puede crear clientes, emitir créditos, registrar pagos
  - Ve todos los clientes y créditos (búsqueda global)
  - No tiene acceso al Historial de Actividad

## ⚠️ Notas Importantes

1. **Migración de Datos Existentes**:
   - El script SQL intenta migrar automáticamente los datos existentes usando `compania_id`
   - Si tienes datos existentes, verifica que se migraron correctamente

2. **Retrocompatibilidad**:
   - El sistema mantiene soporte para `compania_id` mientras se migra completamente
   - Funciona con `empresa_id` (nuevo) y `compania_id` (legacy)

3. **Búsqueda Global**:
   - La búsqueda de clientes NO filtra por sucursal, pero SÍ filtra por empresa
   - Esto permite que cualquier sucursal vea clientes de otras sucursales de la misma empresa

4. **Historial de Actividad**:
   - Se registra automáticamente cuando se crean clientes, se emiten créditos y se registran pagos
   - Solo los Administradores pueden ver el historial completo

## 🐛 Solución de Problemas

### Error: "La columna empresa_id no existe"
- **Solución**: Ejecuta el script SQL `multiusuario-sucursales.sql` en Supabase

### Error: "Usuario no tiene perfil"
- **Solución**: Crea un perfil para el usuario en la tabla `perfiles` (ver Paso 3)

### No se muestran los créditos de otras sucursales
- **Solución**: Verifica que `getByCliente` en `ventasService` no esté filtrando por sucursal

### El Historial no aparece en la navegación
- **Solución**: Verifica que el usuario tiene rol `'Admin'` en la tabla `perfiles`

### Los pagos no guardan metadatos
- **Solución**: Verifica que el script SQL se ejecutó correctamente y que las columnas existen en la tabla `pagos`

## ✅ Checklist de Implementación

- [ ] Script SQL ejecutado correctamente
- [ ] Sucursales creadas
- [ ] Perfiles de usuarios creados (al menos uno con rol Admin)
- [ ] Búsqueda global de clientes funciona
- [ ] Perfil de cliente muestra créditos multi-sucursal
- [ ] Alerta de crédito activo funciona
- [ ] Pagos guardan metadatos correctamente
- [ ] Historial de actividad visible para Admin
- [ ] Registro de actividades funciona correctamente

---

**¡Sistema Multiusuario y Sucursales implementado con éxito!** 🎉

