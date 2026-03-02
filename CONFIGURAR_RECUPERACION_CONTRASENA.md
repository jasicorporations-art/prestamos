# 🔐 Configurar Recuperación de Contraseña en Supabase

## 📋 Pasos para Configurar

### 1. Acceder a la Configuración de Autenticación

1. **Abre el Dashboard de Supabase:**
   - Ve a: https://app.supabase.com
   - Inicia sesión con tu cuenta
   - Selecciona tu proyecto

2. **Navegar a Authentication:**
   - En el menú lateral izquierdo, haz clic en **"Authentication"**
   - Luego haz clic en **"URL Configuration"** o **"Redirect URLs"**

### 2. Agregar URLs de Redirección

En la sección **"Redirect URLs"** o **"Site URL"**, necesitas agregar las siguientes URLs:

#### Para Desarrollo Local:
```
http://localhost:3000/actualizar-contrasena
```

#### Para Producción:
```
https://dealers.jasicorporations.com/actualizar-contrasena
```

#### URLs Adicionales (Opcional pero Recomendado):
```
http://localhost:3000/**
https://dealers.jasicorporations.com/**
```

### 3. Configurar Site URL

En la sección **"Site URL"**, configura:

#### Para Desarrollo:
```
http://localhost:3000
```

#### Para Producción:
```
https://dealers.jasicorporations.com
```

### 4. Configurar Email Templates (Opcional)

1. En el menú lateral, ve a **"Authentication"** > **"Email Templates"**
2. Selecciona **"Reset Password"**
3. Puedes personalizar el email que se envía, pero asegúrate de que el enlace incluya:
   ```
   {{ .ConfirmationURL }}
   ```

### 5. Verificar Configuración de Email

1. Ve a **"Authentication"** > **"Providers"**
2. Asegúrate de que **"Email"** esté habilitado
3. Verifica que el **"SMTP Settings"** esté configurado (o usa el SMTP por defecto de Supabase)

## ✅ Verificación

### Probar en Desarrollo:

1. Abre la aplicación en: `http://localhost:3000`
2. Ve a la página de login
3. Haz clic en "¿Olvidaste tu contraseña?"
4. Ingresa un email válido
5. Revisa tu correo (y la carpeta de spam)
6. Haz clic en el enlace del correo
7. Deberías ser redirigido a: `http://localhost:3000/actualizar-contrasena`

### Probar en Producción:

1. Abre la aplicación en: `https://dealers.jasicorporations.com`
2. Sigue los mismos pasos
3. Deberías ser redirigido a: `https://dealers.jasicorporations.com/actualizar-contrasena`

## ⚠️ Notas Importantes

1. **Las URLs deben coincidir exactamente** con las configuradas en Supabase
2. **No uses `localhost` en producción** - solo en desarrollo
3. **El protocolo importa** - `http://` vs `https://`
4. **La ruta debe incluir `/actualizar-contrasena`** al final
5. **Puedes usar wildcards (`**`)** para permitir todas las rutas bajo tu dominio

## 🔧 Solución de Problemas

### Error: "Invalid redirect URL"
- ✅ Verifica que la URL esté agregada en Supabase
- ✅ Verifica que el protocolo sea correcto (`http://` para local, `https://` para producción)
- ✅ Verifica que no haya espacios o caracteres extra

### No recibo el correo
- ✅ Revisa la carpeta de spam
- ✅ Verifica que el email esté correcto
- ✅ Verifica la configuración de SMTP en Supabase
- ✅ Revisa los logs en Supabase Dashboard > Authentication > Logs

### El enlace no funciona
- ✅ Verifica que la URL de redirección esté configurada correctamente
- ✅ Verifica que la página `/actualizar-contrasena` exista y funcione
- ✅ Revisa la consola del navegador para ver errores

## 📝 Ejemplo de Configuración Completa

```
Site URL: https://dealers.jasicorporations.com

Redirect URLs:
- http://localhost:3000/actualizar-contrasena
- https://dealers.jasicorporations.com/actualizar-contrasena
- http://localhost:3000/**
- https://dealers.jasicorporations.com/**
```


