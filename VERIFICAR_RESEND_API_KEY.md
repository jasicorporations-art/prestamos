# 🔍 Verificar Configuración de RESEND_API_KEY en Vercel

## ✅ Pasos para Verificar y Configurar

### 1. Verificar el Nombre de la Variable

La variable debe llamarse exactamente: **`RESEND_API_KEY`** (sin espacios, sin guiones, todo en mayúsculas)

### 2. Configurar en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/johns-projects-9d4c1d75/sisi
2. Ve a **Settings** → **Environment Variables**
3. Busca la variable `RESEND_API_KEY`
4. Si no existe, agrega una nueva:
   - **Name:** `RESEND_API_KEY`
   - **Value:** Tu API key de Resend (debe comenzar con `re_`)
   - **Environment:** Selecciona todas (Production, Preview, Development)

### 3. Verificar el Valor

La API key de Resend debe:
- Comenzar con `re_`
- Tener aproximadamente 51 caracteres
- Ejemplo: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 4. Redesplegar Después de Configurar

**IMPORTANTE:** Después de agregar o modificar una variable de entorno en Vercel, debes redesplegar:

1. Ve a **Deployments**
2. Encuentra el último deployment
3. Haz clic en los tres puntos (⋯) → **Redeploy**
4. O simplemente haz un nuevo commit y push

### 5. Verificar que Funciona

Después del redeploy, verifica:

1. Ve a los logs del deployment en Vercel
2. Busca el mensaje de build
3. **NO debería aparecer:** `⚠️ RESEND_API_KEY no está configurada`
4. Si aparece, la variable no está configurada correctamente

## 🐛 Solución de Problemas

### El mensaje sigue apareciendo después de configurar

1. **Verifica el nombre exacto:**
   - Debe ser: `RESEND_API_KEY` (no `RESEND_API_KEY_` ni `resend_api_key`)

2. **Verifica que esté en todos los ambientes:**
   - Production ✅
   - Preview ✅
   - Development ✅

3. **Redesplega:**
   - Las variables de entorno solo se aplican en nuevos deployments

4. **Verifica los logs:**
   - En Vercel → Deployments → [Tu deployment] → Build Logs
   - Busca si hay errores relacionados con variables de entorno

### Cómo Obtener tu API Key de Resend

1. Ve a https://resend.com/api-keys
2. Inicia sesión en tu cuenta
3. Crea una nueva API key o copia una existente
4. La key debe comenzar con `re_`

## 📝 Nota Importante

El mensaje de advertencia aparece durante el **build**, pero esto es normal si la variable no está disponible en ese momento. Lo importante es que:

1. La variable esté configurada en Vercel
2. Se haya hecho un redeploy después de configurarla
3. La API funcione correctamente cuando se llame

Si la variable está configurada correctamente en Vercel y has hecho un redeploy, el mensaje puede seguir apareciendo en el build, pero la funcionalidad debería funcionar correctamente en runtime.

