# 🆕 Configurar un Nuevo Proyecto de Supabase Independiente

## 📋 Pasos para Crear y Configurar un Nuevo Proyecto

### Paso 1: Crear un Nuevo Proyecto en Supabase (5 minutos)

1. **Ve a Supabase:**
   - Abre tu navegador y ve a: https://supabase.com
   - Inicia sesión con tu cuenta (o crea una si no tienes)

2. **Crear Nuevo Proyecto:**
   - Haz clic en **"New Project"** o **"Nuevo Proyecto"**
   - Completa el formulario:
     - **Name:** `JASICORPORATIONS GESTION DE PRESTAMOS` (o el nombre que prefieras)
     - **Database Password:** Crea una contraseña segura (guárdala en un lugar seguro)
     - **Region:** Elige la región más cercana a ti
     - **Pricing Plan:** Selecciona **Free** (gratis) si es para desarrollo

3. **Esperar la Configuración:**
   - Supabase creará tu proyecto (esto toma 2-3 minutos)
   - Verás un mensaje cuando esté listo

### Paso 2: Ejecutar el Schema SQL (2 minutos)

1. **Abrir SQL Editor:**
   - En tu proyecto de Supabase, ve a **SQL Editor** (en el menú lateral)
   - O ve directamente a: `https://app.supabase.com/project/[tu-proyecto-id]/sql/new`

2. **Ejecutar el Schema:**
   - Abre el archivo `supabase/schema.sql` de este proyecto
   - Copia **TODO** el contenido del archivo
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en **"Run"** o presiona `Ctrl + Enter`
   - Deberías ver: **"Success. No rows returned"** o un mensaje de éxito

3. **Ejecutar Scripts Adicionales (Opcional):**
   - Si necesitas el campo de cantidad, ejecuta también `supabase/agregar-cantidad-motores.sql`
   - Si necesitas el campo de plazo, ejecuta `supabase/agregar-plazo-ventas.sql`

### Paso 3: Obtener las Credenciales (1 minuto)

1. **Ir a Settings:**
   - En tu proyecto de Supabase, ve a **Settings** > **API**
   - O ve directamente a: `https://app.supabase.com/project/[tu-proyecto-id]/settings/api`

2. **Copiar Project URL:**
   - En la sección **"Project URL"**
   - Haz clic en el icono de copiar 📋
   - Se ve así: `https://xxxxxxxxxxxxx.supabase.co`
   - **Guarda esta URL** (la necesitarás en el siguiente paso)

3. **Copiar anon public key:**
   - En la sección **"API Keys"**
   - Busca **"anon public"** (NO uses la "service_role")
   - Haz clic en el icono de copiar 📋
   - Es una clave muy larga que comienza con `eyJ...`
   - **Guarda esta clave** (la necesitarás en el siguiente paso)

### Paso 4: Configurar .env.local (2 opciones)

#### Opción A: Usar el Script Automático (Recomendado)

1. **Ejecutar el script:**
   ```powershell
   .\crear-env-local.ps1
   ```

2. **Seguir las instrucciones:**
   - Ingresa la URL de Supabase cuando te la pida
   - Ingresa la clave anónima cuando te la pida
   - El script creará el archivo `.env.local` automáticamente

#### Opción B: Crear Manualmente

1. **Crear el archivo:**
   - En la raíz de tu proyecto (donde está `package.json`)
   - Crea un nuevo archivo llamado `.env.local`
   - ⚠️ **Importante:** Debe empezar con punto: `.env.local`

2. **Agregar las credenciales:**
   - Abre el archivo `.env.local`
   - Pega este contenido y reemplaza con tus valores:

```env
# Configuración de Supabase para JASICORPORATIONS GESTION DE PRESTAMOS
# Generado automáticamente

NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-nuevo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_aqui
```

   - Reemplaza `https://tu-proyecto-nuevo.supabase.co` con tu Project URL
   - Reemplaza `tu_clave_anonima_aqui` con tu anon public key

3. **Guardar el archivo:**
   - Guarda (Ctrl + S)
   - El archivo debe quedar en: `C:\Users\Owner\Documents\sisi\.env.local`

### Paso 5: Crear el Primer Usuario (Opcional pero Recomendado)

1. **Ir a Authentication:**
   - En tu proyecto de Supabase, ve a **Authentication** > **Users**
   - O ve directamente a: `https://app.supabase.com/project/[tu-proyecto-id]/auth/users`

2. **Crear Usuario:**
   - Haz clic en **"Add user"** o **"Create new user"**
   - Completa el formulario:
     - **Email:** `admin@jasicorporations.com` (o el email que prefieras)
     - **Password:** Crea una contraseña segura
     - **Auto Confirm User:** ✅ **Marca esta opción** (importante)
   - Haz clic en **"Create user"**

3. **¡Listo!** Ya puedes iniciar sesión con ese usuario

### Paso 6: Reiniciar el Servidor

1. **Detener el servidor actual:**
   - Si el servidor está corriendo, ve a la terminal
   - Presiona `Ctrl + C` para detenerlo

2. **Iniciar el servidor:**
   ```powershell
   npm.cmd run dev
   ```

3. **Esperar a que inicie:**
   - Verás: `✓ Ready in X seconds`
   - Verás: `○ Local: http://localhost:3000`

### Paso 7: ¡Probar la Aplicación!

1. **Abrir en el navegador:**
   - Ve a: `http://localhost:3000`

2. **Iniciar sesión:**
   - Usa el usuario que creaste en el Paso 5

3. **Probar funcionalidades:**
   - ✅ Crear un préstamo de prueba
   - ✅ Crear un cliente de prueba
   - ✅ Crear una venta
   - ✅ Registrar un pago

4. **Verificar en Supabase:**
   - Ve a **Table Editor** en Supabase
   - Deberías ver tus datos en las tablas:
     - `motores` (préstamos)
     - `clientes`
     - `ventas`
     - `pagos`

## ✅ Verificación

Para verificar que todo está configurado correctamente:

1. **Revisa el archivo `.env.local`:**
   - Debe existir en la raíz del proyecto
   - Debe tener `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Revisa la consola del navegador:**
   - Abre las herramientas de desarrollador (F12)
   - Ve a la pestaña "Console"
   - No deberías ver errores de conexión a Supabase

3. **Revisa Supabase:**
   - Ve a **Table Editor** en tu proyecto
   - Deberías poder ver las tablas creadas

## 🆘 Solución de Problemas

### Error: "Supabase credentials not found"
- **Solución:** Verifica que el archivo `.env.local` existe y tiene las variables correctas
- Reinicia el servidor después de crear/modificar `.env.local`

### Error: "Invalid API key"
- **Solución:** Verifica que copiaste la clave "anon public" completa (es muy larga)
- Asegúrate de no tener espacios al inicio o final

### Error: "relation does not exist"
- **Solución:** Ejecuta el script `supabase/schema.sql` en el SQL Editor de Supabase

### No puedo iniciar sesión
- **Solución:** Verifica que creaste un usuario en Authentication > Users
- Asegúrate de marcar "Auto Confirm User" al crear el usuario

## 📝 Notas Importantes

- ⚠️ **Nunca compartas** tu clave "service_role" - es privada
- ✅ **Puedes compartir** la clave "anon public" - es pública y segura
- 🔒 El archivo `.env.local` está en `.gitignore` - no se subirá a Git
- 📦 Cada proyecto de Supabase es completamente independiente

---

**¡Listo!** Ahora tienes tu propio proyecto de Supabase independiente para JASICORPORATIONS GESTION DE PRESTAMOS. 🎉



