# ⚠️ URGENTE: Ejecutar Scripts SQL

## 🔴 Problema Actual

El sistema **NO puede prevenir** que múltiples usuarios registren la misma empresa porque:

1. ❌ La tabla `empresas` **NO existe** en Supabase
2. ❌ La función `verificar_empresa_disponible` **NO existe**
3. ✅ El código está configurado para bloquear registros, pero **requiere los scripts SQL**

## ✅ Solución Inmediata

### PASO 1: Crear Tabla de Empresas

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Copia y pega el contenido completo de `supabase/crear-tabla-empresas.sql`
5. Haz clic en **Run** (▶️)

**Archivo:** `supabase/crear-tabla-empresas.sql`

### PASO 2: Crear Función de Verificación

1. En el mismo SQL Editor
2. Copia y pega el contenido completo de `supabase/funcion-verificar-empresa-disponible.sql`
3. Haz clic en **Run** (▶️)

**Archivo:** `supabase/funcion-verificar-empresa-disponible.sql`

## 🎯 Resultado Esperado

Después de ejecutar los scripts:

✅ **Nuevos registros:**
- Si intentas registrar con una empresa que ya existe → **BLOQUEADO** con mensaje claro
- Si registras con una empresa nueva → **PERMITIDO**

✅ **Usuarios existentes:**
- Los usuarios que ya tienen cuentas seguirán funcionando
- Cada uno solo verá los datos de su propia empresa

## ⚠️ Nota sobre Usuarios Existentes

Si ya hay usuarios registrados con la misma empresa (antes de ejecutar los scripts):

1. **No se pueden eliminar automáticamente**
2. **Necesitarás eliminarlos manualmente** desde Supabase Dashboard si quieres que solo quede uno
3. **O puedes dejarlos** - cada uno seguirá viendo solo sus propios datos

## 📋 Verificación

Después de ejecutar los scripts, prueba:

1. Intenta registrar una cuenta nueva con una empresa que ya existe → Debe mostrar error
2. Intenta registrar una cuenta nueva con una empresa nueva → Debe funcionar
3. Inicia sesión con una cuenta existente → Debe funcionar normalmente

## 🔧 Si Tienes Problemas

**Error: "relation already exists"**
- La tabla ya existe, continúa con el Paso 2

**Error: "function already exists"**
- La función ya existe, está bien

**Error: "permission denied"**
- Verifica que estás usando la cuenta correcta de Supabase
- Asegúrate de tener permisos de administrador

---

**IMPORTANTE:** El sistema **NO funcionará correctamente** hasta que ejecutes estos scripts SQL. El código está listo, pero necesita la estructura de base de datos para validar.

