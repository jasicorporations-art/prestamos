# 📦 Guía para Conectar el Proyecto a Git y Vercel

## Paso 1: Instalar Git

### Opción A: Descargar Git para Windows
1. Ve a: https://git-scm.com/download/win
2. Descarga el instalador (se descargará automáticamente)
3. Ejecuta el instalador
4. Durante la instalación, acepta las opciones por defecto
5. **Importante**: Asegúrate de marcar "Add Git to PATH" cuando te pregunte

### Opción B: Instalar con winget (si lo tienes)
```powershell
winget install Git.Git
```

## Paso 2: Verificar la Instalación

Abre una **nueva** ventana de PowerShell y ejecuta:
```powershell
git --version
```

Si ves algo como `git version 2.x.x`, Git está instalado correctamente.

## Paso 3: Configurar Git (Primera vez)

Abre PowerShell y ejecuta estos comandos (reemplaza con tu información):

```powershell
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

## Paso 4: Inicializar el Repositorio Git

Abre PowerShell en la carpeta del proyecto y ejecuta:

```powershell
cd C:\Users\Owner\.cursor
git init
git add .
git commit -m "Initial commit - JasiCorporations Gestión de Préstamos"
```

## Paso 5: Crear Repositorio en GitHub

1. Ve a [github.com](https://github.com) e inicia sesión (o crea una cuenta)
2. Haz clic en el botón **"+"** en la esquina superior derecha
3. Selecciona **"New repository"**
4. Configura el repositorio:
   - **Repository name**: `jasicorporations-gestion-prestamos` (o el nombre que prefieras)
   - **Description**: "Sistema de gestión de préstamos y clientes"
   - **Visibility**: Private (recomendado) o Public
   - **NO marques** "Initialize this repository with a README" (ya tenemos código)
5. Haz clic en **"Create repository"**

## Paso 6: Conectar el Repositorio Local con GitHub

GitHub te mostrará comandos. Ejecuta estos en PowerShell (reemplaza `TU_USUARIO` con tu usuario de GitHub):

```powershell
cd C:\Users\Owner\.cursor
git remote add origin https://github.com/TU_USUARIO/jasicorporations-gestion-prestamos.git
git branch -M main
git push -u origin main
```

Cuando te pida credenciales:
- **Usuario**: Tu usuario de GitHub
- **Contraseña**: Necesitarás un **Personal Access Token** (ver abajo)

## Paso 7: Crear Personal Access Token (Si es necesario)

Si GitHub te pide autenticación:

1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Haz clic en **"Generate new token (classic)"**
3. Configura:
   - **Note**: "Vercel Deployment"
   - **Expiration**: Elige un tiempo (90 días, 1 año, etc.)
   - **Scopes**: Marca `repo` (acceso completo a repositorios)
4. Haz clic en **"Generate token"**
5. **Copia el token inmediatamente** (solo se muestra una vez)
6. Úsalo como contraseña cuando Git te la pida

## Paso 8: Conectar Vercel con GitHub

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Haz clic en tu proyecto: **cursor-nu-black**
3. Ve a **Settings** → **Git**
4. Haz clic en **"Connect Git Repository"**
5. Selecciona **GitHub**
6. Autoriza a Vercel si es necesario
7. Selecciona tu repositorio: `jasicorporations-gestion-prestamos`
8. Haz clic en **"Connect"**

## Paso 9: Configurar Variables de Entorno en Vercel

1. En Vercel, ve a **Settings** → **Environment Variables**
2. Agrega estas variables (si no las tienes):

```
NEXT_PUBLIC_SUPABASE_URL = https://kpqvzkgsbawfqdsxjdjc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ6a2dzYmF3ZnFkc3hqZGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTQ4NTMsImV4cCI6MjA4MjQzMDg1M30.6TF4spG7V9Z9UvXslezSDCyxBwjM_-OAcEfZEVCvbng
```

3. Selecciona: ✅ Production, ✅ Preview, ✅ Development
4. Haz clic en **Save**

## Paso 10: Desplegar

Una vez conectado a Git, Vercel desplegará automáticamente cuando hagas `git push`.

O puedes hacer un redeploy manual:
1. Ve a **Deployments**
2. Haz clic en los tres puntos del último deployment
3. Selecciona **"Redeploy"**

## ✅ Verificar que Funciona

1. Ve a la URL de producción de Vercel
2. Deberías ver tu aplicación funcionando
3. Prueba la funcionalidad de clientes con subida de documentos

## 🔧 Comandos Útiles

### Ver el estado de Git:
```powershell
git status
```

### Agregar cambios:
```powershell
git add .
git commit -m "Descripción de los cambios"
git push
```

### Ver los remotos configurados:
```powershell
git remote -v
```

## 🐛 Solución de Problemas

### Error: "git no se reconoce como comando"
- Git no está en el PATH
- Cierra y abre PowerShell nuevamente después de instalar Git
- O reinicia la computadora

### Error: "authentication failed"
- Usa un Personal Access Token en lugar de tu contraseña
- Asegúrate de que el token tenga permisos de `repo`

### Error: "repository not found"
- Verifica que el nombre del repositorio sea correcto
- Verifica que tengas acceso al repositorio
- Asegúrate de que el repositorio exista en GitHub

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Vercel Dashboard
2. Verifica que todos los archivos estén en GitHub
3. Asegúrate de que las variables de entorno estén configuradas









