# Configurar Empresas Únicas por Usuario

## 📋 Objetivo

Garantizar que:
- ✅ Cada usuario tenga un **único correo** (ya implementado por Supabase Auth)
- ✅ Cada usuario tenga una **única empresa** (ya implementado)
- ✅ Cada empresa solo pueda pertenecer a **UN usuario** (requiere ejecutar scripts SQL)

## 🔧 Pasos para Configurar

### 1. Crear Tabla de Empresas

Ejecuta el script `supabase/crear-tabla-empresas.sql` en el SQL Editor de Supabase:

```sql
-- Este script crea la tabla empresas con:
-- - Campo nombre UNIQUE (garantiza que no haya duplicados)
-- - Campo user_id (asocia la empresa a un usuario)
-- - Row Level Security (RLS) para seguridad
```

**Pasos:**
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Copia y pega el contenido de `supabase/crear-tabla-empresas.sql`
5. Haz clic en **Run**

### 2. Crear Función de Verificación

Ejecuta el script `supabase/funcion-verificar-empresa-disponible.sql` en el SQL Editor:

```sql
-- Esta función verifica si una empresa ya está registrada:
-- 1. Busca en la tabla empresas
-- 2. Busca en user_metadata de auth.users
-- Retorna TRUE si está disponible, FALSE si ya existe
```

**Pasos:**
1. En el mismo SQL Editor
2. Copia y pega el contenido de `supabase/funcion-verificar-empresa-disponible.sql`
3. Haz clic en **Run**

## ✅ Verificación

Después de ejecutar los scripts:

1. **Intenta registrar una cuenta** con un nombre de empresa nuevo → Debe funcionar ✅
2. **Intenta registrar otra cuenta** con el mismo nombre de empresa → Debe fallar con mensaje: "Esta empresa ya está registrada por otro usuario" ❌
3. **Inicia sesión** con una cuenta existente → Solo debe mostrar los datos de tu empresa ✅

## 🔒 Seguridad Implementada

### Nivel de Base de Datos:
- ✅ Campo `nombre` con restricción `UNIQUE` en tabla `empresas`
- ✅ Row Level Security (RLS) activado
- ✅ Políticas que solo permiten ver/insertar tu propia empresa

### Nivel de Aplicación:
- ✅ Validación antes de registrar (verifica en tabla y user_metadata)
- ✅ Login solo permite acceder a tu propia empresa
- ✅ Todos los datos se filtran por `compania_id`
- ✅ Validación en `getById` para todos los servicios

## 📝 Notas Importantes

1. **Si la tabla `empresas` no existe:**
   - El sistema seguirá funcionando (compatibilidad hacia atrás)
   - Pero la validación de unicidad será menos estricta
   - Se recomienda ejecutar los scripts para garantizar la seguridad completa

2. **Si la función RPC no existe:**
   - El sistema usará el método alternativo (solo tabla empresas)
   - Funciona, pero es menos completo
   - Se recomienda ejecutar ambos scripts

3. **Usuarios existentes:**
   - Los usuarios que ya se registraron antes de crear la tabla seguirán funcionando
   - Sus empresas se registrarán automáticamente cuando se cree la tabla
   - No es necesario migrar datos manualmente

## 🚨 Solución de Problemas

**Error: "relation already exists"**
- La tabla ya existe, no es necesario ejecutar el script nuevamente

**Error: "function already exists"**
- La función ya existe, no es necesario ejecutar el script nuevamente

**Error: "permission denied"**
- Asegúrate de estar usando la cuenta correcta de Supabase
- Verifica que tienes permisos de administrador en el proyecto

**La validación no funciona:**
- Verifica que ejecutaste ambos scripts SQL
- Revisa los logs de la consola del navegador para ver errores
- Asegúrate de que la tabla `empresas` tiene el campo `nombre` con restricción `UNIQUE`

