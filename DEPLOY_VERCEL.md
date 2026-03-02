# 🚀 Desplegar en Vercel - Guía Completa

## 📋 Requisitos Previos

1. **Cuenta en Vercel**: Crea una cuenta gratuita en [vercel.com](https://vercel.com)
2. **Cuenta en Supabase**: Ya debes tener tu proyecto de Supabase configurado
3. **Repositorio Git**: El proyecto debe estar en GitHub, GitLab o Bitbucket (recomendado)

## 🔧 Paso 1: Preparar el Repositorio Git

### Si aún no tienes un repositorio Git:

1. **Inicializar Git** (si no lo has hecho):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - JASICORPORATIONS GESTION DE PRESTAMOS"
   ```

2. **Crear repositorio en GitHub**:
   - Ve a [github.com](https://github.com)
   - Crea un nuevo repositorio
   - Sigue las instrucciones para conectar tu repositorio local

3. **Subir el código**:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git branch -M main
   git push -u origin main
   ```

## 🚀 Paso 2: Desplegar en Vercel

### Opción A: Desde el Dashboard de Vercel (Recomendado)

1. **Iniciar sesión en Vercel**:
   - Ve a [vercel.com](https://vercel.com)
   - Inicia sesión con tu cuenta (puedes usar GitHub para autenticarte)

2. **Importar Proyecto**:
   - Haz clic en **"Add New..."** → **"Project"**
   - Selecciona tu repositorio de GitHub/GitLab/Bitbucket
   - Si no aparece, haz clic en **"Adjust GitHub App Permissions"** y autoriza Vercel

3. **Configurar el Proyecto**:
   - **Framework Preset**: Next.js (debe detectarse automáticamente)
   - **Root Directory**: `./` (dejar por defecto)
   - **Build Command**: `npm run build` (ya está configurado)
   - **Output Directory**: `.next` (por defecto)
   - **Install Command**: `npm install` (por defecto)

4. **Configurar Variables de Entorno**:
   - Haz clic en **"Environment Variables"**
   - Agrega las siguientes variables:
   
   ```
   NEXT_PUBLIC_SUPABASE_URL = tu_url_de_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY = tu_clave_anonima_de_supabase
   ```
   
   **Importante**: 
   - Reemplaza `tu_url_de_supabase` con tu URL de Supabase (ej: `https://xxxxx.supabase.co`)
   - Reemplaza `tu_clave_anonima_de_supabase` con tu clave anónima de Supabase
   - Estas variables son **públicas** (por eso tienen `NEXT_PUBLIC_`), así que es seguro agregarlas

5. **Desplegar**:
   - Haz clic en **"Deploy"**
   - Espera 2-3 minutos mientras Vercel construye y despliega tu aplicación
   - Verás el progreso en tiempo real

### Opción B: Desde la Línea de Comandos

1. **Instalar Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Iniciar sesión**:
   ```bash
   vercel login
   ```

3. **Desplegar**:
   ```bash
   vercel
   ```
   
   - Sigue las instrucciones en pantalla
   - Cuando pregunte por las variables de entorno, agrégalas:
     - `NEXT_PUBLIC_SUPABASE_URL`: tu URL de Supabase
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: tu clave anónima de Supabase

4. **Desplegar a Producción**:
   ```bash
   vercel --prod
   ```

## 🔐 Paso 3: Configurar Variables de Entorno en Vercel

### Desde el Dashboard:

1. Ve a tu proyecto en Vercel
2. Haz clic en **"Settings"** → **"Environment Variables"**
3. Agrega cada variable:
   - **Key**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: Tu URL de Supabase
   - **Environments**: Selecciona Production, Preview y Development
   - Haz clic en **"Save"**
   
4. Repite para la segunda variable:
   - **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value**: Tu clave anónima de Supabase
   - **Environments**: Selecciona Production, Preview y Development
   - Haz clic en **"Save"**

### Desde la CLI:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## ✅ Paso 4: Verificar el Despliegue

1. **Revisar el Build**:
   - Ve a la pestaña **"Deployments"** en Vercel
   - Verifica que el build haya sido exitoso (debe mostrar "Ready")

2. **Probar la Aplicación**:
   - Haz clic en el enlace de tu despliegue (ej: `tu-proyecto.vercel.app`)
   - Verifica que la aplicación cargue correctamente
   - Prueba iniciar sesión

3. **Revisar Logs**:
   - Si hay errores, ve a **"Deployments"** → Haz clic en el despliegue → **"View Function Logs"**
   - Esto te ayudará a diagnosticar problemas

## 🔄 Paso 5: Configurar Dominio Personalizado (Opcional)

1. Ve a **"Settings"** → **"Domains"**
2. Agrega tu dominio personalizado
3. Sigue las instrucciones para configurar los DNS

## 📝 Variables de Entorno Necesarias

| Variable | Descripción | Dónde Obtenerla |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase | Supabase Dashboard → Settings → API → anon public key |

## 🐛 Solución de Problemas

### Error: "Build Failed"

1. **Revisa los logs de build**:
   - Ve a **"Deployments"** → Haz clic en el despliegue fallido → Revisa los logs

2. **Verifica las variables de entorno**:
   - Asegúrate de que todas las variables estén configuradas correctamente
   - Verifica que no haya espacios extra en los valores

3. **Verifica el package.json**:
   - Asegúrate de que el script `build` esté correcto: `"build": "next build"`

### Error: "Cannot connect to Supabase"

1. **Verifica las variables de entorno**:
   - Asegúrate de que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén configuradas
   - Verifica que los valores sean correctos (sin espacios, sin comillas)

2. **Verifica las políticas de RLS en Supabase**:
   - Asegúrate de que las políticas de Row Level Security estén configuradas correctamente

### Error: "Module not found"

1. **Verifica que todas las dependencias estén en package.json**:
   ```bash
   npm install
   ```

2. **Reconstruye el proyecto localmente**:
   ```bash
   npm run build
   ```

### La aplicación funciona localmente pero no en Vercel

1. **Verifica las variables de entorno**:
   - Las variables deben tener el prefijo `NEXT_PUBLIC_` para estar disponibles en el cliente
   - Asegúrate de que estén configuradas en Vercel

2. **Revisa los logs de runtime**:
   - Ve a **"Deployments"** → Haz clic en el despliegue → **"View Function Logs"**

## 🔄 Actualizaciones Automáticas

Vercel se conecta automáticamente a tu repositorio Git. Cada vez que hagas `git push`:

1. Vercel detectará los cambios
2. Creará un nuevo despliegue automáticamente
3. Te notificará cuando esté listo

### Desactivar despliegues automáticos (si es necesario):

1. Ve a **"Settings"** → **"Git"**
2. Desactiva **"Automatic deployments from Git"**

## 📊 Monitoreo y Analytics

Vercel incluye:
- **Analytics**: Estadísticas de visitas (requiere plan Pro)
- **Speed Insights**: Métricas de rendimiento
- **Logs**: Registros de errores y eventos

## 🎉 ¡Listo!

Tu aplicación ahora está desplegada en Vercel. Cada vez que hagas cambios y los subas a Git, Vercel los desplegará automáticamente.

## 📞 Soporte

- **Documentación de Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Comunidad**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)

