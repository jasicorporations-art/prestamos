# 🚀 Desplegar a tu Proyecto Vercel Existente

## 📋 Tu Proyecto Vercel

- **Deployment**: `nextjs-boilerplate-niyfuhxp3-johns-projects-9d4c1d75.vercel.app`
- **Domain**: `nextjs-boilerplate-lac-three-9wpilmv15v.vercel.app`

## ⚡ Método Rápido: Usando Vercel CLI

### Paso 1: Instalar Vercel CLI

Abre PowerShell o CMD y ejecuta:
```powershell
npm install -g vercel
```

### Paso 2: Iniciar Sesión

```powershell
vercel login
```
- Se abrirá tu navegador para autenticarte
- Acepta la conexión

### Paso 3: Navegar a tu Proyecto

```powershell
cd C:\Users\Owner\Documents\sisi
```

### Paso 4: Conectar con tu Proyecto Existente

```powershell
vercel link
```

Cuando te pregunte:
- **Set up and deploy?** → Presiona `Y` (Yes)
- **Which scope?** → Selecciona tu cuenta (johns-projects)
- **Link to existing project?** → Presiona `Y` (Yes)
- **What's the name of your existing project?** → Escribe: `nextjs-boilerplate`
- O selecciona el proyecto de la lista si aparece

### Paso 5: Configurar Variables de Entorno

**IMPORTANTE**: Sin estas variables, NO podrás iniciar sesión.

Ejecuta estos comandos uno por uno:

```powershell
vercel env add NEXT_PUBLIC_SUPABASE_URL production
```
- Cuando te pida el valor, pega tu URL de Supabase (ej: `https://xxxxx.supabase.co`)
- Presiona Enter

```powershell
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```
- Cuando te pida el valor, pega tu clave anónima de Supabase
- Presiona Enter

**Repite para Preview y Development** (opcional pero recomendado):

```powershell
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_URL development
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development
```

### Paso 6: Desplegar a Producción

```powershell
vercel --prod
```

Esto:
1. Construirá tu aplicación
2. La desplegará en producción
3. Te dará la URL donde está disponible

### Paso 7: Verificar

1. Ve a: `nextjs-boilerplate-lac-three-9wpilmv15v.vercel.app`
2. Deberías ver la página de login
3. Intenta iniciar sesión

## 🔐 Obtener Valores de Supabase

Si no tienes los valores de Supabase:

1. Ve a [supabase.com](https://supabase.com)
2. Inicia sesión
3. Selecciona tu proyecto
4. Ve a **Settings** (⚙️) → **API**
5. Copia:
   - **Project URL** → Para `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Para `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 🎯 Método Alternativo: Desde el Dashboard

Si prefieres usar la interfaz web:

### Paso 1: Subir Código a GitHub (Recomendado)

1. Crea una cuenta en [github.com](https://github.com) si no tienes
2. Crea un nuevo repositorio
3. Descarga GitHub Desktop o usa Git Bash para subir tu código

### Paso 2: Conectar en Vercel

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Busca tu proyecto `nextjs-boilerplate`
3. Ve a **Settings** → **Git**
4. Haz clic en **"Connect Git Repository"**
5. Selecciona tu repositorio de GitHub

### Paso 3: Configurar Variables

1. Ve a **Settings** → **Environment Variables**
2. Agrega:
   - **Key**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: Tu URL de Supabase
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
   - **Save**

3. Agrega la segunda:
   - **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value**: Tu clave anónima de Supabase
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
   - **Save**

### Paso 4: Desplegar

1. Ve a **Deployments**
2. Si tienes Git conectado, se desplegará automáticamente
3. Si no, haz clic en **"Redeploy"**

## ✅ Verificar que Funciona

1. **Abrir la aplicación**:
   - Ve a: `nextjs-boilerplate-lac-three-9wpilmv15v.vercel.app`
   - Deberías ver la página de login de JASICORPORATIONS

2. **Probar inicio de sesión**:
   - Si ya tienes usuarios, inicia sesión
   - Si no, ve a `/register` para crear uno

3. **Verificar base de datos**:
   - Asegúrate de que hayas ejecutado `supabase/schema.sql` en Supabase
   - Verifica que las tablas existan

## 🐛 Problemas Comunes

### "Cannot connect to Supabase"

**Solución**:
1. Verifica que las variables de entorno estén configuradas en Vercel
2. Verifica que los valores sean correctos (sin espacios)
3. Haz un **Redeploy** después de agregar las variables

### "Build Failed"

**Solución**:
1. Revisa los logs en Vercel Dashboard → Deployments
2. Prueba localmente: `npm run build`
3. Si funciona localmente, el problema puede ser las variables de entorno

### La página carga pero muestra errores

**Solución**:
1. Abre la consola del navegador (F12)
2. Revisa los errores
3. Verifica que las variables de entorno estén correctas
4. Verifica que la base de datos esté configurada en Supabase

## 📝 Checklist

Antes de probar el login, asegúrate de:

- [ ] Variables de entorno configuradas en Vercel
- [ ] Base de datos de Supabase configurada (schema.sql ejecutado)
- [ ] Tabla `codigos_registro` creada (si usas códigos de registro)
- [ ] Códigos de registro generados (si usas códigos de registro)
- [ ] Build exitoso en Vercel
- [ ] Aplicación accesible en el dominio

## 🎉 ¡Listo!

Una vez completado, podrás:
- Acceder a: `nextjs-boilerplate-lac-three-9wpilmv15v.vercel.app`
- Iniciar sesión con usuarios existentes
- Crear nuevos usuarios desde `/register`

