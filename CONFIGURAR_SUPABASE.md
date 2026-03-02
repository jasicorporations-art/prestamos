# 🔧 Configurar Supabase - Paso a Paso

## ✅ Ya Tienes Cuenta en Supabase

Perfecto, ahora solo necesitamos configurar el proyecto. Sigue estos pasos:

## 📋 Paso 1: Crear un Nuevo Proyecto (2 minutos)

1. **Inicia sesión** en [supabase.com](https://supabase.com)

2. **Crear nuevo proyecto:**
   - Haz clic en "New Project" o "Nuevo Proyecto"
   - **Nombre del proyecto:** `inversiones-nazaret-reynoso` (o el que prefieras)
   - **Database Password:** Crea una contraseña segura (guárdala, la necesitarás)
   - **Region:** Elige la más cercana (ej: US East, Europe West)
   - Haz clic en "Create new project"

3. **Espera 2-3 minutos** mientras se configura el proyecto
   - Verás un mensaje de "Setting up your project"
   - Cuando termine, verás el dashboard del proyecto

## 📋 Paso 2: Ejecutar el Schema SQL (3 minutos)

1. **Abrir SQL Editor:**
   - En el menú lateral izquierdo, haz clic en **"SQL Editor"**
   - O ve directamente a: `https://app.supabase.com/project/[tu-proyecto]/sql`

2. **Crear nueva consulta:**
   - Haz clic en el botón **"New query"** o **"Nueva consulta"**

3. **Copiar el schema:**
   - Abre el archivo `supabase/schema.sql` de tu proyecto
   - Selecciona TODO el contenido (Ctrl + A)
   - Copia (Ctrl + C)

4. **Pegar y ejecutar:**
   - Pega el contenido en el SQL Editor de Supabase
   - Haz clic en **"Run"** o presiona `Ctrl + Enter`
   - Deberías ver: **"Success. No rows returned"** ✅

5. **Verificar que se crearon las tablas:**
   - En el menú lateral, ve a **"Table Editor"**
   - Deberías ver 4 tablas:
     - ✅ `motores`
     - ✅ `clientes`
     - ✅ `ventas`
     - ✅ `pagos`

## 📋 Paso 3: Obtener las Credenciales (1 minuto)

1. **Ir a Settings:**
   - En el menú lateral, haz clic en el icono de **⚙️ Settings** (Configuración)
   - O ve a: `https://app.supabase.com/project/[tu-proyecto]/settings/api`

2. **Copiar Project URL:**
   - En la sección **"Project URL"**
   - Haz clic en el icono de copiar o selecciona y copia
   - Se ve así: `https://xxxxx.supabase.co`

3. **Copiar anon public key:**
   - En la sección **"API Keys"**
   - Busca **"anon public"** (no uses la "service_role")
   - Haz clic en el icono de copiar o selecciona y copia
   - Es una clave larga que comienza con `eyJ...`

## 📋 Paso 4: Configurar .env.local (2 minutos)

1. **Crear el archivo:**
   - En la raíz de tu proyecto (donde está `package.json`)
   - Crea un nuevo archivo llamado `.env.local`
   - ⚠️ **Importante:** El archivo debe empezar con punto (`.env.local`)

2. **Agregar las credenciales:**
   - Abre el archivo `.env.local`
   - Pega este contenido y reemplaza con tus valores:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_aqui
```

   - Reemplaza `https://tu-proyecto.supabase.co` con tu Project URL
   - Reemplaza `tu_clave_anonima_aqui` con tu anon public key

3. **Guardar el archivo:**
   - Guarda (Ctrl + S)
   - El archivo debe quedar en: `C:\Users\Owner\.cursor\.env.local`

## 📋 Paso 5: Reiniciar el Servidor (1 minuto)

1. **Detener el servidor actual:**
   - Si el servidor está corriendo, ve a la terminal
   - Presiona `Ctrl + C` para detenerlo

2. **Agregar Node.js al PATH (si es necesario):**
   ```powershell
   $env:PATH += ";C:\Program Files\nodejs"
   ```

3. **Iniciar el servidor:**
   ```powershell
   npm.cmd run dev
   ```

4. **Esperar a que inicie:**
   - Verás: `✓ Ready in X seconds`
   - Verás: `○ Local: http://localhost:3000`

## ✅ Paso 6: ¡Probar la Aplicación!

1. **Abrir en el navegador:**
   - Ve a: `http://localhost:3000`

2. **Probar funcionalidades:**
   - ✅ Crear un motor de prueba
   - ✅ Crear un cliente de prueba
   - ✅ Crear una venta
   - ✅ Registrar un pago

3. **Verificar en Supabase:**
   - Ve a **Table Editor** en Supabase
   - Deberías ver los datos que creaste

## 🎉 ¡Listo!

Ahora tu aplicación está completamente funcional:
- ✅ Conectada a Supabase
- ✅ Guardando datos en la nube
- ✅ PWA lista para instalar
- ✅ Todo funcionando

## 🆘 Si Algo No Funciona

### Error: "Supabase credentials not found"
- Verifica que el archivo se llama `.env.local` (con punto al inicio)
- Verifica que las variables tienen el prefijo `NEXT_PUBLIC_`
- Reinicia el servidor después de crear `.env.local`

### Error al ejecutar SQL
- Verifica que copiaste TODO el contenido de `schema.sql`
- Asegúrate de estar en el SQL Editor correcto
- Si hay errores, ejecuta el SQL sección por sección

### No se guardan los datos
- Verifica que las credenciales en `.env.local` son correctas
- Verifica en la consola del navegador (F12) si hay errores
- Asegúrate de que el servidor se reinició después de crear `.env.local`

---

**¿En qué paso estás? Dime si necesitas ayuda con alguno específico.** 🚀



