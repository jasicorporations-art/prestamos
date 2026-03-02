# 🔍 Diagnóstico: Códigos de Registro No Funcionan

## ✅ Verificación Paso a Paso

### Paso 1: Verificar que la Tabla Existe

1. **Ve a Supabase**:
   - [https://app.supabase.com/project/kpqvzkgsbawfqdsxjdjc/editor](https://app.supabase.com/project/kpqvzkgsbawfqdsxjdjc/editor)

2. **Ve a "Table Editor"** (en el menú lateral)

3. **Busca la tabla `codigos_registro`**
   - Si NO existe → Ejecuta: `supabase/crear-tabla-codigos-registro.sql`
   - Si existe → Continúa al Paso 2

### Paso 2: Verificar que los Códigos Están en la Base de Datos

1. **Ve a "SQL Editor"** en Supabase

2. **Ejecuta este script para ver TODOS los códigos**:

```sql
SELECT codigo, usado, usado_por_email, creado_en 
FROM codigos_registro 
ORDER BY creado_en DESC;
```

3. **Deberías ver una lista con los códigos**. Si está vacía, ejecuta: `supabase/generar-codigos-registro-iniciales.sql`

### Paso 3: Verificar Códigos Disponibles (No Usados)

Ejecuta este script:

```sql
SELECT codigo, creado_en, notas 
FROM codigos_registro 
WHERE usado = FALSE 
ORDER BY creado_en;
```

**Deberías ver estos 6 códigos**:
- `JASICORPJOHNRIJO-2024-001`
- `JASICORPSAMUELAHIASRIJO-2024-002`
- `JASICORP-2024-003GISLEYDIRIJO`
- `JASICORP-2024-004IANRIJO`
- `JASICORP-2024JOHNWILLIAMSRIJO-005`
- `JASICORP-2024SULE-006`

### Paso 4: Probar un Código Específico

Ejecuta este script (reemplaza `'TU-CODIGO-AQUI'` con el código que quieres probar):

```sql
SELECT * FROM codigos_registro WHERE codigo = 'JASICORPJOHNRIJO-2024-001';
```

**Deberías ver una fila con**:
- `codigo`: `JASICORPJOHNRIJO-2024-001`
- `usado`: `false` (o `f`)

## 🐛 Problemas Comunes y Soluciones

### Problema 1: La Tabla No Existe

**Síntoma**: Error "relation does not exist"

**Solución**:
1. Ejecuta: `supabase/crear-tabla-codigos-registro.sql`
2. Verifica en Table Editor que la tabla existe

### Problema 2: Los Códigos No Están en la Base de Datos

**Síntoma**: La tabla existe pero está vacía

**Solución**:
1. Ejecuta: `supabase/generar-codigos-registro-iniciales.sql`
2. Verifica con el script del Paso 2 que los códigos aparezcan

### Problema 3: El Código Está Escrito Incorrectamente

**Síntoma**: "El código no existe" pero el código está en la base de datos

**Causas comunes**:
- Espacios al inicio o final
- Mayúsculas/minúsculas incorrectas
- Caracteres especiales diferentes

**Solución**:
1. Copia el código EXACTO de Supabase (no lo escribas manualmente)
2. Pégalo en el formulario de registro
3. Asegúrate de no tener espacios antes o después

### Problema 4: El Código Ya Fue Usado

**Síntoma**: "Este código ya fue usado"

**Solución**:
1. Usa un código diferente
2. O genera nuevos códigos ejecutando:

```sql
INSERT INTO codigos_registro (codigo, usado, notas) VALUES
  ('NUEVO-CODIGO-001', FALSE, 'Código nuevo');
```

## 🔧 Scripts SQL para Verificar

He creado el archivo `VERIFICAR_CODIGOS_EN_SUPABASE.sql` con scripts útiles para verificar los códigos.

## 📝 Checklist de Verificación

Antes de probar el registro, verifica:

- [ ] La tabla `codigos_registro` existe en Supabase Table Editor
- [ ] La tabla tiene al menos 6 códigos (ejecuta el script del Paso 2)
- [ ] Los códigos tienen `usado = false` (no usados)
- [ ] Estás copiando el código exacto (no escribiéndolo manualmente)
- [ ] No hay espacios antes o después del código
- [ ] Las mayúsculas y minúsculas coinciden exactamente

## 🎯 Códigos que Deberían Funcionar

Si ejecutaste los scripts correctamente, estos códigos deberían funcionar:

1. `JASICORPJOHNRIJO-2024-001`
2. `JASICORPSAMUELAHIASRIJO-2024-002`
3. `JASICORP-2024-003GISLEYDIRIJO`
4. `JASICORP-2024-004IANRIJO`
5. `JASICORP-2024JOHNWILLIAMSRIJO-005`
6. `JASICORP-2024SULE-006`

## 🔍 Debug en el Navegador

Si aún no funciona:

1. **Abre la consola del navegador** (F12)
2. **Ve a la pestaña "Console"**
3. **Intenta registrarte con un código**
4. **Revisa los mensajes en la consola**:
   - Deberías ver: "Validando código: [tu código]"
   - Y luego: "Resultado de la consulta: ..."
5. **Copia los mensajes de error** y compártelos para diagnóstico

## ✅ Si Todo Está Correcto pero Aún No Funciona

1. **Verifica las variables de entorno en Vercel**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://kpqvzkgsbawfqdsxjdjc.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (tu clave)

2. **Haz un Redeploy en Vercel**:
   - Ve a Deployments → Redeploy

3. **Limpia la caché del navegador**:
   - Ctrl + Shift + Delete → Limpiar caché
   - O prueba en modo incógnito



