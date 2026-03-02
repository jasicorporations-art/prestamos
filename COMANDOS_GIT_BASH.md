# 📋 Comandos para Ejecutar en Git Bash

## ✅ Si ya ejecutaste git init y git add

Continúa con estos comandos:

### 1. Hacer el commit inicial
```bash
git commit -m "Initial commit - JasiCorporations Gestión de Préstamos con subida de documentos móvil"
```

### 2. Crear repositorio en GitHub

**PRIMERO** crea el repositorio en GitHub:
1. Ve a: https://github.com/new
2. **Repository name**: `jasicorporations-gestion-prestamos`
3. **Description**: "Sistema de gestión de préstamos y clientes"
4. Elige **Private** o **Public**
5. **NO marques** "Add a README file"
6. Haz clic en **"Create repository"**

### 3. Conectar tu repositorio local con GitHub

Después de crear el repositorio en GitHub, ejecuta estos comandos en Git Bash:

**Reemplaza `TU_USUARIO` con tu usuario de GitHub:**

```bash
git remote add origin https://github.com/TU_USUARIO/jasicorporations-gestion-prestamos.git
git branch -M main
git push -u origin main
```

### 4. Autenticación

Cuando ejecutes `git push`, te pedirá:
- **Username**: Tu usuario de GitHub
- **Password**: Necesitas un **Personal Access Token** (NO uses tu contraseña normal)

#### Crear Personal Access Token:
1. Ve a: https://github.com/settings/tokens
2. Haz clic en **"Generate new token (classic)"**
3. **Note**: "Vercel Deployment"
4. Marca la casilla **"repo"** (acceso completo a repositorios)
5. Haz clic en **"Generate token"** al final
6. **Copia el token** (solo se muestra una vez)
7. Úsalo como contraseña cuando Git lo pida

### 5. Verificar que se subió

Ve a tu repositorio en GitHub:
`https://github.com/TU_USUARIO/jasicorporations-gestion-prestamos`

Deberías ver todos tus archivos ahí.

## 🔄 Comandos para Futuros Cambios

Cada vez que hagas cambios y quieras subirlos:

```bash
cd /c/Users/Owner/.cursor
git add .
git commit -m "Descripción de los cambios"
git push
```

## 🔗 Conectar Vercel

Una vez que tu código esté en GitHub:

1. Ve a: https://vercel.com/dashboard
2. Haz clic en tu proyecto: **cursor-nu-black**
3. Ve a **Settings** → **Git**
4. Haz clic en **"Connect Git Repository"**
5. Selecciona **GitHub** y autoriza
6. Selecciona tu repositorio: `jasicorporations-gestion-prestamos`
7. Haz clic en **"Connect"**

Vercel desplegará automáticamente cada vez que hagas `git push`.









