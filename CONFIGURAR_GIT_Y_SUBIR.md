# 🚀 Pasos Rápidos para Subir a Vercel

## ⚡ Configuración Inicial Rápida

### 1. Configurar Git (solo la primera vez)

Abre PowerShell en esta carpeta y ejecuta (reemplaza con tu información):

```powershell
git config user.name "Tu Nombre"
git config user.email "tu-email@ejemplo.com"
```

### 2. Hacer Commit Inicial

```powershell
git commit -m "Initial commit - Tienda de Electrodomésticos y Muebles"
```

### 3. Crear Repositorio en GitHub

1. Ve a https://github.com/new
2. Nombre: `tienda-electrodomesticos-muebles` (o el que prefieras)
3. Elige Private o Public
4. **NO marques** README, .gitignore, ni license
5. Haz clic en **Create repository**

### 4. Subir a GitHub

```powershell
# Reemplaza TU_USUARIO con tu usuario de GitHub
git remote add origin https://github.com/TU_USUARIO/tienda-electrodomesticos-muebles.git
git branch -M main
git push -u origin main
```

Si te pide credenciales:
- Usuario: Tu usuario de GitHub
- Contraseña: Un Personal Access Token (ver abajo)

### 5. Desplegar en Vercel

1. Ve a https://vercel.com/new
2. Selecciona **Import Git Repository**
3. Autoriza GitHub si es necesario
4. Selecciona tu repositorio: `tienda-electrodomesticos-muebles`
5. Configura variables de entorno (las mismas que tu proyecto original)
6. Haz clic en **Deploy**

¡Listo! 🎉

---

## 🔑 Crear Personal Access Token (si GitHub lo pide)

1. Ve a: https://github.com/settings/tokens
2. Click en **Generate new token (classic)**
3. Nombre: "Vercel Deployment"
4. Marca: `repo`
5. Generate token
6. **Copia el token** (solo se muestra una vez)
7. Úsalo como contraseña al hacer `git push`

---

**Guía completa**: Ver `DESPLEGAR_COPIA_VERCEL.md` para más detalles

