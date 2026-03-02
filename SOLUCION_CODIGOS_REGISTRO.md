# 🔧 Solución: Códigos de Registro No Reconocidos

## 🔍 Diagnóstico

Si la aplicación no reconoce los códigos de registro, es porque **la tabla `codigos_registro` no existe en tu base de datos de Supabase**.

## ✅ Solución: Ejecutar Scripts SQL en Supabase

### Paso 1: Crear la Tabla de Códigos

1. **Ve a tu proyecto en Supabase**:
   - Abre [supabase.com](https://supabase.com)
   - Inicia sesión
   - Selecciona tu proyecto: `kpqvzkgsbawfqdsxjdjc`

2. **Abrir SQL Editor**:
   - En el menú lateral, haz clic en **"SQL Editor"**
   - O ve a: `https://app.supabase.com/project/kpqvzkgsbawfqdsxjdjc/sql/new`

3. **Ejecutar Script 1: Crear Tabla**:
   - Abre el archivo: `supabase/crear-tabla-codigos-registro.sql`
   - Copia **TODO** el contenido
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en **"Run"** o presiona `Ctrl + Enter`
   - Deberías ver: **"Success"** o **"No rows returned"**

4. **Ejecutar Script 2: Generar Códigos Iniciales**:
   - Abre el archivo: `supabase/generar-codigos-registro-iniciales.sql`
   - Copia **TODO** el contenido
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en **"Run"**
   - Deberías ver: **"Success"** o un mensaje indicando que se insertaron los códigos

### Paso 2: Verificar que se Creó la Tabla

1. **En Supabase, ve a "Table Editor"** (en el menú lateral)
2. **Busca la tabla `codigos_registro`**
3. **Haz clic en la tabla** para ver su contenido
4. **Deberías ver 6 códigos**:
   - `JASICORPJOHNRIJO-2024-001`
   - `JASICORPSAMUELAHIASRIJO-2024-002`
   - `JASICORP-2024-003GISLEYDIRIJO`
   - `JASICORP-2024-004IANRIJO`
   - `JASICORP-2024JOHNWILLIAMSRIJO-005`
   - `JASICORP-2024SULE-006`

### Paso 3: Probar el Registro

1. **Ve a tu aplicación en Vercel**:
   - `https://sisi-seven.vercel.app/register`

2. **Intenta registrarte con uno de los códigos**:
   - Por ejemplo: `JASICORPJOHNRIJO-2024-001`

3. **Debería funcionar correctamente**

## 📋 Scripts SQL a Ejecutar (En Orden)

### Script 1: `supabase/crear-tabla-codigos-registro.sql`
**OBLIGATORIO** - Crea la tabla necesaria

### Script 2: `supabase/generar-codigos-registro-iniciales.sql`
**OBLIGATORIO** - Genera los códigos iniciales que puedes usar

## 🔍 Verificar Códigos Disponibles

Para ver qué códigos están disponibles, ejecuta en Supabase SQL Editor:

```sql
SELECT codigo, usado, usado_por_email, creado_en, notas 
FROM codigos_registro 
WHERE usado = FALSE 
ORDER BY creado_en;
```

## 🔍 Verificar Códigos Usados

Para ver qué códigos ya fueron usados:

```sql
SELECT codigo, usado_por_email, usado_en, notas 
FROM codigos_registro 
WHERE usado = TRUE 
ORDER BY usado_en DESC;
```

## 🐛 Si Aún No Funciona

### Error: "El código de registro no existe"

**Causa**: El código que estás usando no está en la base de datos

**Solución**:
1. Verifica que ejecutaste `generar-codigos-registro-iniciales.sql`
2. Verifica que el código esté escrito exactamente igual (case-sensitive)
3. Usa uno de los códigos de la lista de códigos disponibles

### Error: "Este código ya fue usado"

**Causa**: El código ya fue usado para crear otra cuenta

**Solución**:
1. Usa un código diferente
2. O genera nuevos códigos ejecutando:

```sql
INSERT INTO codigos_registro (codigo, usado, notas) VALUES
  ('TU-NUEVO-CODIGO-AQUI', FALSE, 'Código para nuevo usuario');
```

### Error: "Error al validar el código de registro"

**Causa**: Problema de conexión con Supabase o la tabla no existe

**Solución**:
1. Verifica que la tabla `codigos_registro` exista en Supabase
2. Verifica que las variables de entorno estén configuradas en Vercel
3. Revisa la consola del navegador (F12) para ver errores específicos

## 📝 Generar Más Códigos

Si necesitas más códigos, ejecuta en Supabase SQL Editor:

```sql
INSERT INTO codigos_registro (codigo, usado, notas) VALUES
  ('JASICORP-2024-007', FALSE, 'Código para nuevo usuario'),
  ('JASICORP-2024-008', FALSE, 'Código para nuevo usuario'),
  ('JASICORP-2024-009', FALSE, 'Código para nuevo usuario');
```

## ✅ Checklist

Antes de probar el registro, asegúrate de:

- [ ] Tabla `codigos_registro` creada en Supabase
- [ ] Códigos iniciales generados
- [ ] Variables de entorno configuradas en Vercel
- [ ] Aplicación desplegada en Vercel
- [ ] Puedes ver la tabla en Supabase Table Editor

## 🎯 Códigos Disponibles Actualmente

Según tu archivo `generar-codigos-registro-iniciales.sql`, estos son los códigos que deberías poder usar:

1. `JASICORPJOHNRIJO-2024-001`
2. `JASICORPSAMUELAHIASRIJO-2024-002`
3. `JASICORP-2024-003GISLEYDIRIJO`
4. `JASICORP-2024-004IANRIJO`
5. `JASICORP-2024JOHNWILLIAMSRIJO-005`
6. `JASICORP-2024SULE-006`

**Importante**: Los códigos son **case-sensitive** (distingue mayúsculas y minúsculas), así que escríbelos exactamente como aparecen arriba.



