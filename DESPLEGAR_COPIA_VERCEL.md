# 🚀 Guía para Subir la Copia del Proyecto a Vercel

Esta es una guía paso a paso para subir esta **copia** del proyecto a Vercel como un **proyecto nuevo y separado** del original.

## 📋 Requisitos Previos

1. ✅ Cuenta en GitHub (gratis): https://github.com/signup
2. ✅ Cuenta en Vercel (gratis): https://vercel.com/signup
3. ✅ Git instalado en tu computadora

## 🔧 Paso 1: Crear Repositorio en GitHub

1. **Ve a GitHub.com** e inicia sesión
2. **Haz clic en el botón "+"** (arriba a la derecha) → **"New repository"**
3. **Configura el repositorio:**
   - **Repository name**: `tienda-electrodomesticos-muebles` (o el nombre que prefieras)
   - **Description**: "Tienda de Electrodomésticos y Muebles - PWA"
   - **Visibility**: Elige **Public** o **Private** (recomiendo Private)
   - ⚠️ **NO marques** "Add a README file", "Add .gitignore", ni "Choose a license"
   - Haz clic en **"Create repository"**

4. **Copia la URL del repositorio** (la verás después de crearlo)
   - Ejemplo: `https://github.com/TU_USUARIO/tienda-electrodomesticos-muebles.git`

## 📤 Paso 2: Subir el Código a GitHub

Abre PowerShell en la carpeta del proyecto y ejecuta:

```powershell
# Conectar con el repositorio de GitHub
git remote add origin https://github.com/TU_USUARIO/tienda-electrodomesticos-muebles.git

# Cambiar a la rama main
git branch -M main

# Subir el código
git push -u origin main
```

**Nota**: Si GitHub te pide credenciales:
- **Usuario**: Tu usuario de GitHub
- **Contraseña**: Necesitarás un **Personal Access Token** (ver abajo)

### Si necesitas crear un Personal Access Token:

1. Ve a GitHub → **Settings** (tu perfil) → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Haz clic en **"Generate new token (classic)"**
3. Configura:
   - **Note**: "Vercel Deployment"
   - **Expiration**: Elige un tiempo (90 días, 1 año, etc.)
   - **Scopes**: Marca `repo` (acceso completo a repositorios)
4. Haz clic en **"Generate token"**
5. **Copia el token inmediatamente** (solo se muestra una vez)
6. Úsalo como contraseña cuando Git te la pida

## 🚀 Paso 3: Desplegar en Vercel

### Opción A: Desde el Dashboard de Vercel (Recomendado)

1. **Ve a Vercel.com** e inicia sesión
2. **Haz clic en "Add New..."** → **"Project"**
3. **Importar desde Git:**
   - Si es la primera vez, autoriza Vercel para acceder a tu GitHub
   - Busca y selecciona tu repositorio: `tienda-electrodomesticos-muebles`
   - Haz clic en **"Import"**

4. **Configurar el Proyecto:**
   - **Framework Preset**: Next.js (se detecta automáticamente)
   - **Root Directory**: `./` (dejar por defecto)
   - **Build Command**: `npm run build` (ya está configurado)
   - **Output Directory**: `.next` (por defecto)
   - **Install Command**: `npm install` (por defecto)

5. **Configurar Variables de Entorno:**
   
   Haz clic en **"Environment Variables"** y agrega:
   
   ```
   NEXT_PUBLIC_SUPABASE_URL = tu_url_de_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY = tu_clave_anonima_de_supabase
   ```
   
   **Importante**: 
   - Reemplaza con tus valores reales de Supabase
   - Marca: ✅ **Production**, ✅ **Preview**, ✅ **Development**
   - Haz clic en **"Add"** para cada variable

6. **Desplegar:**
   - Haz clic en **"Deploy"**
   - Espera 2-3 minutos mientras Vercel construye y despliega
   - Verás el progreso en tiempo real

7. **¡Listo!** 🎉
   - Tu aplicación estará disponible en: `https://tu-proyecto.vercel.app`
   - Vercel te dará la URL completa al finalizar

### Opción B: Desde la Línea de Comandos (CLI)

Si prefieres usar la terminal:

```powershell
# Instalar Vercel CLI (si no lo tienes)
npm install -g vercel

# Iniciar sesión en Vercel
vercel login

# Desplegar (primera vez - creará un proyecto nuevo)
vercel

# Seguir las instrucciones:
# - Set up and deploy? Y
# - Which scope? (Selecciona tu cuenta)
# - Link to existing project? N (es un proyecto nuevo)
# - Project name? (deja el nombre sugerido o pon uno nuevo)
# - Directory? ./

# Desplegar a producción
vercel --prod
```

## 🔄 Paso 4: Despliegues Automáticos Futuros

Una vez conectado a GitHub, Vercel desplegará automáticamente cada vez que hagas:

```powershell
git add .
git commit -m "Tu mensaje"
git push
```

Cada `git push` activará un nuevo deployment en Vercel. 🚀

## 📝 Notas Importantes

1. **Este es un proyecto separado**: No afectará tu proyecto original en Vercel
2. **Mismo código, proyecto diferente**: Puedes tener ambos proyectos funcionando simultáneamente
3. **Variables de entorno**: Asegúrate de configurar las mismas variables que en el proyecto original
4. **Base de datos**: Si usas la misma base de datos Supabase, ambos proyectos compartirán los datos

## ✅ Verificar que Funciona

1. Ve a la URL que te dio Vercel: `https://tu-proyecto.vercel.app`
2. Verifica que la aplicación carga correctamente
3. Prueba iniciar sesión y crear un producto para asegurarte de que todo funciona

## 🆘 Solución de Problemas

### Error: "Build failed"
- Revisa los logs en Vercel Dashboard → Deployments → Tu deployment → Build Logs
- Verifica que todas las variables de entorno estén configuradas
- Asegúrate de que el proyecto compile localmente con `npm run build`

### Error: "Module not found"
- Verifica que `package.json` tenga todas las dependencias
- Asegúrate de que no haya errores de importación en el código

### Error al hacer git push
- Verifica que tengas permisos en el repositorio de GitHub
- Asegúrate de usar un Personal Access Token si GitHub te lo pide

---

¡Listo! Tu copia del proyecto ahora está en Vercel como un proyecto nuevo y separado. 🎉

