# 🔐 Configurar Variables de Entorno en Vercel (URGENTE)

## ⚠️ ERROR ACTUAL

El build está fallando porque las variables de entorno de Supabase **NO están configuradas** en Vercel.

```
Error: Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.
```

## ✅ SOLUCIÓN: Agregar Variables de Entorno

### Paso 1: Ir a Vercel Dashboard

1. Ve a: https://vercel.com/dashboard
2. Selecciona el proyecto: **tienda-electrodomesticos-muebles**
3. Ve a **Settings** → **Environment Variables**

### Paso 2: Agregar las Variables

Agrega estas **2 variables** (son obligatorias):

#### Variable 1: NEXT_PUBLIC_SUPABASE_URL
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://kpqvzkgsbawfqdsxjdjc.supabase.co`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Haz clic en **Save**

#### Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ6a2dzYmF3ZnFkc3hqZGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTQ4NTMsImV4cCI6MjA4MjQzMDg1M30.6TF4spG7V9Z9UvXslezSDCyxBwjM_-OAcEfZEVCvbng`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Haz clic en **Save**

### Paso 3: Redeploy (IMPORTANTE)

Después de agregar las variables:

1. Ve a la pestaña **Deployments**
2. Haz clic en los **tres puntos (⋯)** del último deployment (el que falló)
3. Selecciona **Redeploy**
4. O ejecuta: `vercel --prod`

## 📋 Valores de las Variables

```
NEXT_PUBLIC_SUPABASE_URL = https://kpqvzkgsbawfqdsxjdjc.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ6a2dzYmF3ZnFkc3hqZGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTQ4NTMsImV4cCI6MjA4MjQzMDg1M30.6TF4spG7V9Z9UvXslezSDCyxBwjM_-OAcEfZEVCvbng
```

## ⚠️ Importante

- Las variables **DEBEN** empezar con `NEXT_PUBLIC_` para que funcionen en Next.js
- Selecciona **Production**, **Preview** y **Development** para cada variable
- **Después de agregar las variables, SIEMPRE haz un Redeploy**

## 🔗 Enlace Directo

Ve directamente a configurar las variables:
https://vercel.com/johns-projects-9d4c1d75/tienda-electrodomesticos-muebles/settings/environment-variables

---

**Una vez configuradas las variables y hecho el redeploy, el build debería funcionar correctamente.**

