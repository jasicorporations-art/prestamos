# Ejecutar SQL para Crear Tabla de Empresas

## 📋 Instrucciones

Para que la funcionalidad de **empresas únicas** funcione correctamente, necesitas ejecutar el script SQL en Supabase para crear la tabla `empresas`.

### Pasos:

1. **Abre Supabase Dashboard**
   - Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Inicia sesión con tu cuenta

2. **Navega al SQL Editor**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - O ve directamente a: `https://supabase.com/dashboard/project/[TU_PROJECT_ID]/sql/new`

3. **Ejecuta el Script**
   - Abre el archivo `supabase/crear-tabla-empresas.sql`
   - Copia todo el contenido del archivo
   - Pégalo en el editor SQL de Supabase
   - Haz clic en **"Run"** o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

4. **Verifica que se Creó Correctamente**
   - Deberías ver un mensaje de éxito
   - Puedes verificar en **"Table Editor"** que la tabla `empresas` existe

### ¿Qué hace este script?

- ✅ Crea la tabla `empresas` con un campo `nombre` único
- ✅ Asocia cada empresa con un `user_id` (el usuario que la creó)
- ✅ Crea índices para búsquedas rápidas
- ✅ Configura Row Level Security (RLS) para que cada usuario solo vea su propia empresa
- ✅ Garantiza que no se puedan crear dos empresas con el mismo nombre

### Nota Importante

Si la tabla `empresas` no existe, la aplicación seguirá funcionando (compatibilidad hacia atrás), pero la validación de empresas únicas no será tan estricta. Se recomienda ejecutar este script para garantizar la unicidad de los nombres de empresa.

### Solución de Problemas

**Error: "relation already exists"**
- La tabla ya existe, no es necesario ejecutar el script nuevamente

**Error: "permission denied"**
- Asegúrate de estar usando la cuenta correcta de Supabase
- Verifica que tienes permisos de administrador en el proyecto

**Error: "syntax error"**
- Verifica que copiaste todo el contenido del archivo
- Asegúrate de que no haya caracteres extraños

