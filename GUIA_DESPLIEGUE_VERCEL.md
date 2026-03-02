# 🚀 Guía de Despliegue en Vercel - COUNT LEDGER

## 📋 Requisitos Previos

- ✅ Cuenta en Vercel (gratis): https://vercel.com/signup
- ✅ Proyecto en GitHub, GitLab o Bitbucket (recomendado)
- ✅ Variables de entorno de Supabase configuradas

## 🔧 Paso 1: Preparar el Proyecto

### 1.1 Verificar Archivos Necesarios

Asegúrate de tener estos archivos en tu proyecto:
- ✅ `package.json` - Configuración de dependencias
- ✅ `next.config.js` - Configuración de Next.js
- ✅ `vercel.json` - Configuración de Vercel (ya creado)
- ✅ `public/manifest.json` - Manifest de PWA
- ✅ `public/icons/icon-192x192.png` - Icono 192x192
- ✅ `public/icons/icon-512x512.png` - Icono 512x512

### 1.2 Verificar Build Local

Antes de desplegar, verifica que el proyecto compila correctamente:

```powershell
# Agregar Node.js al PATH si es necesario
$env:PATH += ";C:\Program Files\nodejs"

# Compilar el proyecto
npm run build
```

Si hay errores, corrígelos antes de continuar.

## 🌐 Paso 2: Desplegar en Vercel

### Opción A: Desde la Terminal (CLI) - Recomendado

1. **Iniciar sesión en Vercel:**
   ```powershell
   $env:PATH += ";C:\Program Files\nodejs"
   vercel login
   ```
   - Se abrirá el navegador para autenticarte
   - Autoriza la aplicación

2. **Desplegar el proyecto:**
   ```powershell
   vercel
   ```
   - Sigue las instrucciones en pantalla
   - Selecciona las opciones por defecto (presiona Enter)
   - Vercel detectará automáticamente que es un proyecto Next.js

3. **Desplegar a producción:**
   ```powershell
   vercel --prod
   ```

### Opción B: Desde el Dashboard de Vercel

1. **Ir a Vercel Dashboard:**
   - Ve a: https://vercel.com/dashboard
   - Haz clic en **"Add New Project"**

2. **Conectar repositorio:**
   - Si tu proyecto está en GitHub/GitLab/Bitbucket, conéctalo
   - O arrastra y suelta la carpeta del proyecto

3. **Configurar el proyecto:**
   - Framework: Next.js (detectado automáticamente)
   - Root Directory: `./` (raíz del proyecto)
   - Build Command: `npm run build` (automático)
   - Output Directory: `.next` (automático)

4. **Configurar Variables de Entorno:**
   - En la sección "Environment Variables", agrega:
     - `NEXT_PUBLIC_SUPABASE_URL` = `https://ganrgbdkzxktuymxdmzf.supabase.co`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `tu_clave_anonima_aqui`
   - ⚠️ **Importante:** Reemplaza `tu_clave_anonima_aqui` con tu clave real

5. **Desplegar:**
   - Haz clic en **"Deploy"**
   - Espera a que termine el build (2-5 minutos)

## 🔑 Paso 3: Configurar Variables de Entorno en Vercel

### Desde el Dashboard:

1. Ve a tu proyecto en Vercel Dashboard
2. Ve a **Settings** > **Environment Variables**
3. Agrega estas variables:

| Variable | Valor | Entornos |
|----------|-------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ganrgbdkzxktuymxdmzf.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `tu_clave_anonima_aqui` | Production, Preview, Development |

⚠️ **Importante:**
- Reemplaza `tu_clave_anonima_aqui` con tu clave real de Supabase
- Selecciona todos los entornos (Production, Preview, Development)
- Haz clic en **"Save"**

### Desde la Terminal:

```powershell
$env:PATH += ";C:\Program Files\nodejs"

# Agregar variable de entorno
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Pega: https://ganrgbdkzxktuymxdmzf.supabase.co
# Selecciona: Production, Preview, Development

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Pega tu clave anónima de Supabase
# Selecciona: Production, Preview, Development
```

## ✅ Paso 4: Verificar el Despliegue

1. **Obtener la URL:**
   - Después del despliegue, Vercel te dará una URL
   - Ejemplo: `https://tu-proyecto.vercel.app`

2. **Verificar que funciona:**
   - Abre la URL en tu navegador
   - Debe cargar la aplicación
   - Verifica que puedas iniciar sesión

3. **Verificar PWA:**
   - En Chrome/Edge: Ve a DevTools > Application > Manifest
   - Debe mostrar "COUNT LEDGER" como nombre
   - Los iconos deben aparecer correctamente

## 🔄 Paso 5: Actualizaciones Futuras

### Opción A: Desde la Terminal

```powershell
$env:PATH += ";C:\Program Files\nodejs"

# Desplegar cambios
vercel --prod
```

### Opción B: Desde Git (Recomendado)

Si conectaste tu repositorio:
1. Haz commit y push de tus cambios
2. Vercel desplegará automáticamente
3. Recibirás una notificación cuando termine

## 🐛 Solución de Problemas

### Error: "Environment variables not found"
- ✅ Verifica que agregaste las variables en Vercel Dashboard
- ✅ Asegúrate de que tienen el prefijo `NEXT_PUBLIC_`
- ✅ Verifica que seleccionaste todos los entornos

### Error: "Build failed"
- ✅ Verifica que el proyecto compila localmente: `npm run build`
- ✅ Revisa los logs de build en Vercel Dashboard
- ✅ Verifica que todas las dependencias están en `package.json`

### Error: "Supabase connection failed"
- ✅ Verifica que la URL de Supabase es correcta
- ✅ Verifica que la clave anónima es correcta
- ✅ Verifica que las políticas RLS en Supabase permiten acceso

### La PWA no funciona
- ✅ Verifica que `public/manifest.json` existe`
- ✅ Verifica que los iconos están en `public/icons/`
- ✅ Verifica que el manifest tiene el formato correcto

## 📱 Dominio Personalizado (Opcional)

1. Ve a **Settings** > **Domains** en Vercel Dashboard
2. Agrega tu dominio personalizado
3. Sigue las instrucciones para configurar DNS

## 🎉 ¡Listo!

Tu aplicación COUNT LEDGER estará disponible en:
- **URL de producción:** `https://tu-proyecto.vercel.app`
- **URLs de preview:** Se generan automáticamente para cada push

---

**¿Necesitas ayuda?** Revisa los logs en Vercel Dashboard > Deployments






