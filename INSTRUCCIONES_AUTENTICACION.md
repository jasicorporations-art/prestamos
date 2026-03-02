# 🔐 Sistema de Autenticación - Instrucciones

## ✅ Sistema Implementado

Se ha implementado un sistema de autenticación completo usando **Supabase Auth** que requiere usuario y contraseña para acceder al programa.

## 📋 Funcionalidades

- ✅ **Página de Login**: Interfaz de inicio de sesión
- ✅ **Protección de Rutas**: Todas las páginas requieren autenticación
- ✅ **Logout**: Botón para cerrar sesión en la navegación
- ✅ **Sesión Persistente**: La sesión se mantiene al recargar la página
- ✅ **Redirección Automática**: Redirige al login si no está autenticado

## 🚀 Cómo Crear el Primer Usuario

### Opción 1: Desde Supabase Dashboard (RECOMENDADO)

1. **Ve a tu proyecto en Supabase:**
   - https://app.supabase.com/project/[TU_PROYECTO_ID]

2. **Navega a Authentication:**
   - En el menú lateral, haz clic en **"Authentication"**
   - Luego haz clic en **"Users"**

3. **Crear nuevo usuario:**
   - Haz clic en el botón **"Add user"** o **"Create new user"**
   - Completa el formulario:
     - **Email**: `admin@nazaretreynoso.com` (o el email que prefieras)
     - **Password**: [Elige una contraseña segura]
     - **Auto Confirm User**: ✅ **Marca esta opción** (importante)
   - Haz clic en **"Create user"**

4. **¡Listo!** Ya puedes iniciar sesión con ese usuario

### Opción 2: Desde la Aplicación (Requiere código adicional)

Si prefieres crear usuarios desde la aplicación, necesitarías agregar una página de registro. Por ahora, usa la Opción 1 que es más simple.

## 🔑 Credenciales de Ejemplo

Después de crear el usuario en Supabase, puedes iniciar sesión con:

- **Email**: El email que ingresaste (ej: `admin@nazaretreynoso.com`)
- **Password**: La contraseña que configuraste

## 📝 Cómo Funciona

1. **Al acceder a la aplicación:**
   - Si no estás autenticado, se redirige automáticamente a `/login`
   - Si ya estás autenticado, puedes acceder normalmente

2. **Al iniciar sesión:**
   - Se valida el usuario y contraseña con Supabase Auth
   - Si es correcto, se crea una sesión
   - Se redirige al dashboard principal

3. **Durante la navegación:**
   - Todas las rutas están protegidas
   - Si la sesión expira, se redirige al login automáticamente

4. **Al cerrar sesión:**
   - Haz clic en el botón "Salir" en la navegación
   - Se cierra la sesión y se redirige al login

## 🔒 Seguridad

- ✅ Las contraseñas se almacenan de forma segura en Supabase (hash)
- ✅ Las sesiones se gestionan automáticamente
- ✅ Las rutas están protegidas en el cliente
- ✅ Supabase maneja la autenticación de forma segura

## ⚠️ Notas Importantes

1. **Auto Confirm User**: Es importante marcar esta opción al crear el usuario, de lo contrario necesitarás confirmar el email

2. **Múltiples Usuarios**: Puedes crear tantos usuarios como necesites desde Supabase Dashboard

3. **Recuperación de Contraseña**: Supabase Auth tiene funciones para recuperar contraseñas, pero requieren configuración adicional de email

4. **Roles y Permisos**: Actualmente todos los usuarios tienen el mismo acceso. Si necesitas diferentes niveles de acceso, se puede implementar.

## 🐛 Solución de Problemas

### "Invalid login credentials"
- Verifica que el email y contraseña sean correctos
- Asegúrate de que el usuario esté creado en Supabase
- Verifica que "Auto Confirm User" esté marcado

### "Session expired"
- Simplemente inicia sesión nuevamente
- La sesión se renueva automáticamente al usar la aplicación

### No puedo crear usuarios
- Usa el Dashboard de Supabase (método recomendado)
- Verifica que tengas permisos en el proyecto

---

**¡El sistema de autenticación está listo! Crea tu primer usuario en Supabase y podrás iniciar sesión.** ✅



