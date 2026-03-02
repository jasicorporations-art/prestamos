# 🚀 Desplegar como Proyecto NUEVO en Vercel

Este proyecto ahora está desconectado del proyecto anterior y se desplegará como un proyecto completamente nuevo.

## ✅ Paso 1: Desplegar a Vercel

Ejecuta este comando en PowerShell:

```powershell
vercel
```

Sigue las instrucciones:
- **Set up and deploy?** → Presiona **Y** (Sí)
- **Which scope?** → Selecciona tu cuenta: **jasicorporations-art**
- **Link to existing project?** → Presiona **N** (No, es un proyecto nuevo)
- **What's your project's name?** → Escribe un nombre, por ejemplo: `tienda-electrodomesticos-muebles` (o presiona Enter para el sugerido)
- **In which directory is your code located?** → Presiona **Enter** (usa `./`)

Esto creará un proyecto NUEVO en Vercel.

## 🔐 Paso 2: Configurar Variables de Entorno

Después del despliegue, necesitas agregar las variables de entorno. Tienes dos opciones:

### Opción A: Desde Vercel Dashboard (Más Fácil)

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu nuevo proyecto
3. Ve a **Settings** → **Environment Variables**
4. Agrega estas 2 variables:

**Variable 1:**
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://kpqvzkgsbawfqdsxjdjc.supabase.co`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Haz clic en **Save**

**Variable 2:**
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ6a2dzYmF3ZnFkc3hqZGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTQ4NTMsImV4cCI6MjA4MjQzMDg1M30.6TF4spG7V9Z9UvXslezSDCyxBwjM_-OAcEfZEVCvbng`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Haz clic en **Save**

5. Ve a **Deployments** y haz clic en **⋯** (tres puntos) del último deployment
6. Selecciona **Redeploy** para aplicar las variables

### Opción B: Desde la Terminal (CLI)

```powershell
# Agregar variable 1
vercel env add NEXT_PUBLIC_SUPABASE_URL production preview development
# Cuando te pida el valor, pega: https://kpqvzkgsbawfqdsxjdjc.supabase.co

# Agregar variable 2
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production preview development
# Cuando te pida el valor, pega: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ6a2dzYmF3ZnFkc3hqZGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTQ4NTMsImV4cCI6MjA4MjQzMDg1M30.6TF4spG7V9Z9UvXslezSDCyxBwjM_-OAcEfZEVCvbng

# Redesplegar a producción
vercel --prod
```

## ✅ Paso 3: Verificar

1. Ve a la URL que te dio Vercel (algo como: `https://tu-proyecto.vercel.app`)
2. Verifica que la aplicación carga correctamente
3. Prueba crear un producto para asegurarte de que todo funciona

## 📝 Notas

- ✅ Este es un proyecto completamente nuevo y separado
- ✅ No afectará tu proyecto original en Vercel
- ✅ Puedes tener ambos proyectos funcionando simultáneamente
- ✅ Las variables de entorno son las mismas que el proyecto original (misma base de datos Supabase)

---

¡Listo para desplegar! Ejecuta: `vercel`

