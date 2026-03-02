# 🚀 Instrucciones Simples para Git

## ✅ Git está Instalado

Git está instalado en tu computadora, pero PowerShell no lo encuentra.

## Solución Rápida: Usar Git Bash

**Git Bash** es una terminal que viene con Git y funciona perfectamente. Es más fácil de usar.

### Paso 1: Abrir Git Bash
1. Presiona la tecla **Windows**
2. Escribe: **"Git Bash"**
3. Haz clic en **"Git Bash"**

### Paso 2: Ir a tu proyecto
En Git Bash, escribe:
```bash
cd /c/Users/Owner/.cursor
```

### Paso 3: Verificar que Git funciona
```bash
git --version
```

Deberías ver: `git version 2.x.x`

### Paso 4: Inicializar Git
```bash
git init
git add .
git commit -m "Initial commit"
```

### Paso 5: Crear repositorio en GitHub
1. Ve a [github.com](https://github.com)
2. Inicia sesión
3. Haz clic en **"+"** → **"New repository"**
4. Nombre: `jasicorporations-gestion-prestamos`
5. Haz clic en **"Create repository"**

### Paso 6: Conectar y subir
GitHub te dará comandos. En Git Bash, ejecuta (reemplaza TU_USUARIO):
```bash
git remote add origin https://github.com/TU_USUARIO/jasicorporations-gestion-prestamos.git
git branch -M main
git push -u origin main
```

Cuando te pida usuario/contraseña:
- **Usuario**: Tu usuario de GitHub
- **Contraseña**: Necesitas un **Personal Access Token** (ver abajo)

### Paso 7: Crear Token de GitHub
Si GitHub te pide autenticación:

1. GitHub.com → Tu foto (arriba derecha) → **Settings**
2. Abajo a la izquierda → **Developer settings**
3. **Personal access tokens** → **Tokens (classic)**
4. **Generate new token (classic)**
5. Marca la casilla **"repo"** (full control)
6. Haz clic en **"Generate token"** al final
7. **Copia el token** (solo se muestra una vez)
8. Úsalo como contraseña cuando Git lo pida

### Paso 8: Conectar Vercel
1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Tu proyecto → **Settings** → **Git**
3. **Connect Git Repository**
4. Selecciona GitHub y autoriza
5. Selecciona tu repositorio
6. ¡Listo! Vercel desplegará automáticamente

## 🔄 Para Futuros Cambios

Cada vez que hagas cambios:
```bash
cd /c/Users/Owner/.cursor
git add .
git commit -m "Descripción de los cambios"
git push
```

Vercel desplegará automáticamente.

## 📝 Nota

**Git Bash** es igual de bueno que PowerShell para Git. Puedes usarlo para todos los comandos Git sin problema.









