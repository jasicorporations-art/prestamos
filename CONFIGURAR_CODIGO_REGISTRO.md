# Configuración del Código de Registro

## Descripción

El sistema ahora requiere un código único de registro para crear nuevas cuentas de usuario. **Cada código solo puede usarse una vez**. Una vez que un código se usa para crear una cuenta, ese código ya no será válido para crear otra cuenta. Para crear más cuentas, necesitarás generar nuevos códigos.

## ⚠️ Importante: Sistema de Códigos Únicos

- **Cada código solo puede usarse UNA vez**
- Una vez usado, el código queda marcado como "usado" y no puede reutilizarse
- Para crear más cuentas, necesitas generar nuevos códigos
- El sistema rastrea qué usuario usó cada código y cuándo

## 📋 Configuración Inicial (OBLIGATORIO)

### Paso 1: Crear la Tabla de Códigos

1. Abre Supabase SQL Editor
2. Ejecuta el script: `supabase/crear-tabla-codigos-registro.sql`
3. Esto creará la tabla necesaria para gestionar los códigos

### Paso 2: Generar Códigos Iniciales

1. En Supabase SQL Editor, ejecuta: `supabase/generar-codigos-registro-iniciales.sql`
2. Esto creará 5 códigos iniciales:
   - `JASICORP-2024-001`
   - `JASICORP-2024-002`
   - `JASICORP-2024-003`
   - `JASICORP-2024-004`
   - `JASICORP-2024-005`

### Paso 3: Generar Más Códigos (Opcional)

Para generar más códigos, ejecuta en Supabase SQL Editor:

```sql
INSERT INTO codigos_registro (codigo, usado, notas) VALUES
  ('TU-CODIGO-AQUI-001', FALSE, 'Descripción del código'),
  ('TU-CODIGO-AQUI-002', FALSE, 'Descripción del código');
```

## 🔧 Cómo Cambiar o Generar Nuevos Códigos

Tienes dos opciones para generar nuevos códigos:

### Opción 1: Generar Códigos desde Supabase SQL Editor (Recomendado)

1. Abre Supabase SQL Editor
2. Ejecuta el siguiente comando para crear nuevos códigos:

```sql
INSERT INTO codigos_registro (codigo, usado, notas) VALUES
  ('JASICORP-2024-006', FALSE, 'Código para nuevo usuario'),
  ('JASICORP-2024-007', FALSE, 'Código para nuevo usuario'),
  ('JASICORP-2024-008', FALSE, 'Código para nuevo usuario');
```

3. Puedes crear tantos códigos como necesites
4. Cada código solo puede usarse una vez

### Opción 2: Usar el Servicio de Códigos (Desde la Aplicación)

Si tienes acceso administrativo, puedes usar el servicio `codigosRegistroService` para crear códigos programáticamente.

**Nota:** El sistema ya no usa un código único compartido. Cada usuario necesita su propio código único.

## 📊 Consultar Códigos Disponibles y Usados

### Ver Códigos Disponibles (No Usados)

```sql
SELECT codigo, creado_en, notas 
FROM codigos_registro 
WHERE usado = FALSE 
ORDER BY creado_en;
```

### Ver Códigos Usados

```sql
SELECT codigo, usado_por_email, usado_en, notas 
FROM codigos_registro 
WHERE usado = TRUE 
ORDER BY usado_en DESC;
```

## 🔒 Recomendaciones de Seguridad

1. **Genera códigos únicos y complejos**: Mínimo 16 caracteres
2. **Combina letras, números y guiones**: Ejemplo: `JASICORP-2024-ABC123-XYZ789`
3. **No compartas códigos públicamente**: Solo compártelos con usuarios autorizados
4. **Genera códigos bajo demanda**: No generes muchos códigos de una vez si no los necesitas
5. **Rastrea quién usa cada código**: El sistema guarda qué email usó cada código
6. **Revisa periódicamente los códigos usados**: Para detectar uso no autorizado

## 📝 Ejemplos de Códigos Seguros

```
JASICORP-2024-001-ABC123XYZ
JASICORP-2024-002-DEF456UVW
JASICORP-2024-003-GHI789RST
```

## 📤 Cómo Distribuir los Códigos

1. **Comunicación directa**: Envía cada código por email, WhatsApp o mensaje privado
2. **Un código por usuario**: Cada usuario debe recibir su propio código único
3. **Soporte técnico**: Tu equipo de soporte puede generar y proporcionar códigos a usuarios autorizados

## ⚠️ Notas Importantes

- **Cada código solo puede usarse UNA vez**
- El código es **case-sensitive** (distingue entre mayúsculas y minúsculas)
- Los espacios al inicio y final se eliminan automáticamente
- Si un usuario ingresa un código incorrecto o ya usado, verá un mensaje de error claro
- El código se valida en la base de datos antes de crear la cuenta
- Una vez usado, el código queda permanentemente marcado como usado

## 🔍 Solución de Problemas

### El código no funciona
- Verifica que no haya espacios adicionales
- Verifica que las mayúsculas y minúsculas coincidan exactamente
- Verifica que el código no haya sido usado antes (consulta en Supabase)
- Asegúrate de que el código exista en la tabla `codigos_registro`

### El código dice que ya fue usado
- Cada código solo puede usarse una vez
- Necesitas generar un nuevo código para ese usuario
- Puedes verificar quién usó el código consultando la tabla en Supabase

### Quiero ver todos los códigos disponibles
- Ejecuta la consulta SQL mencionada arriba para ver códigos disponibles
- O consulta directamente en Supabase Table Editor la tabla `codigos_registro`

### Necesito generar muchos códigos
- Puedes crear múltiples códigos en una sola consulta SQL
- Ejemplo:
```sql
INSERT INTO codigos_registro (codigo, usado, notas) VALUES
  ('CODIGO-001', FALSE, 'Usuario 1'),
  ('CODIGO-002', FALSE, 'Usuario 2'),
  ('CODIGO-003', FALSE, 'Usuario 3');
```

### Quiero desactivar el sistema de códigos
- **NO es recomendado** por razones de seguridad
- Si realmente necesitas hacerlo, puedes modificar `app/register/page.tsx` para omitir la validación
- Es mejor mantener el sistema activo y generar códigos según necesidad

