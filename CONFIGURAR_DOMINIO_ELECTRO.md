# 🌐 Configurar Dominio electro.jasicorporations.com en Vercel

El proyecto está desplegado pero necesita configurar el dominio personalizado `electro.jasicorporations.com`.

## 📋 Pasos para Configurar el Dominio

### Paso 1: Ir a Vercel Dashboard

1. Ve a: https://vercel.com/dashboard
2. Inicia sesión con tu cuenta
3. Busca y selecciona el proyecto: **tienda-electrodomesticos-muebles**

### Paso 2: Agregar el Dominio Personalizado

1. En la página del proyecto, haz clic en **"Settings"** (Configuración)
2. En el menú lateral izquierdo, haz clic en **"Domains"** (Dominios)
3. Verás una lista de dominios actuales (si hay alguno)
4. Haz clic en el botón **"Add Domain"** o **"Add"**
5. En el campo que aparece, escribe: **electro.jasicorporations.com**
6. Haz clic en **"Add"** o **"Continue"**

### Paso 3: Configurar DNS (Si es necesario)

Si Vercel te pide configurar DNS, necesitarás:

1. **Obtener los registros DNS de Vercel**:
   - Vercel te mostrará los valores que necesitas
   - Normalmente es un registro CNAME o A

2. **Ir a tu proveedor de DNS** (donde administras jasicorporations.com):
   - Puede ser GoDaddy, Namecheap, Cloudflare, etc.
   
3. **Agregar el registro DNS**:
   - Tipo: CNAME (o A según lo que indique Vercel)
   - Nombre: `electro` (el subdominio)
   - Valor: El que te proporcione Vercel (algo como `cname.vercel-dns.com` o una IP)

4. **Esperar la propagación DNS** (puede tardar unos minutos hasta 24 horas)

### Paso 4: Verificar el Dominio

1. Vercel verificará automáticamente el dominio
2. Cuando esté listo, verás un check verde (✓) junto al dominio
3. El dominio estará activo y funcionando

## ⚠️ Nota Importante

**El dominio `electro.jasicorporations.com` debe estar disponible y configurado en tu proveedor de DNS.**

Si `jasicorporations.com` ya está configurado con Vercel (por ejemplo, `dealers.jasicorporations.com`), puedes agregar otro subdominio sin problemas.

## 🔄 Si el Dominio Ya Está en Uso

Si `electro.jasicorporations.com` ya está siendo usado por otro proyecto en Vercel:

1. Primero debes eliminar el dominio del proyecto anterior
2. O contacta al administrador de la cuenta para moverlo

## ✅ Después de Configurar

Una vez configurado el dominio, tu aplicación estará disponible en:
- **https://electro.jasicorporations.com**

La URL automática de Vercel seguirá funcionando también:
- **https://tienda-electrodomesticos-muebles.vercel.app**

---

**¿Necesitas ayuda?** Ve a Vercel Dashboard → tu proyecto → Settings → Domains

