# 🌐 Configurar Dominio electro.jasicorporations.com en Vercel

## ⚠️ IMPORTANTE

El dominio **NO se configura en el código**, se configura en **Vercel Dashboard**.

El script de despliegue (`deploy.bat` o `vercel --prod`) solo despliega el código. El dominio se configura por separado en la interfaz web de Vercel.

## 📋 Pasos para Configurar el Dominio

### Paso 1: Ir a Vercel Dashboard

1. Ve a: https://vercel.com/dashboard
2. Inicia sesión
3. Busca el proyecto: **tienda-electrodomesticos-muebles**
4. Haz clic en el proyecto

### Paso 2: Agregar Dominio Personalizado

1. En el menú superior, haz clic en **"Settings"**
2. En el menú lateral izquierdo, haz clic en **"Domains"**
3. Haz clic en el botón **"Add Domain"** o **"Add"**
4. Escribe: **electro.jasicorporations.com**
5. Haz clic en **"Add"** o **"Continue"**

### Paso 3: Configurar DNS (Si es necesario)

Si Vercel te muestra instrucciones de DNS:

1. **Copia los valores que te da Vercel** (generalmente un registro CNAME o A)
2. Ve a tu proveedor de DNS (donde administras jasicorporations.com)
3. Agrega un registro:
   - **Tipo**: CNAME (o A según lo que indique Vercel)
   - **Nombre/Host**: `electro`
   - **Valor/Destino**: El que te proporcione Vercel
4. Guarda los cambios
5. Espera la propagación DNS (puede tardar desde minutos hasta 24 horas)

### Paso 4: Verificar

- Vercel verificará automáticamente el dominio
- Cuando esté listo, verás un ✓ verde junto al dominio
- Tu aplicación estará disponible en: **https://electro.jasicorporations.com**

## ✅ Estado Actual

**Proyecto desplegado correctamente:**
- Nombre del proyecto: `tienda-electrodomesticos-muebles`
- URL de Vercel: `https://tienda-electrodomesticos-muebles.vercel.app`
- **Falta configurar**: Dominio personalizado `electro.jasicorporations.com`

## 📝 Notas

- El dominio `dealers.jasicorporations.com` pertenece al proyecto `cursor-nu-black` (el original)
- Puedes tener múltiples subdominios: `dealers.jasicorporations.com` y `electro.jasicorporations.com`
- Ambos pueden funcionar simultáneamente apuntando a proyectos diferentes

## 🔗 Enlaces Útiles

- Dashboard del proyecto: https://vercel.com/johns-projects-9d4c1d75/tienda-electrodomesticos-muebles
- Configurar dominio: https://vercel.com/johns-projects-9d4c1d75/tienda-electrodomesticos-muebles/settings/domains

