# Configuración de Backups y Seguridad

## 🔒 Seguridad HTTPS

### Implementación Automática

La aplicación está configurada para:

1. **Redirección Automática HTTP → HTTPS**: En producción, todas las solicitudes HTTP se redirigen automáticamente a HTTPS usando un redirect 301 (permanente).

2. **Headers de Seguridad**: Se han implementado los siguientes headers de seguridad:
   - `Strict-Transport-Security`: Fuerza el uso de HTTPS durante 1 año
   - `X-Content-Type-Options: nosniff`: Previene MIME type sniffing
   - `X-Frame-Options: DENY`: Previene clickjacking
   - `X-XSS-Protection`: Protección básica contra XSS
   - `Referrer-Policy`: Controla qué información se envía en el header Referer
   - `Permissions-Policy`: Restringe el acceso a APIs del navegador
   - `Content-Security-Policy`: Controla qué recursos puede cargar la página

3. **Validación de URL de Supabase**: El cliente de Supabase valida que la URL use HTTPS antes de establecer conexiones.

### Verificación

Para verificar que HTTPS está funcionando:

1. Intenta acceder a la aplicación usando `http://` - deberías ser redirigido automáticamente a `https://`
2. Verifica los headers de respuesta en las herramientas de desarrollador (F12 > Network > Headers)
3. Busca el indicador "Conexión HTTPS Segura" en el panel de administración

## 💾 Backups Automáticos de Supabase

### Configuración en Supabase Dashboard

Supabase realiza backups automáticos diarios de forma predeterminada. Para verificar y configurar:

#### 1. Acceder al Dashboard

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Inicia sesión con tu cuenta
3. Selecciona el proyecto correspondiente

#### 2. Verificar Backups Automáticos

1. En el menú lateral, ve a **Settings** > **Database**
2. Busca la sección **Backups**
3. Verás:
   - Estado de backups automáticos (Activo/Inactivo)
   - Fecha del último backup realizado
   - Historial de backups disponibles
   - Opciones para backups manuales

#### 3. Configuración de Retención

Los backups se retienen según tu plan:

- **Plan Free**: 7 días de backups
- **Plan Pro**: 7 días de backups
- **Plan Team**: 7 días de backups
- **Plan Enterprise**: Configurable (hasta 30 días o más)

#### 4. Realizar Backup Manual

Si necesitas crear un backup manual:

1. Ve a **Database** > **Backups**
2. Haz clic en **"Create Backup"** o **"Backup Now"**
3. Espera a que se complete el proceso
4. El backup aparecerá en la lista de backups disponibles

#### 5. Restaurar un Backup

Para restaurar la base de datos desde un backup:

1. Ve a **Database** > **Backups**
2. Selecciona el backup que deseas restaurar
3. Haz clic en **"Restore"**
4. Confirma la acción (⚠️ **ADVERTENCIA**: Esto sobrescribirá los datos actuales)
5. Espera a que se complete la restauración

### Configuración en la Base de Datos

Para que la aplicación muestre la fecha del último backup en el panel de administración:

1. **Ejecutar el script SQL**:
   ```bash
   # En el SQL Editor de Supabase, ejecuta:
   supabase/configurar-backups.sql
   ```

2. **Verificar la tabla**:
   ```sql
   SELECT * FROM configuracion_sistema WHERE clave = 'ultimo_backup';
   ```

3. **Actualizar manualmente la fecha** (si es necesario):
   ```sql
   SELECT actualizar_ultimo_backup();
   ```

### Actualización Automática de Fecha de Backup

La fecha del último backup se puede actualizar de dos formas:

#### Opción 1: Manual (Recomendado para verificación)

Ejecuta este comando SQL periódicamente (diariamente) para sincronizar con los backups de Supabase:

```sql
SELECT actualizar_ultimo_backup();
```

#### Opción 2: Automática con Cron Job (Avanzado)

Puedes configurar un cron job en Supabase para actualizar automáticamente la fecha:

1. Ve a **Database** > **Functions**
2. Crea una nueva función que llame a `actualizar_ultimo_backup()`
3. Configura un cron job que ejecute esta función diariamente

### Visualización en el Panel de Administración

El panel de administración muestra:

- **Indicador de Conexión HTTPS**: Un ícono verde con el texto "Conexión HTTPS Segura"
- **Último Respaldo de Seguridad**: Muestra cuándo fue el último backup realizado, con formato legible:
  - "Hace menos de 1 hora"
  - "Hace X horas"
  - "Ayer"
  - "Hace X días"
  - Fecha completa si es más antigua

### Solución de Problemas

#### El indicador de backup no aparece

1. Verifica que la tabla `configuracion_sistema` existe:
   ```sql
   SELECT * FROM configuracion_sistema;
   ```

2. Si no existe, ejecuta `supabase/configurar-backups.sql`

3. Verifica que hay un registro con `clave = 'ultimo_backup'`:
   ```sql
   SELECT * FROM configuracion_sistema WHERE clave = 'ultimo_backup';
   ```

#### La fecha del backup no se actualiza

1. Ejecuta manualmente: `SELECT actualizar_ultimo_backup();`
2. Verifica que la función existe:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'actualizar_ultimo_backup';
   ```

#### Error al cargar información de backup

- La aplicación usa un fallback que asume que el último backup fue hace 12 horas
- Esto es solo una aproximación; para datos precisos, ejecuta el script SQL y actualiza manualmente

## 📋 Checklist de Seguridad

- [x] Redirección HTTP → HTTPS configurada
- [x] Headers de seguridad implementados
- [x] Validación de URL HTTPS en cliente Supabase
- [x] Tabla de configuración de backups creada
- [x] Función de actualización de backup creada
- [x] Indicador de seguridad en panel de admin
- [x] Visualización de último backup en panel de admin
- [ ] Verificar backups automáticos en Supabase Dashboard
- [ ] Configurar actualización automática de fecha de backup (opcional)

## 🔗 Recursos Adicionales

- [Documentación de Supabase Backups](https://supabase.com/docs/guides/platform/backups)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)


