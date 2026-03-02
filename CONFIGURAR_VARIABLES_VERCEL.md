# 🔐 Configurar Variables de Entorno en Vercel

## ✅ Variables Verificadas

Tus credenciales de Supabase son:

### Variable 1: NEXT_PUBLIC_SUPABASE_URL
```
https://kpqvzkgsbawfqdsxjdjc.supabase.co
```

### Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ6a2dzYmF3ZnFkc3hqZGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTQ4NTMsImV4cCI6MjA4MjQzMDg1M30.6TF4spG7V9Z9UvXslezSDCyxBwjM_-OAcEfZEVCvbng
```

## ✅ Verificación

- ✅ **URL**: Formato correcto de Supabase
- ✅ **Anon Key**: Formato JWT correcto
- ✅ **Variables**: Listas para usar en Vercel

## 🚀 Cómo Configurarlas en Vercel

### Método 1: Desde el Dashboard de Vercel (Recomendado)

1. **Ir a tu proyecto en Vercel**:
   - Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
   - Busca tu proyecto: `nextjs-boilerplate`
   - O ve directamente a: `nextjs-boilerplate-niyfuhxp3-johns-projects-9d4c1d75.vercel.app`

2. **Ir a Settings**:
   - Haz clic en **Settings** (en el menú superior)
   - Luego haz clic en **Environment Variables** (en el menú lateral)

3. **Agregar Primera Variable**:
   - Haz clic en **"Add New"**
   - **Key**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: `https://kpqvzkgsbawfqdsxjdjc.supabase.co`
   - **Environments**: Selecciona las tres opciones:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
   - Haz clic en **"Save"**

4. **Agregar Segunda Variable**:
   - Haz clic en **"Add New"** nuevamente
   - **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ6a2dzYmF3ZnFkc3hqZGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTQ4NTMsImV4cCI6MjA4MjQzMDg1M30.6TF4spG7V9Z9UvXslezSDCyxBwjM_-OAcEfZEVCvbng`
   - **Environments**: Selecciona las tres opciones:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
   - Haz clic en **"Save"**

5. **Redeploy** (Importante):
   - Ve a **Deployments**
   - Haz clic en los tres puntos (⋯) del último deployment
   - Selecciona **"Redeploy"**
   - O simplemente espera al próximo push a Git (si tienes Git conectado)

### Método 2: Desde la CLI de Vercel

Abre PowerShell en la carpeta del proyecto y ejecuta:

```powershell
# Conectar con el proyecto (si no lo has hecho)
vercel link

# Agregar primera variable
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Cuando te pida el valor, pega: https://kpqvzkgsbawfqdsxjdjc.supabase.co

# Agregar segunda variable
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Cuando te pida el valor, pega: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ6a2dzYmF3ZnFkc3hqZGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTQ4NTMsImV4cCI6MjA4MjQzMDg1M30.6TF4spG7V9Z9UvXslezSDCyxBwjM_-OAcEfZEVCvbng

# (Opcional) Agregar también para Preview y Development
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_URL development
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development

# Desplegar a producción
vercel --prod
```

## ✅ Verificar que Funcionó

1. **Esperar a que termine el redeploy**:
   - Ve a **Deployments** en Vercel
   - Espera a que el estado sea "Ready" (verde)

2. **Probar la aplicación**:
   - Ve a: `nextjs-boilerplate-lac-three-9wpilmv15v.vercel.app`
   - Deberías ver la página de login de JASICORPORATIONS

3. **Probar inicio de sesión**:
   - Intenta iniciar sesión con un usuario existente
   - Si no tienes usuarios, ve a `/register` para crear uno

## 🔍 Verificar Variables Configuradas

Para verificar que las variables están configuradas:

1. Ve a **Settings** → **Environment Variables**
2. Deberías ver:
   - `NEXT_PUBLIC_SUPABASE_URL` con valor `https://kpqvzkgsbawfqdsxjdjc.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` con el token JWT

## ⚠️ Importante

- **NO compartas estas credenciales públicamente**
- **NO las subas a Git** (ya están en `.gitignore`)
- **Solo úsalas en Vercel** (variables de entorno seguras)

## 🐛 Si No Funciona

1. **Verifica que las variables estén en Vercel**:
   - Settings → Environment Variables
   - Deben estar en Production, Preview y Development

2. **Haz un Redeploy**:
   - Las variables solo se aplican en nuevos deployments
   - Ve a Deployments → Redeploy

3. **Revisa los logs**:
   - Ve a Deployments → Haz clic en el deployment → View Function Logs
   - Busca errores relacionados con Supabase

4. **Verifica la base de datos**:
   - Asegúrate de que hayas ejecutado `supabase/schema.sql` en Supabase
   - Verifica que las tablas existan

## 🎉 ¡Listo!

Una vez configuradas las variables y hecho el redeploy, tu aplicación debería funcionar correctamente en:
- `nextjs-boilerplate-lac-three-9wpilmv15v.vercel.app`



