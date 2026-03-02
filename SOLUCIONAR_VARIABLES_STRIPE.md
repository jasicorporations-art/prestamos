# 🔧 Solución: Variables de Stripe No Configuradas

## ❌ Problema Detectado

El endpoint de prueba muestra que todas las variables de Stripe están faltando:
- `STRIPE_SECRET_KEY`: ❌ No configurada
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: ❌ No configurada
- `STRIPE_WEBHOOK_SECRET`: ❌ No configurada
- `NEXT_PUBLIC_APP_URL`: ❌ No configurada

## ✅ Solución Paso a Paso

### Paso 1: Verificar Variables en Vercel

1. **Ve a [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Selecciona tu proyecto** (`sisi` o el nombre de tu proyecto)
3. **Ve a Settings** (Configuración) → **Environment Variables** (Variables de Entorno)
4. **Verifica que estas 4 variables estén presentes**:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_APP_URL`

### Paso 2: Agregar Variables (Si Faltan)

Si alguna variable no está presente, agrégala:

#### Variable 1: STRIPE_SECRET_KEY
1. **Haz clic en "Add New"** (Agregar Nueva)
2. **Name**: `STRIPE_SECRET_KEY`
3. **Value**: Tu clave secreta de Stripe (empieza con `sk_test_` o `sk_live_`)
4. **Environments**: ✅ Marca todas (Production, Preview, Development)
5. **Haz clic en "Save"**

#### Variable 2: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
1. **Haz clic en "Add New"**
2. **Name**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. **Value**: Tu clave pública de Stripe (empieza con `pk_test_` o `pk_live_`)
4. **Environments**: ✅ Marca todas
5. **Haz clic en "Save"**

#### Variable 3: STRIPE_WEBHOOK_SECRET
1. **Haz clic en "Add New"**
2. **Name**: `STRIPE_WEBHOOK_SECRET`
3. **Value**: El secreto del webhook de Stripe (empieza con `whsec_`)
   - Para obtenerlo: Ve a [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
   - Haz clic en tu webhook
   - Copia el "Signing secret"
4. **Environments**: ✅ Marca todas
5. **Haz clic en "Save"**

#### Variable 4: NEXT_PUBLIC_APP_URL
1. **Haz clic en "Add New"**
2. **Name**: `NEXT_PUBLIC_APP_URL`
3. **Value**: `https://sisi-seven.vercel.app`
4. **Environments**: ✅ Marca todas
5. **Haz clic en "Save"**

### Paso 3: Obtener Claves de Stripe (Si No Las Tienes)

Si no tienes las claves de Stripe:

1. **Ve a [Stripe Dashboard](https://dashboard.stripe.com/)**
2. **Inicia sesión** o crea una cuenta
3. **Ve a Developers > API keys**
4. **Copia**:
   - **Publishable key** (empieza con `pk_test_` para pruebas)
   - **Secret key** (empieza con `sk_test_` para pruebas)
   - ⚠️ **Haz clic en "Reveal test key"** para ver la clave secreta

### Paso 4: Configurar Webhook en Stripe (Si No Lo Has Hecho)

1. **Ve a [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)**
2. **Haz clic en "Add endpoint"**
3. **Endpoint URL**: `https://sisi-seven.vercel.app/api/webhooks/stripe`
4. **Description**: `Webhook para suscripciones SaaS`
5. **Events to send**: Selecciona:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
6. **Haz clic en "Add endpoint"**
7. **Copia el "Signing secret"** (empieza con `whsec_`)
8. **Agrégalo como** `STRIPE_WEBHOOK_SECRET` en Vercel

### Paso 5: REDESPLEGAR la Aplicación

⚠️ **MUY IMPORTANTE**: Después de agregar o modificar variables, DEBES redesplegar:

#### Opción A: Redesplegar desde Vercel Dashboard
1. **Ve a tu proyecto en Vercel**
2. **Haz clic en "Deployments"**
3. **Haz clic en los 3 puntos** (⋯) del último deployment
4. **Selecciona "Redeploy"**
5. **Espera a que termine** (1-2 minutos)

#### Opción B: Redesplegar desde Terminal
```bash
vercel --prod
```

#### Opción C: Hacer un Push al Repositorio
Si tienes el proyecto conectado a Git:
```bash
git commit --allow-empty -m "Trigger redeploy for Stripe variables"
git push
```

### Paso 6: Verificar que Funciona

Después de redesplegar, espera 1-2 minutos y luego:

1. **Abre**: `https://sisi-seven.vercel.app/api/test-stripe`
2. **Deberías ver**: `"success": true`
3. **Todas las verificaciones deberían estar en verde**

## 🔍 Verificación Detallada

### Verificar en Vercel Dashboard

1. **Ve a Settings > Environment Variables**
2. **Verifica que veas estas 4 variables**:
   ```
   ✅ STRIPE_SECRET_KEY
   ✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   ✅ STRIPE_WEBHOOK_SECRET
   ✅ NEXT_PUBLIC_APP_URL
   ```
3. **Verifica que cada variable tenga**:
   - ✅ Valor configurado (no vacío)
   - ✅ Environments marcados (Production, Preview, Development)

### Verificar Formatos

Las claves deben tener estos formatos:
- `STRIPE_SECRET_KEY`: Debe empezar con `sk_test_` o `sk_live_`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Debe empezar con `pk_test_` o `pk_live_`
- `STRIPE_WEBHOOK_SECRET`: Debe empezar con `whsec_`
- `NEXT_PUBLIC_APP_URL`: Debe ser una URL válida (ej: `https://sisi-seven.vercel.app`)

## ⚠️ Errores Comunes

### Error: "Variable no encontrada después de agregarla"

**Causa**: No redesplegaste después de agregar la variable

**Solución**: 
1. Redesplega la aplicación (Paso 5)
2. Espera 1-2 minutos
3. Verifica nuevamente

### Error: "Formato incorrecto de clave"

**Causa**: La clave tiene espacios o caracteres extra

**Solución**:
1. Copia la clave directamente desde Stripe Dashboard
2. No agregues espacios antes o después
3. Verifica que el formato sea correcto

### Error: "Variable solo disponible en Development"

**Causa**: No marcaste todos los environments

**Solución**:
1. Edita la variable en Vercel
2. Marca ✅ Production, ✅ Preview, ✅ Development
3. Guarda y redesplega

## 📝 Checklist Final

Antes de verificar nuevamente, asegúrate de:

- [ ] Todas las 4 variables están en Vercel
- [ ] Cada variable tiene un valor (no está vacía)
- [ ] Cada variable está marcada para Production, Preview y Development
- [ ] Los formatos de las claves son correctos
- [ ] El webhook está configurado en Stripe
- [ ] Has redesplegado la aplicación después de agregar las variables
- [ ] Has esperado 1-2 minutos después del redeploy

## 🚀 Después de Configurar

Una vez que todo esté configurado:

1. **Verifica**: `https://sisi-seven.vercel.app/api/test-stripe`
2. **Debería mostrar**: `"success": true`
3. **Prueba el checkout**: Ve a `/precios` y haz clic en "Suscribirme"
4. **Verifica el webhook**: Revisa eventos en Stripe Dashboard

¡Si sigues estos pasos, todo debería funcionar correctamente! 🎉

