# Conectar el proyecto prestamos con GitHub y Railway

Tu proyecto está en tu PC. Para que Railway lo despliegue, primero debe estar en **GitHub**. Sigue estos pasos.

---

## Parte 1: Subir el proyecto a GitHub

### 1. Crear el repositorio en GitHub

1. Entra a [github.com](https://github.com) e inicia sesión.
2. Clic en **"+"** (arriba a la derecha) → **"New repository"**.
3. **Repository name:** por ejemplo `prestamos` o `prestamos-jasicorporations` (el que prefieras).
4. **Public** o **Private**, como quieras.
5. **No** marques "Add a README" (ya tienes código local).
6. Clic en **"Create repository"**.

GitHub te mostrará una URL del repo, por ejemplo:
- `https://github.com/TU_USUARIO/prestamos.git`
- o `git@github.com:TU_USUARIO/prestamos.git`

Cópiala; la usarás en el siguiente paso.

### 2. Conectar tu carpeta local con ese repositorio

Abre **PowerShell** o **Git Bash** en la carpeta del proyecto y ejecuta (sustituye la URL por la de tu repo):

```powershell
cd "C:\Users\Owner\Documents\prestamos.jasicorporations.com"

# Ver si ya hay un remote
git remote -v

# Si no hay "origin" o quieres reemplazarlo, añade el repo de GitHub:
git remote add origin https://github.com/TU_USUARIO/prestamos.git
# Si ya existía "origin" y quieres cambiarlo:
# git remote set-url origin https://github.com/TU_USUARIO/prestamos.git

# Hacer el primer commit si aún no hay commits
git add .
git status
git commit -m "Initial commit: proyecto prestamos"

# Subir a GitHub (rama main)
git branch -M main
git push -u origin main
```

- Si te pide usuario/contraseña, usa tu usuario de GitHub y un **Personal Access Token** (no la contraseña de la cuenta). Crear token: GitHub → Settings → Developer settings → Personal access tokens.
- Si ya tenías commits y solo faltaba el remote, con `git push -u origin main` basta.

### 3. Comprobar en GitHub

Entra a tu repo en GitHub y revisa que se vean los archivos (app, package.json, prisma, etc.). Cuando eso esté, pasa a Railway.

---

## Parte 2: Conectar Railway con ese repositorio de GitHub

1. Entra a [railway.app](https://railway.app) e inicia sesión (con GitHub si quieres).
2. **"New Project"** (o "Add a project").
3. Elige **"Deploy from GitHub repo"**.
4. Si te pide, autoriza a Railway para ver tus repos de GitHub.
5. En la lista, busca y elige el repositorio que creaste (ej. **prestamos** o **prestamos-jasicorporations**).
6. Railway creará un **servicio** y empezará el primer deploy.
7. Antes de que termine (o después), en ese servicio:
   - Ve a **Variables** y añade las que necesita la app, por ejemplo:
     - **DATABASE_URL**
     - **DIRECT_URL**
     - **NEXT_PUBLIC_SUPABASE_URL**
     - **NEXT_PUBLIC_SUPABASE_ANON_KEY**
     - **SUPABASE_SERVICE_ROLE_KEY**
     - (y las demás que uses en producción; puedes basarte en tu `.env.railway` o `.env.local`.)

A partir de ahí, cada **push a la rama conectada** (por ejemplo `main`) volverá a desplegar en Railway.

---

## Si ya tienes otro repositorio “prestamos” en GitHub

- Si ese repo **es** este mismo proyecto (mismo código), en tu PC solo tienes que tener el **remote** apuntando a ese repo y hacer **push** desde tu carpeta local (como en la Parte 1, pero con la URL de ese repo).
- Luego en Railway eliges **"Deploy from GitHub repo"** y seleccionas **ese** repositorio.

Si me dices el nombre exacto del repo en GitHub (ej. `jasicorporations/prestamos`) o si aún no lo has creado, te puedo dar los comandos exactos con esa URL.
